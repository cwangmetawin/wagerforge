import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HOOK = fileURLToPath(new URL('./session-start.mjs', import.meta.url))
const run = () => JSON.parse(execFileSync('node', [HOOK], { encoding: 'utf8' }))

test('emits valid SessionStart JSON with the router nudge', () => {
  const out = run()
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart')
  assert.match(out.hookSpecificOutput.additionalContext, /`wagerforge:using-wagerforge`/)
})

test('injects no bundled process-skill bootstrap (superpowers was removed in 0.3.0)', () => {
  const ctx = run().hookSpecificOutput.additionalContext
  assert.ok(!/superpowers|EXTREMELY_IMPORTANT/i.test(ctx))
  assert.ok(ctx.length < 600, `nudge must stay one short paragraph, got ${ctx.length} chars`)
})
