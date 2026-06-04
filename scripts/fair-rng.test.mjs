import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hmacHex, fairFloat, byteStream, nextFloat, nextInt, shuffle,
  hashServerSeed, generateServerSeed, generateClientSeed, verify,
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
  const a = shuffle(byteStream(SS, CS, 7), 52)
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
