#!/usr/bin/env node
// Reminder on edits to RNG/seed/fairness/settlement OR game-math code.
let input = ''
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  let path = ''
  try { path = (JSON.parse(input).tool_input || {}).file_path || '' } catch {}
  let msg = ''
  if (/(rng|seed|fair|hmac|settle|wallet)/i.test(path)) {
    msg = 'Touched RNG/seed/fairness/settlement code: use a CSPRNG (never Math.random), HMAC-SHA256 for keyed derivation, rejection sampling for integer ranges (no modulo bias), and ensure verification re-derives independently. See wagerforge fair-* skills.'
  } else if (/(rtp|paytable|reel|math|payout)/i.test(path)) {
    msg = 'Touched game-math code: recompute RTP via the full weighted model (a single weight does NOT scale RTP proportionally — C1), and validate the implementation with a convergent Monte-Carlo sim sized to a target CI, not a fixed spin count (C4). See wagerforge math-* skills.'
  } else {
    process.exit(0)
  }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }))
})
