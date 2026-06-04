import { createHmac, createHash, randomBytes } from 'node:crypto'

// Reject inputs that would make the `clientSeed:nonce[:cursor]` message ambiguous.
// Without this, HMAC(key,"a:1:2") is identical whether read as (clientSeed "a:1", nonce 2)
// or (clientSeed "a", nonce "1:2") — a real outcome-collision/grinding vector when the
// player controls clientSeed. serverSeed is the HMAC key (not in the message), so it is exempt.
function assertSafe(clientSeed, nonce, cursor) {
  if (typeof clientSeed !== 'string' || clientSeed.includes(':')) {
    throw new Error('clientSeed must be a string with no ":" — it is the field delimiter')
  }
  if (!Number.isInteger(nonce) || nonce < 0) throw new Error('nonce must be a non-negative integer')
  if (cursor !== undefined && (!Number.isInteger(cursor) || cursor < 0)) {
    throw new Error('cursor must be a non-negative integer')
  }
}

// --- Keyed derivation (use HMAC-SHA256, never SHA256(seed‖msg) as a MAC — see C7) ---

export function hmacHex(serverSeed, clientSeed, nonce, cursor) {
  assertSafe(clientSeed, nonce, cursor)
  const msg = cursor === undefined ? `${clientSeed}:${nonce}` : `${clientSeed}:${nonce}:${cursor}`
  return createHmac('sha256', serverSeed).update(msg).digest('hex')
}

export function fairFloat(serverSeed, clientSeed, nonce, { hexChars = 13 } = {}) {
  return parseInt(hmacHex(serverSeed, clientSeed, nonce).slice(0, hexChars), 16) / 2 ** (4 * hexChars)
}

export function* byteStream(serverSeed, clientSeed, nonce) {
  assertSafe(clientSeed, nonce)
  let counter = 0
  while (true) {
    const block = createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:${counter}`).digest()
    for (const b of block) yield b
    counter++
  }
}

export function nextFloat(stream) {
  let x = 0
  for (let i = 0; i < 6; i++) x = x * 256 + stream.next().value
  return x / 2 ** 48
}

export function nextInt(stream, range) {
  if (!Number.isInteger(range) || range <= 0) throw new Error('range must be a positive integer')
  let bytes = 1
  let space = 256
  while (space < range) { bytes++; space *= 256 }
  const limit = space - (space % range)
  for (;;) {
    let x = 0
    for (let i = 0; i < bytes; i++) x = x * 256 + stream.next().value
    if (x < limit) return x % range
  }
}

export function shuffle(stream, n) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = nextInt(stream, i + 1)
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

// --- Commit / reveal + CSPRNG seeds (see C12) ---

export function hashServerSeed(serverSeed) {
  return createHash('sha256').update(serverSeed).digest('hex')
}
export function generateServerSeed(bytes = 32) {
  return randomBytes(bytes).toString('hex')
}
export function generateClientSeed(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}

// --- Independent verification ---
// deriveFn(stream) MUST return a number or an array of numbers in canonical order;
// equality below is JSON.stringify-based (key-order / NaN sensitive) and fails CLOSED.
export function verify(serverSeed, serverSeedHash, clientSeed, nonce, deriveFn, claimedOutcome) {
  const commitOk = hashServerSeed(serverSeed) === serverSeedHash
  const recomputed = deriveFn(byteStream(serverSeed, clientSeed, nonce))
  const match = JSON.stringify(recomputed) === JSON.stringify(claimedOutcome)
  return { commitOk, recomputed, match, ok: commitOk && match }
}
