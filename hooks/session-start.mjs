#!/usr/bin/env node
// SessionStart: one routing sentence so iGaming work goes through the domain router skill first.
// Thin by design (Plugin Law #1): the knowledge lives in skills/using-wagerforge, never here.
// Claude Code only: Codex runs no plugin hooks and finds the router by its skill description.
const ROUTER_NUDGE =
  'wagerforge is active. For any iGaming / slot / crypto-minigame task (RTP or house-edge math, ' +
  'provable fairness and RNG, RGS / wallet / settlement, game economy, math or RNG QA, gambling ' +
  'compliance), invoke the `wagerforge:using-wagerforge` skill first; it routes to the right domain skill.'

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ROUTER_NUDGE },
}))
