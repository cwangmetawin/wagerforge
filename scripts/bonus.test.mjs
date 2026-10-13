import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as bonusMath from './bonus.mjs'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)
const seeded = (seed) => () => {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return (seed >>> 0) / 2 ** 32
}
// Money in the simulator is exact integer atoms; playRound returns the round's gross payout in
// atoms, already rounded by the game's own rule.
const trial = (overrides = {}) => ({
  bonus: 100n, wageringRequirement: 200n, stake: 100n,
  playRound: (rng, stake) => (rng() < 0.48 ? 2n * stake : 0n),
  rng: seeded(12345), n: 200000, ...overrides,
})

test('bonusBreakEvenWR applies only to guaranteed turnover', () => {
  assert.equal(bonusMath.bonusBreakEvenWR(0.04), 25)
  assert.equal(bonusMath.bonusBreakEvenWR(2), 0.5)
  for (const value of [0, -1, NaN, Infinity, -Infinity, '0.04', null, undefined]) {
    assert.throws(() => bonusMath.bonusBreakEvenWR(value), {
      name: typeof value === 'number' ? 'RangeError' : 'TypeError', message: /houseEdge/,
    })
  }
})

test('M6: expected ACTUAL turnover 148 gives exact expected cost 94.08', () => {
  assert.equal(bonusMath.bonusExpectedCost({ bonus: 100, expectedTurnover: 148, houseEdge: 0.04 }), 94.08)
  assert.equal(bonusMath.bonusExpectedCost({ bonus: 100, expectedTurnover: 0, houseEdge: 0.04 }), 100)
  assert.equal(bonusMath.bonusExpectedCost({ bonus: 100, expectedTurnover: 3000, houseEdge: 0 }), 100)
})

test('M6: the nominal wageringMultiple API fails closed with a migration error', () => {
  for (const call of [bonusMath.bonusExpectedCost, bonusMath.isEvPositiveForOperator]) {
    for (const expectedTurnover of [undefined, 148]) {
      assert.throws(() => call({ bonus: 100, wageringMultiple: 30, expectedTurnover, houseEdge: 0.04 }), {
        name: 'TypeError', message: /wageringMultiple.*nominal.*bust/i,
      })
    }
  }
  assert.equal(Object.hasOwn(bonusMath, 'isEvPositive'), false)
})

test('operator EV is positive strictly when actual-turnover cost is negative', () => {
  const args = { bonus: 100, houseEdge: 0.04 }
  assert.equal(bonusMath.isEvPositiveForOperator({ ...args, expectedTurnover: 3000 }), true)
  assert.equal(bonusMath.isEvPositiveForOperator({ ...args, expectedTurnover: 2500 }), false)
  assert.equal(bonusMath.isEvPositiveForOperator({ ...args, expectedTurnover: 148 }), false)
})

test('bonus cost functions validate finite nonnegative amounts and edge', () => {
  for (const call of [bonusMath.bonusExpectedCost, bonusMath.isEvPositiveForOperator]) {
    for (const args of [undefined, null, [], 1]) assert.throws(() => call(args), TypeError)
    for (const field of ['bonus', 'expectedTurnover', 'houseEdge']) {
      for (const value of [-1, NaN, Infinity, -Infinity, '1', null, undefined, 1n]) {
        assert.throws(() => call({ bonus: 100, expectedTurnover: 148, houseEdge: 0.04, [field]: value }), {
          name: typeof value === 'number' ? 'RangeError' : 'TypeError', message: new RegExp(field),
        })
      }
    }
  }
})

test('M6: seeded bust/completion simulation contains 94.08 in its CI, excludes 92', () => {
  const result = bonusMath.simulateBonusCost(trial())
  assert.equal(result.n, 200000)
  assert.ok(result.ci[0] <= 94.08 && 94.08 <= result.ci[1], JSON.stringify(result))
  assert.ok(result.ci[0] > 92, JSON.stringify(result))
  near(result.meanTurnover, 148, 0.5)
  near(result.completionRate, 0.48, 0.005)
  near(result.ciHalfWidth, (result.ci[1] - result.ci[0]) / 2)
  assert.deepEqual(bonusMath.simulateBonusCost(trial()), result)
})

test('M6: a no-deposit bonus never has negative simulated cost', () => {
  for (const sticky of [false, true]) {
    const result = bonusMath.simulateBonusCost(trial({ wageringRequirement: 3000n, n: 10000, sticky }))
    assert.ok(result.meanCost >= 0)
    assert.ok(result.completionRate >= 0 && result.completionRate <= 1)
    assert.ok(result.meanTurnover <= 3000)
  }
})

test('exact atoms: wagering completes on the exact round, never one early or one late', () => {
  const run = (opts) => bonusMath.simulateBonusCost(trial({ n: 2, ...opts }))
  // 9 rounds of 10 atoms complete 90 exactly; each round pays 1 atom back, so 9 atoms remain to withdraw.
  assert.deepEqual(run({ bonus: 90n, wageringRequirement: 90n, stake: 10n, playRound: () => 1n }), {
    meanCost: 9, ciHalfWidth: 0, ci: [9, 9], completionRate: 1, meanTurnover: 90, n: 2,
  })
  // A requirement of 100 at stake 10 is exactly 10 rounds, not 11.
  assert.equal(run({ bonus: 100n, wageringRequirement: 100n, stake: 10n, playRound: () => 1n }).meanTurnover, 100)
  assert.equal(run({ bonus: 100n, wageringRequirement: 100n, stake: 10n, playRound: () => 9n }).meanCost, 90)
})

test('simulation deducts deposit, forfeits unfinished balances and handles sticky bonuses', () => {
  const run = (opts) => bonusMath.simulateBonusCost(trial({ n: 2, ...opts }))
  const even = (rng, stake) => stake
  assert.deepEqual(run({ deposit: 50n, playRound: even }), {
    meanCost: 100, ciHalfWidth: 0, ci: [100, 100], completionRate: 1, meanTurnover: 200, n: 2,
  })
  assert.equal(run({ deposit: 50n, playRound: even, sticky: true }).meanCost, 0)
  assert.equal(run({ deposit: 50n, playRound: () => 0n }).meanCost, -50)
  assert.equal(run({ bonus: 100n, playRound: (rng, stake) => stake / 2n, sticky: true, wageringRequirement: 100n }).meanCost, 0)
  const unfinished = run({ bonus: 50n, deposit: 25n, playRound: even })
  assert.equal(unfinished.meanCost, -25)
  assert.equal(unfinished.completionRate, 0)
  assert.equal(unfinished.meanTurnover, 0)
})

test('simulation uses whole stakes, permits zero requirement and forwards the checked rng and stake', () => {
  const seen = []
  const opts = trial({ n: 2, wageringRequirement: 150n, rng: () => 0.25,
    playRound: (rng, stake) => {
      seen.push([rng(), stake])
      return stake
    },
  })
  const result = bonusMath.simulateBonusCost(opts)
  assert.equal(result.meanTurnover, 200)
  assert.equal(result.completionRate, 1)
  assert.deepEqual(seen, [[0.25, 100n], [0.25, 100n], [0.25, 100n], [0.25, 100n]])
  assert.equal(bonusMath.simulateBonusCost(trial({ n: 2, wageringRequirement: 0n, playRound: () => { throw new Error('unused') } })).meanCost, 100)
  assert.equal(bonusMath.simulateBonusCost(trial({ n: 2, bonus: 0n })).meanCost, 0)
})

test('simulation uses sample variance for its cost CI and honors z', () => {
  const run = (z) => {
    const draws = [0.1, 0.9, 0.9]
    return bonusMath.simulateBonusCost(trial({ n: 2, z, rng: () => draws.shift() }))
  }
  const result = run(1)
  assert.equal(result.meanCost, 50)
  near(result.ciHalfWidth, 50)
  near(run(2).ciHalfWidth, 100)
})

test('simulateBonusCost validates all configuration before playing', () => {
  let calls = 0
  const playRound = () => {
    calls++
    return 1n
  }
  for (const args of [undefined, null, [], 1]) assert.throws(() => bonusMath.simulateBonusCost(args), TypeError)
  for (const field of ['bonus', 'deposit', 'wageringRequirement', 'stake']) {
    const optional = field === 'deposit'
    for (const value of [-1n, 1, 1.5, NaN, '1', null, ...(optional ? [] : [undefined])]) {
      assert.throws(() => bonusMath.simulateBonusCost(trial({ playRound, [field]: value })), {
        name: typeof value === 'bigint' ? 'RangeError' : 'TypeError', message: new RegExp(field),
      })
    }
  }
  assert.throws(() => bonusMath.simulateBonusCost(trial({ playRound, stake: 0n })), /stake/)
  for (const n of [0, 1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, '2', 2n]) assert.throws(() => bonusMath.simulateBonusCost(trial({ playRound, n })), /n/)
  for (const z of [0, -1, NaN, Infinity, '1']) assert.throws(() => bonusMath.simulateBonusCost(trial({ playRound, z })), /z/)
  for (const field of ['playRound', 'rng']) {
    for (const value of [null, 1, undefined]) assert.throws(() => bonusMath.simulateBonusCost(trial({ [field]: value })), TypeError)
  }
  for (const sticky of [null, 0, 'false']) assert.throws(() => bonusMath.simulateBonusCost(trial({ sticky })), /sticky/)
  assert.equal(calls, 0)
})

test('simulateBonusCost rejects invalid round payouts and rng draws', () => {
  for (const value of [-1n, 1, NaN, Infinity, '1', null, undefined]) {
    assert.throws(() => bonusMath.simulateBonusCost(trial({ n: 2, playRound: () => value })), {
      name: typeof value === 'bigint' ? 'RangeError' : 'TypeError', message: /playRound/,
    })
  }
  for (const value of [-1, 1, NaN, Infinity, '0.5', null, undefined]) {
    assert.throws(() => bonusMath.simulateBonusCost(trial({ n: 2, rng: () => value })), {
      name: typeof value === 'number' ? 'RangeError' : 'TypeError', message: /rng/,
    })
  }
})

test('bonus arithmetic overflow and unbounded turnover fail closed', () => {
  assert.throws(() => bonusMath.bonusBreakEvenWR(Number.MIN_VALUE), RangeError)
  assert.throws(() => bonusMath.bonusExpectedCost({ bonus: 100, expectedTurnover: Number.MAX_VALUE, houseEdge: 2 }), RangeError)
  // A cost too large to report as an exact Number is refused rather than rounded.
  assert.throws(() => bonusMath.simulateBonusCost(trial({ bonus: 2n ** 60n, wageringRequirement: 0n, n: 2 })), RangeError)
  assert.throws(() => bonusMath.simulateBonusCost(trial({ n: 2, bonus: 1n, stake: 1n, wageringRequirement: 2n ** 60n })), /rounds/)
})

test('mean cost and mean turnover are exact in atoms, not a rounded running average', () => {
  const d = 9007199254740990n
  const payouts = [2n * d, d, 0n]
  let i = 0
  const cost = bonusMath.simulateBonusCost({ bonus: 0n, deposit: d, wageringRequirement: d, stake: d, n: 3, rng: () => 0.5, playRound: () => payouts[i++] })
  assert.equal(cost.meanCost, 0)
  // Players lose after 8, 3, 2, 3 and 9 rounds: mean turnover is 5 stakes exactly.
  const stake = 900719925474099n
  const rounds = [8, 3, 2, 3, 9]
  let player = 0
  let played = 0
  const turnover = bonusMath.simulateBonusCost({
    bonus: stake, wageringRequirement: 10n * stake, stake, n: rounds.length, rng: () => 0.5,
    playRound: () => {
      if (++played < rounds[player]) return stake
      played = 0
      player++
      return 0n
    },
  })
  assert.equal(turnover.meanTurnover, 4503599627370495)
})
