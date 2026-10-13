import { monteCarlo } from './rtp.mjs'

function finite(value, name) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number`)
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
  return value
}

function nonnegative(value, name) {
  finite(value, name)
  if (value < 0) throw new RangeError(`${name} must be >= 0`)
}

function object(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('bonus options must be an object')
  return value
}

// This break-even multiple assumes GUARANTEED turnover, not a bust-or-complete offer.
export function bonusBreakEvenWR(houseEdge) {
  finite(houseEdge, 'houseEdge')
  if (houseEdge <= 0) throw new RangeError('houseEdge must be > 0')
  return finite(1 / houseEdge, 'bonusBreakEvenWR result')
}

export function bonusExpectedCost(options) {
  const { bonus, expectedTurnover, houseEdge } = object(options)
  if ('wageringMultiple' in options) {
    throw new TypeError('wageringMultiple is obsolete: nominal wagering overstates revenue when players can bust; supply expectedTurnover')
  }
  nonnegative(bonus, 'bonus')
  nonnegative(expectedTurnover, 'expectedTurnover')
  nonnegative(houseEdge, 'houseEdge')
  // Wald's identity assumes a constant conditional edge and expected ACTUAL turnover.
  // This values terminal balance; forfeiture and sticky withdrawals require the simulator.
  return finite(bonus - houseEdge * expectedTurnover, 'bonusExpectedCost result')
}

export function isEvPositiveForOperator(options) {
  return bonusExpectedCost(options) < 0
}

function atoms(value, name, { positive = false } = {}) {
  if (typeof value !== 'bigint') throw new TypeError(`${name} must be a BigInt amount in atoms`)
  if (value < 0n || (positive && value === 0n)) throw new RangeError(`${name} must be ${positive ? '> 0' : '>= 0'} atoms`)
  return value
}

function exactNumber(value, name) {
  const number = Number(value)
  if (!Number.isSafeInteger(number)) throw new RangeError(`${name} is too large to report exactly`)
  return number
}

// The mean of an exact BigInt sum: an integer mean is exact, any other is within one unit in the
// last place. A running float average of large atom counts can drift by half an atom.
function meanOf(sum, n, name) {
  const count = BigInt(n)
  return exactNumber(sum / count, name) + Number(sum % count) / n
}

// One player per trial, in exact integer atoms: a float running total can decide that nine 0.1
// stakes did not reach 0.9 and forfeit a finished bonus, or play an extra round. playRound(rng,
// stake) returns that round's GROSS payout in atoms, already rounded by the game's own rule.
export function simulateBonusCost(options) {
  const { bonus, deposit = 0n, wageringRequirement, stake, playRound, rng, n, sticky = false, z = 1.96 } = object(options)
  atoms(bonus, 'bonus')
  atoms(deposit, 'deposit')
  atoms(wageringRequirement, 'wageringRequirement')
  atoms(stake, 'stake', { positive: true })
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 2) throw new RangeError('n must be a safe integer >= 2')
  finite(z, 'z')
  if (z <= 0) throw new RangeError('z must be > 0')
  if (typeof sticky !== 'boolean') throw new TypeError('sticky must be a boolean')
  if (typeof playRound !== 'function') throw new TypeError('playRound must be a function')
  if (typeof rng !== 'function') throw new TypeError('rng must be a function')
  const roundsToComplete = (wageringRequirement + stake - 1n) / stake
  if (roundsToComplete > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('wagering needs too many rounds per player')
  const checkedRng = () => {
    const draw = finite(rng(), 'rng draw')
    if (draw < 0 || draw >= 1) throw new RangeError('rng draw must be in [0,1)')
    return draw
  }
  let completions = 0
  let costSum = 0n
  let turnoverSum = 0n
  const mc = monteCarlo(() => {
    let balance = deposit + bonus
    let turnover = 0n
    while (turnover < wageringRequirement && balance >= stake) {
      const payout = playRound(checkedRng, stake)
      if (typeof payout !== 'bigint') throw new TypeError('playRound must return the gross payout as BigInt atoms')
      if (payout < 0n) throw new RangeError('playRound payout must be >= 0 atoms')
      balance = balance - stake + payout
      turnover += stake
    }
    const completed = turnover >= wageringRequirement
    if (completed) completions++
    exactNumber(turnover, 'turnover')
    turnoverSum += turnover
    const withdrawal = completed ? (sticky ? (balance > bonus ? balance - bonus : 0n) : balance) : 0n
    const cost = withdrawal - deposit
    costSum += cost
    return exactNumber(cost, 'cost')
  }, n, { z })
  const meanCost = meanOf(costSum, n, 'mean cost')
  const ci = [meanCost - mc.ciHalfWidth, meanCost + mc.ciHalfWidth]
  return { meanCost, ciHalfWidth: mc.ciHalfWidth, ci, completionRate: completions / n, meanTurnover: meanOf(turnoverSum, n, 'mean turnover'), n }
}
