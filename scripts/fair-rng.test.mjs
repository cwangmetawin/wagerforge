import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hmacHex, fairFloat, byteStream, nextFloat, nextInt, shuffle,
  hashServerSeed, generateServerSeed, generateClientSeed, verify, copyOutcome,
} from './fair-rng.mjs'

const SS = 'server-seed-abc'
const CS = 'client-seed-xyz'

test('KAT: canonical fairFloat is frozen and deterministic', () => {
  assert.equal(hmacHex(SS, CS, 0).slice(0, 16), '694e5d8be79c6bbf')
  assert.equal(fairFloat(SS, CS, 0), 0.4113520113529474)
  assert.equal(fairFloat(SS, CS, 0), fairFloat(SS, CS, 0))
})

test('KAT: counter-block byte stream + nextFloat are frozen', () => {
  const s = byteStream(SS, CS, 0)
  assert.equal(nextFloat(s), 0.9176055497343931)
  const s2 = byteStream(SS, CS, 0)
  assert.deepEqual([s2.next().value, s2.next().value, s2.next().value], [234, 232, 50])
})

test('KAT: nextInt outputs and following bytes are frozen through 2 ** 32', () => {
  const stream = byteStream(SS, CS, 0)
  const ranges = [1, 2, 6, 37, 52, 100, 256, 257, 1000, 65536, 65537, 2 ** 24, 2 ** 24 + 1, 2 ** 32 - 1, 2 ** 32]
  assert.deepEqual(ranges.map((range) => nextInt(stream, range)), [
    0, 0, 2, 19, 32, 93, 241, 117, 620, 59980, 65455, 16280567, 3853998, 1477913412, 3729148009,
  ])
  assert.deepEqual([stream.next().value, stream.next().value, stream.next().value], [11, 13, 50])
})

test('fairFloat is in [0,1) and changes with nonce', () => {
  for (const n of [0, 1, 2, 99]) {
    const u = fairFloat(SS, CS, n)
    assert.ok(u >= 0 && u < 1)
  }
  assert.notEqual(fairFloat(SS, CS, 0), fairFloat(SS, CS, 1))
})

test('nextInt stays in range and is deterministic', () => {
  for (const r of [1, 2, 6, 37, 52, 100, 1000]) {
    const a = byteStream(SS, CS, 1)
    const b = byteStream(SS, CS, 1)
    for (let i = 0; i < 50; i++) {
      const x = nextInt(a, r)
      assert.ok(Number.isInteger(x) && x >= 0 && x < r)
      assert.equal(x, nextInt(b, r))
    }
  }
})

test('nextInt is approximately unbiased for a non-power-of-two range (rejection sampling)', () => {
  const range = 6
  const counts = new Array(range).fill(0)
  const N = 60000
  for (let n = 0; n < N; n++) counts[nextInt(byteStream(SS, CS, n), range)]++
  const expected = N / range
  for (const c of counts) {
    assert.ok(Math.abs(c - expected) < expected * 0.06, `bucket ${c} vs ${expected}`)
  }
})

test('shuffle returns a permutation and is deterministic', () => {
  const stream = byteStream(SS, CS, 7)
  const a = shuffle(stream, 52)
  assert.deepEqual(a, [
    20, 39, 44, 15, 16, 49, 1, 0, 23, 8, 7, 51, 12, 17, 4, 28, 41, 5, 21, 34, 33, 40, 38, 43,
    30, 47, 13, 50, 6, 36, 14, 25, 46, 29, 27, 42, 32, 19, 37, 26, 31, 11, 45, 18, 9, 22, 35, 2, 48, 24, 10, 3,
  ])
  assert.deepEqual([stream.next().value, stream.next().value, stream.next().value], [138, 96, 185])
  assert.equal(a.length, 52)
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 52 }, (_, i) => i))
  assert.deepEqual(a, shuffle(byteStream(SS, CS, 7), 52))
})

test('commit hash is frozen; CSPRNG seeds are unique and long', () => {
  assert.equal(hashServerSeed(SS), '256997017cabf253184f1599c0c2dd65e66b6dce3453436b0fa122043a5b0487')
  assert.notEqual(generateServerSeed(), generateServerSeed())
  assert.equal(generateServerSeed().length, 64)
  assert.ok(generateClientSeed().length >= 16)
})

test('verify independently re-derives and detects tampering', () => {
  const derive = (stream) => nextInt(stream, 37)
  const ss = generateServerSeed()
  const hash = hashServerSeed(ss)
  const outcome = derive(byteStream(ss, CS, 3))
  const ok = verify(ss, hash, CS, 3, derive, outcome)
  assert.equal(ok.ok, true)
  assert.equal(ok.commitOk, true)
  assert.equal(ok.match, true)
  assert.equal(verify(ss, 'deadbeef', CS, 3, derive, outcome).commitOk, false)
  assert.equal(verify(ss, hash, CS, 3, derive, (outcome + 1) % 37).match, false)
})

test('rejects a clientSeed containing the ":" delimiter (anti-collision)', () => {
  assert.throws(() => hmacHex(SS, 'a:b', 0), /":"/)
  assert.throws(() => fairFloat(SS, 'a:b', 0), /":"/)
  assert.throws(() => { const s = byteStream(SS, 'a:b', 0); s.next() }, /":"/)
})

test('rejects a non-integer or negative nonce', () => {
  assert.throws(() => hmacHex(SS, CS, 1.5), /nonce/)
  assert.throws(() => hmacHex(SS, CS, -1), /nonce/)
})

for (const [label, outcome, claim] of [['NaN', NaN, null], ['[NaN]', [NaN], [null]]]) {
  test(`F1: invalid derived ${label} cannot verify as null`, () => {
    assert.throws(() => verify(SS, hashServerSeed(SS), 'c', 0, () => outcome, claim), TypeError)
  })
}
test('verify throws for every invalid derived outcome, including cycles and holes', () => {
  const cycle = []
  cycle.push(cycle)
  for (const outcome of [Infinity, -Infinity, null, undefined, true, '1', {}, [1, [NaN]], [null], Array(1), cycle]) {
    assert.throws(() => verify(SS, hashServerSeed(SS), CS, 0, () => outcome, outcome), TypeError)
  }
})
test('verify fails closed for invalid untrusted claims', () => {
  const cycle = []
  cycle.push(cycle)
  for (const claim of [NaN, Infinity, -Infinity, null, undefined, false, '1', {}, [NaN], [null], Array(1), cycle]) {
    assert.deepEqual(verify(SS, hashServerSeed(SS), CS, 0, () => 1, claim), { commitOk: true, recomputed: 1, match: false, ok: false })
  }
})
test('verify compares finite numbers and nested arrays strictly by type, order and length', () => {
  const cases = [
    [0, -0, true], [1.25, 1.25, true], [[], [], true], [[1, [-2.5, []]], [1, [-2.5, []]], true],
    [1, [1], false], [[1], 1, false], [[1], [1, 2], false], [[1, 2], [2, 1], false], [[[]], [], false],
  ]
  for (const [outcome, claim, match] of cases) {
    assert.deepEqual(verify(SS, hashServerSeed(SS), CS, 0, () => outcome, claim), { commitOk: true, recomputed: outcome, match, ok: match })
  }
})
test('verify handles deep arrays and repeated acyclic array references', () => {
  let outcome = [1]
  let claim = [1]
  for (let i = 0; i < 10000; i++) {
    outcome = [outcome]
    claim = [claim]
  }
  assert.equal(verify(SS, hashServerSeed(SS), CS, 0, () => outcome, claim).ok, true)
  const shared = [1]
  assert.equal(verify(SS, hashServerSeed(SS), CS, 0, () => [shared, shared], [[1], [1]]).ok, true)
})

const seedCalls = [hmacHex, fairFloat, byteStream, (ss, cs, n) => verify(ss, hashServerSeed(SS), cs, n, () => 1, 1)]
test('F2: serverSeed must eagerly be a non-empty string', () => {
  for (const ss of ['', undefined, null, 42, {}, Buffer.from(SS)]) {
    for (const call of [...seedCalls, hashServerSeed]) assert.throws(() => call(ss, CS, 0), { name: 'TypeError', message: /serverSeed/ })
  }
})
test('F2: clientSeed must eagerly be non-empty and exclude the delimiter', () => {
  for (const cs of ['', undefined, null, 42, 'a:b']) {
    for (const call of seedCalls) assert.throws(() => call(SS, cs, 0), { name: 'TypeError', message: /clientSeed/ })
  }
  assert.equal(hmacHex('server:seed', CS, 0).length, 64)
})
test('F2: nonce and cursor must be non-negative safe integers', () => {
  for (const n of [-1, 1.5, NaN, Infinity, 2 ** 53, '0', 0n]) {
    for (const call of seedCalls) assert.throws(() => call(SS, CS, n), { name: 'RangeError', message: /nonce/ })
    assert.throws(() => hmacHex(SS, CS, 0, n), { name: 'RangeError', message: /cursor/ })
  }
  assert.equal(hmacHex(SS, CS, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER).length, 64)
})
test('F2: verify rejects illegal seeds before invoking a mapper that ignores the stream', () => {
  let called = false
  const derive = () => {
    called = true
    return 1
  }
  assert.throws(() => verify(SS, hashServerSeed(SS), 'a:b', NaN, derive, 1), TypeError)
  assert.throws(() => verify(SS, hashServerSeed(SS), CS, NaN, derive, 1), RangeError)
  assert.equal(called, false)
})
test('verify accepts only a 64-character lowercase hexadecimal commitment', () => {
  const hash = hashServerSeed(SS)
  for (const commitment of [null, 1, {}, hash.toUpperCase(), hash.slice(1), `${hash}0`, 'g'.repeat(64)]) {
    assert.deepEqual(verify(SS, commitment, CS, 0, () => 1, 1), { commitOk: false, recomputed: 1, match: true, ok: false })
  }
})

test('F3: crafted seven-byte precision-loss range is rejected without consuming bytes', () => {
  const stream = [32, 0, 0, 0, 0, 0, 1].values()
  assert.throws(() => nextInt(stream, 2 ** 52), { name: 'RangeError', message: /range/ })
  assert.equal(stream.next().value, 32)
})
test('F3: 10000 real draws reject the biased 2 ** 52 range', () => {
  const stream = byteStream(SS, CS, 0)
  for (let i = 0; i < 10000; i++) assert.throws(() => nextInt(stream, 2 ** 52), RangeError)
  assert.equal(stream.next().value, 234)
})
test('nextInt rejects every range outside integer [1, 2 ** 32]', () => {
  for (const range of [0, -1, 1.5, NaN, Infinity, 2 ** 32 + 1, '6', 6n]) {
    const stream = [7].values()
    assert.throws(() => nextInt(stream, range), { name: 'RangeError', message: /range/ })
    assert.equal(stream.next().value, 7)
  }
})
test('nextInt retains low-bit balance at the supported 2 ** 32 ceiling', () => {
  const stream = byteStream(SS, CS, 0)
  let odd = 0
  for (let i = 0; i < 10000; i++) odd += nextInt(stream, 2 ** 32) % 2
  assert.ok(odd > 4500 && odd < 5500, `${odd} odd draws out of 10000`)
})
test('nextInt preserves rejection sampling and byte consumption', () => {
  const stream = [255, 254, 5, 99].values()
  assert.equal(nextInt(stream, 6), 5)
  assert.equal(stream.next().value, 99)
  const wide = [255, 255, 0, 1, 99].values()
  assert.equal(nextInt(wide, 257), 1)
  assert.equal(wide.next().value, 99)
})
for (const [label, draw] of [['nextFloat', nextFloat], ['nextInt', (stream) => nextInt(stream, 65536)]]) {
  test(`${label} throws on exhausted streams and non-byte values`, () => {
    assert.throws(() => draw({ next: () => ({ done: true, value: 7 }) }), /exhaust/i)
    assert.throws(() => draw([17].values()), /exhaust/i)
    for (const bad of [-1, 256, 1.5, NaN, Infinity, '1', null, undefined]) {
      assert.throws(() => draw([17, bad].values()), { name: 'TypeError', message: /byte/ })
    }
  })
}

test('shuffle validates safe integer n before allocation or byte consumption', () => {
  for (const n of [-1, 1.5, NaN, Infinity, 2 ** 32, 2 ** 32 + 1, 2 ** 53, '2', 2n, undefined]) {
    const stream = [7].values()
    assert.throws(() => shuffle(stream, n), { name: 'RangeError', message: /n must/ })
    assert.equal(stream.next().value, 7)
  }
  assert.deepEqual(shuffle([].values(), 0), [])
  assert.deepEqual(shuffle([].values(), 1), [0])
})

for (const hexChars of [0, -1, 1.5, 14, NaN, Infinity, '13', null]) {
  test(`F4: fairFloat rejects hexChars ${String(hexChars)}`, () => {
    assert.throws(() => fairFloat(SS, CS, 0, { hexChars }), { name: 'RangeError', message: /hexChars/ })
  })
}
test('fairFloat accepts precisely 1..13 hexadecimal digits and stays below one', () => {
  assert.equal(fairFloat(SS, CS, 0, { hexChars: 1 }), 0.375)
  assert.equal(fairFloat(SS, CS, 0, { hexChars: 13 }), 0.4113520113529474)
  for (let hexChars = 1; hexChars <= 13; hexChars++) {
    for (const nonce of [0, 1, 2, 99]) {
      const u = fairFloat(SS, CS, nonce, { hexChars })
      assert.ok(Number.isFinite(u) && u >= 0 && u < 1)
    }
  }
})

test('F5: fairFloat-derived outcomes verify through frozen seed context', () => {
  const derive = (_stream, ctx) => {
    assert.deepEqual(ctx, { serverSeed: SS, clientSeed: CS, nonce: 0 })
    assert.ok(Object.isFrozen(ctx))
    assert.throws(() => { ctx.nonce = 1 }, TypeError)
    return fairFloat(ctx.serverSeed, ctx.clientSeed, ctx.nonce)
  }
  assert.deepEqual(verify(SS, hashServerSeed(SS), CS, 0, derive, fairFloat(SS, CS, 0)),
    { commitOk: true, recomputed: 0.4113520113529474, match: true, ok: true })
  assert.equal(verify(SS, hashServerSeed(SS), CS, 0, nextFloat, fairFloat(SS, CS, 0)).ok, false)
})
test('F5: fairFloat-derived crash point verifies and detects outcome or seed tampering', () => {
  const crash = (u) => Math.max(1, Math.floor(100 * 0.99 / (1 - u)) / 100)
  const derive = (_stream, ctx) => crash(fairFloat(ctx.serverSeed, ctx.clientSeed, ctx.nonce))
  const point = crash(fairFloat(SS, CS, 0))
  assert.equal(point, 1.68)
  assert.deepEqual(verify(SS, hashServerSeed(SS), CS, 0, derive, point), { commitOk: true, recomputed: point, match: true, ok: true })
  assert.equal(verify(SS, hashServerSeed(SS), CS, 0, derive, point + 0.01).match, false)
  assert.equal(verify(`${SS}-tampered`, hashServerSeed(SS), CS, 0, derive, point).commitOk, false)
})

test('a server seed longer than the 64-byte HMAC block is refused: HMAC would hash it into the public commitment', () => {
  for (const seed of ['a'.repeat(65), 'é'.repeat(33)]) {
    assert.throws(() => hmacHex(seed, CS, 0), RangeError)
    assert.throws(() => byteStream(seed, CS, 0), RangeError)
    assert.throws(() => fairFloat(seed, CS, 0), RangeError)
    assert.throws(() => hashServerSeed(seed), RangeError)
  }
  assert.equal(hmacHex('a'.repeat(64), CS, 0).length, 64)
  for (const bytes of [15, 33, 64, 1.5]) assert.throws(() => generateServerSeed(bytes), RangeError)
  assert.equal(generateServerSeed(16).length, 32)
  assert.equal(generateServerSeed().length, 64)
})

test('generateClientSeed takes 16 to 64 random bytes', () => {
  for (const bytes of [0, 1, 15, 65, 1.5, '16']) assert.throws(() => generateClientSeed(bytes), RangeError)
  assert.equal(generateClientSeed(16).length, 32)
  assert.equal(generateClientSeed(64).length, 128)
})

test('copyOutcome copies plain data and runs no code from the value', () => {
  const shared = [1, 2]
  assert.deepEqual(copyOutcome([shared, shared]), [[1, 2], [1, 2]])
  let reads = 0
  const counted = [1]
  Object.defineProperty(counted, 0, { enumerable: true, get: () => ++reads })
  assert.equal(copyOutcome(counted), undefined)
  assert.equal(copyOutcome([counted, counted]), undefined)
  let traps = 0
  const spy = new Proxy({}, { get: () => { traps++; return undefined } })
  assert.equal(copyOutcome(new Proxy([1], spy)), undefined)
  assert.equal(copyOutcome([new Proxy([1], spy)]), undefined)
  const { proxy, revoke } = Proxy.revocable([1], {})
  revoke()
  assert.equal(copyOutcome(proxy), undefined)
  assert.equal(copyOutcome([proxy]), undefined)
  assert.deepEqual([reads, traps], [0, 0])
})

test('copyOutcome reads each source array once in a shared acyclic graph', () => {
  let value = [1]
  const sources = new Set([value])
  for (let i = 0; i < 12; i++) {
    value = [value, value]
    sources.add(value)
  }
  const descriptor = Object.getOwnPropertyDescriptor
  const reads = new Map()
  let copy
  try {
    Object.getOwnPropertyDescriptor = (source, key) => {
      if (sources.has(source)) reads.set(source, (reads.get(source) ?? 0) + 1)
      return descriptor(source, key)
    }
    copy = copyOutcome(value)
  } finally {
    Object.getOwnPropertyDescriptor = descriptor
  }
  assert.equal([...reads.values()].reduce((sum, count) => sum + count, 0), 25)
  for (const source of sources) assert.equal(reads.get(source), source.length)
  for (let i = 0; i < 12; i++) {
    assert.ok(copy !== value, 'the copy must be detached from its source')
    assert.ok(copy[0] === copy[1], 'shared sources must reuse their completed copy')
    copy = copy[0]
    value = value[0]
  }
  copy[0] = 2
  assert.equal(value[0], 1)
})

test('copyOutcome walks 100000 nesting levels without recursion', () => {
  let value = 1
  for (let i = 0; i < 100000; i++) value = [value]
  let copy = copyOutcome(value)
  for (let i = 0; i < 100000; i++) {
    assert.ok(copy !== value)
    copy = copy[0]
    value = value[0]
  }
  assert.equal(copy, 1)
})

test('completed shared copies never hide cycles or invalid array indices', () => {
  const shared = [1]
  const cycle = []
  const child = [cycle]
  cycle.push(child)
  const accessor = [1]
  let calls = 0
  Object.defineProperty(accessor, 0, { set: () => calls++ })
  for (const invalid of [cycle, new Array(1), accessor, [Infinity], [NaN]]) {
    assert.equal(copyOutcome([shared, shared, invalid]), undefined)
  }
  assert.equal(calls, 0)
})
