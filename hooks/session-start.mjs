#!/usr/bin/env node
// Emits a SessionStart additionalContext nudging Claude to load using-wagerforge,
// and soft-checks for the superpowers companion. Output JSON on stdout.
const msg = [
  'wagerforge plugin active. For any iGaming / slot / crypto-minigame task, first invoke the `using-wagerforge` skill to route correctly.',
  'wagerforge delegates generic engineering process (brainstorm/plan/TDD/debug/review) to the `superpowers` companion plugin. If superpowers skills do not resolve, tell the user to install it.',
].join(' ')
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg },
}))
