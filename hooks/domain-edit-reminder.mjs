#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): when a CODE file in a money, fairness or game-math area changes,
// point at the skills that hold the corrected rules. Thin (Plugin Law #1): the rules live in skills.
// Classification uses whole tokens of the file's PROJECT-RELATIVE path, never substrings of the
// absolute path, so an ancestor folder ("fair-games/") or a word like "affairs" cannot misfire.
import { relative, isAbsolute, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const CODE_FILE = /\.(?:[cm]?[jt]sx?|json|ya?ml|toml|py|go|rs|java|kt|cs|sol|rb|php|swift)$/i

const AREAS = [
  {
    tokens: ['wallet', 'wallets', 'ledger', 'ledgers', 'settle', 'settlement', 'settlements', 'money', 'refund', 'refunds', 'payout', 'payouts'],
    message: 'Touched wallet/settlement code: money is integer atoms (BigInt or exact decimal, never float); every ' +
      'money leg is idempotent with its key bound to its content (same key + different payload = conflict); the ' +
      'stake is taken before the outcome, the payout exactly once, refund on error; never authorize spend from a ' +
      'cache or replica (C2). Skills: `wagerforge:build-wallet-and-money`, `wagerforge:build-durable-settlement`, ' +
      '`wagerforge:qa-settlement-integrity`.',
  },
  {
    tokens: ['rng', 'random', 'seed', 'seeds', 'fair', 'fairness', 'hmac', 'nonce', 'shuffle', 'game-logic'],
    message: 'Touched RNG/seed/fairness code: CSPRNG only (never Math.random); HMAC-SHA256 for keyed derivation (C7); ' +
      'rejection sampling for integer ranges (C8); the player-facing verifier must re-derive the outcome itself. ' +
      'Skills: `wagerforge:fair-rng-core`, `wagerforge:fair-outcome-mappers`, `wagerforge:fair-verify`.',
  },
  {
    tokens: ['rtp', 'paytable', 'paytables', 'reel', 'reels', 'math', 'odds', 'volatility', 'jackpot', 'jackpots', 'payout', 'payouts', 'game-logic'],
    message: 'Touched game-math code: recompute RTP from the full weighted model, since a weight change does not scale ' +
      'RTP proportionally (C1), and validate with a Monte-Carlo run sized to a target CI, not a fixed spin count (C4). ' +
      'Skills: `wagerforge:math-rtp-modeling`, `wagerforge:qa-math-validation`.',
  },
]

// "games/zeus/myRtp96MathConfig.ts" -> my-rtp-96-math-config ... (camelCase, digits and separators split).
export function pathTokens(filePath, projectDir) {
  let rel = filePath
  if (projectDir && isAbsolute(filePath)) {
    const r = relative(projectDir, filePath)
    rel = r && !r.startsWith('..') && !isAbsolute(r) ? r : filePath.split(sep).slice(-3).join('/')
  }
  const words = rel
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)|(\d)([A-Za-z])/g, '$1$3 $2$4')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  const bigrams = words.slice(1).map((w, i) => `${words[i]}-${w}`)
  return new Set([...words, ...bigrams])
}

export function reminderFor(filePath, projectDir) {
  if (!filePath || !CODE_FILE.test(filePath)) return ''
  const tokens = pathTokens(filePath, projectDir)
  return AREAS.filter((a) => a.tokens.some((t) => tokens.has(t))).map((a) => a.message).join('\n\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = ''
  process.stdin.on('data', (d) => (input += d)).on('end', () => {
    let msg = ''
    try {
      const j = JSON.parse(input)
      msg = reminderFor(j?.tool_input?.file_path, process.env.CLAUDE_PROJECT_DIR || j?.cwd)
    } catch { /* malformed hook input: stay silent rather than break the edit */ }
    if (msg) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }))
  })
}
