import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextInt } from './fair-rng.mjs'

// Statistics cannot prove the absence of modulo bias: a naive `byte % 6` passes a 60,000-draw
// bucket test. These tests feed the reduction EVERY source value and count exactly (C6).

function* scripted(bytes) {
  yield* bytes
}

const bytesOf = (x, width) => Array.from({ length: width }, (_, i) => Math.floor(x / 256 ** (width - 1 - i)) % 256)

// Feeds every width-byte candidate once, then a zero candidate in case the first is rejected.
// Returns how often each value came from an ACCEPTED first candidate, and how many were accepted.
function enumerate(reduce, range, width) {
  const counts = new Array(range).fill(0)
  let accepted = 0
  for (let x = 0; x < 256 ** width; x++) {
    let used = 0
    const stream = scripted([...bytesOf(x, width), ...bytesOf(0, width)])
    const counted = { next: () => { used++; return stream.next() } }
    const value = reduce(counted, range)
    if (used === width) {
      counts[value]++
      accepted++
    }
  }
  return { counts, accepted }
}

const naive = (stream, range) => stream.next().value % range

test('control: the exhaustive count catches the modulo bias a statistical test misses', () => {
  const { counts } = enumerate(naive, 6, 1)
  assert.deepEqual(counts, [43, 43, 43, 43, 42, 42])
})

test('nextInt accepts each value equally often for every one-byte range', () => {
  for (let range = 1; range <= 256; range++) {
    const { counts, accepted } = enumerate(nextInt, range, 1)
    assert.equal(accepted, 256 - (256 % range), `range ${range}`)
    assert.ok(counts.every((c) => c === accepted / range), `range ${range}: ${counts}`)
  }
})

test('nextInt accepts each value equally often for two-byte ranges', () => {
  for (const range of [257, 1000, 6000, 52 * 51, 65535, 65536]) {
    const { counts, accepted } = enumerate(nextInt, range, 2)
    assert.equal(accepted, 65536 - (65536 % range), `range ${range}`)
    assert.ok(counts.every((c) => c === accepted / range), `range ${range}`)
  }
})

test('nextInt rejects exactly the top partial block for three- and four-byte ranges', () => {
  for (const [range, width] of [[2 ** 16 + 1, 3], [10 ** 7, 3], [2 ** 24 + 1, 4], [2 ** 32 - 1, 4], [2 ** 32, 4]]) {
    const space = 256 ** width
    const limit = space - (space % range)
    assert.equal(limit % range, 0)
    const last = scripted([...bytesOf(limit - 1, width)])
    assert.equal(nextInt(last, range), (limit - 1) % range, `range ${range}: last accepted value`)
    if (limit < space) {
      const rejected = scripted([...bytesOf(limit, width), ...bytesOf(7, width)])
      assert.equal(nextInt(rejected, range), 7 % range, `range ${range}: first rejected value redraws`)
    }
  }
})
