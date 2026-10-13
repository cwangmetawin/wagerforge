import { createHmac, createHash, randomBytes } from 'node:crypto'
import { types } from 'node:util'

// Reject inputs that would make the `clientSeed:nonce[:cursor]` message ambiguous.
// Without this, HMAC(key,"a:1:2") is identical whether read as (clientSeed "a:1", nonce 2)
// or (clientSeed "a", nonce "1:2") — a real outcome-collision/grinding vector when the
// player controls clientSeed. serverSeed is the HMAC key (not in the message), so ':' is allowed.
// HMAC-SHA256 hashes any key longer than its 64-byte block, and SHA-256 of the seed IS the public
// commitment: a longer seed lets anyone compute every outcome from the commitment before betting.
const HMAC_BLOCK_BYTES = 64

function assertServerSeed(serverSeed) {
  if (typeof serverSeed !== 'string' || serverSeed.length === 0) {
    throw new TypeError('serverSeed must be a non-empty string')
  }
  if (new TextEncoder().encode(serverSeed).length > HMAC_BLOCK_BYTES) {
    throw new RangeError('serverSeed must be at most 64 UTF-8 bytes: a longer HMAC key is hashed into the public commitment')
  }
}

function assertSafe(serverSeed, clientSeed, nonce, cursor) {
  assertServerSeed(serverSeed)
  if (typeof clientSeed !== 'string' || clientSeed.length === 0 || clientSeed.includes(':')) {
    throw new TypeError('clientSeed must be a non-empty string with no ":" — it is the field delimiter')
  }
  if (!Number.isSafeInteger(nonce) || nonce < 0) throw new RangeError('nonce must be a non-negative safe integer')
  if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 0)) {
    throw new RangeError('cursor must be a non-negative safe integer')
  }
}

// --- Keyed derivation (use HMAC-SHA256, never SHA256(seed‖msg) as a MAC — see C7) ---

export function hmacHex(serverSeed, clientSeed, nonce, cursor) {
  assertSafe(serverSeed, clientSeed, nonce, cursor)
  const msg = cursor === undefined ? `${clientSeed}:${nonce}` : `${clientSeed}:${nonce}:${cursor}`
  return createHmac('sha256', serverSeed).update(msg).digest('hex')
}

export function fairFloat(serverSeed, clientSeed, nonce, { hexChars = 13 } = {}) {
  // 13 hex digits are 52 bits: parsing stays exact and the quotient stays below 1.
  if (!Number.isInteger(hexChars) || hexChars < 1 || hexChars > 13) {
    throw new RangeError('hexChars must be an integer in [1, 13]')
  }
  return parseInt(hmacHex(serverSeed, clientSeed, nonce).slice(0, hexChars), 16) / 2 ** (4 * hexChars)
}

export function byteStream(serverSeed, clientSeed, nonce) {
  // Validate before returning: a mapper may never pull its first byte.
  assertSafe(serverSeed, clientSeed, nonce)
  return (function* () {
    let counter = 0
    while (true) {
      const block = createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:${counter}`).digest()
      for (const b of block) yield b
      counter++
    }
  })()
}

function readByte(stream) {
  const { value, done } = stream.next()
  if (done) throw new RangeError('byte stream is exhausted')
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new TypeError('byte stream must yield an integer in [0, 255]')
  }
  return value
}

export function nextFloat(stream) {
  let x = 0
  for (let i = 0; i < 6; i++) x = x * 256 + readByte(stream)
  return x / 2 ** 48
}

export function nextInt(stream, range) {
  // At most four bytes keeps every intermediate Number exact.
  if (!Number.isInteger(range) || range < 1 || range > 2 ** 32) {
    throw new RangeError('range must be an integer in [1, 2 ** 32]')
  }
  let bytes = 1
  let space = 256
  while (space < range) {
    bytes++
    space *= 256
  }
  const limit = space - (space % range)
  for (;;) {
    let x = 0
    for (let i = 0; i < bytes; i++) x = x * 256 + readByte(stream)
    if (x < limit) return x % range
  }
}

export function shuffle(stream, n) {
  // 2 ** 32 - 1 is the largest JavaScript Array length; reject before allocating or reading bytes.
  if (!Number.isSafeInteger(n) || n < 0 || n > 2 ** 32 - 1) {
    throw new RangeError('n must be a safe integer in [0, 2 ** 32 - 1]')
  }
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = nextInt(stream, i + 1)
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

// --- Commit / reveal + CSPRNG seeds (see C12) ---

export function hashServerSeed(serverSeed) {
  assertServerSeed(serverSeed)
  return createHash('sha256').update(serverSeed).digest('hex')
}
// 16..32 random bytes as hex: at least 128 bits of entropy, at most the 64-byte HMAC block.
export function generateServerSeed(bytes = 32) {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 32) throw new RangeError('bytes must be an integer from 16 to 32')
  return randomBytes(bytes).toString('hex')
}
// Run this on the PLAYER's device (in a browser, crypto.getRandomValues), after the player has
// saved the new commitment. A server that generates or learns the client seed before committing
// can choose its own seed to suit it.
export function generateClientSeed(bytes = 16) {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 64) throw new RangeError('bytes must be an integer from 16 to 64')
  return randomBytes(bytes).toString('hex')
}

// --- Independent verification ---
// An outcome is a finite number or a dense nested array of them, as plain data. copyOutcome returns
// a plain copy, or undefined when the value is not an outcome. A Proxy, a hole, an accessor (getter
// or setter) index and a cycle are refused, so no code from the value runs and an inherited index
// never fills a hole (see plain-data.mjs). Finished copies are reused for shared sources; each source
// array is read once. It walks iteratively: deep nesting cannot overflow the stack.
export function copyOutcome(value) {
  const isArray = (item) => !types.isProxy(item) && Array.isArray(item)
  if (!isArray(value)) return Number.isFinite(value) ? value : undefined
  const ancestors = new Set([value])
  const finished = new Map()
  const stack = [{ source: value, index: 0, copy: [] }]
  for (;;) {
    const frame = stack.at(-1)
    if (frame.index === frame.source.length) {
      stack.pop()
      ancestors.delete(frame.source)
      finished.set(frame.source, frame.copy)
      if (!stack.length) return frame.copy
      stack.at(-1).copy.push(frame.copy)
      continue
    }
    const slot = Object.getOwnPropertyDescriptor(frame.source, frame.index++)
    if (slot === undefined || !Object.hasOwn(slot, 'value')) return undefined
    const item = slot.value
    if (isArray(item)) {
      if (ancestors.has(item)) return undefined
      if (finished.has(item)) {
        frame.copy.push(finished.get(item))
        continue
      }
      ancestors.add(item)
      stack.push({ source: item, index: 0, copy: [] })
    } else if (Number.isFinite(item)) frame.copy.push(item)
    else return undefined
  }
}

export function isOutcome(value) {
  return copyOutcome(value) !== undefined
}

// Strict structural equality of two plain outcome copies (copyOutcome).
export function sameOutcome(left, right) {
  // Array pairs already found equal: a shared sub-array is compared once per partner, not once
  // per path to it, so shared structure cannot make the walk exponential.
  const equal = new Map()
  const stack = [{ left, right, index: 0 }]
  while (stack.length) {
    const frame = stack.at(-1)
    const { left: a, right: b } = frame
    if (typeof a === 'number') {
      if (a !== b) return false
      stack.pop()
    } else {
      if (!Array.isArray(b) || a.length !== b.length) return false
      if (frame.index === a.length) {
        stack.pop()
        if (!equal.has(a)) equal.set(a, new Set())
        equal.get(a).add(b)
      } else {
        const i = frame.index++
        if (!equal.get(a[i])?.has(b[i])) stack.push({ left: a[i], right: b[i], index: 0 })
      }
    }
  }
  return true
}

// ctx supports the single-float derivation without changing stream-only mappers.
export function verify(serverSeed, serverSeedHash, clientSeed, nonce, deriveFn, claimedOutcome) {
  assertSafe(serverSeed, clientSeed, nonce)
  const commitOk = typeof serverSeedHash === 'string' && serverSeedHash.length === 64 &&
    /^[0-9a-f]+$/.test(serverSeedHash) && hashServerSeed(serverSeed) === serverSeedHash
  const ctx = Object.freeze({ serverSeed, clientSeed, nonce })
  // Compare plain copies of the derived value and the claim.
  const recomputed = copyOutcome(deriveFn(byteStream(serverSeed, clientSeed, nonce), ctx))
  if (recomputed === undefined) throw new TypeError('deriveFn must return a finite number or nested array of outcomes')
  const claim = copyOutcome(claimedOutcome)
  const match = claim !== undefined && sameOutcome(recomputed, claim)
  return { commitOk, recomputed, match, ok: commitOk && match }
}
