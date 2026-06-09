import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HOOK = fileURLToPath(new URL('./session-start.mjs', import.meta.url))
function run(extraEnv) {
  const out = execFileSync('node', [HOOK], { env: { ...process.env, ...extraEnv }, encoding: 'utf8' })
  const j = JSON.parse(out) // must always be valid JSON
  return j.hookSpecificOutput.additionalContext
}

test('WAGERFORGE_BOOTSTRAP=force emits the full bootstrap', () => {
  const ctx = run({ WAGERFORGE_BOOTSTRAP: 'force' })
  assert.ok(ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(ctx.includes('wagerforge:using-wagerforge'))
})
test('WAGERFORGE_BOOTSTRAP=off emits defer with NO double-injection content', () => {
  const ctx = run({ WAGERFORGE_BOOTSTRAP: 'off' })
  assert.ok(!ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(!ctx.includes('using-superpowers'))
  assert.ok(ctx.includes('wagerforge:using-wagerforge'))
})
test('always emits parseable JSON with non-empty context', () => {
  assert.ok(run({ WAGERFORGE_BOOTSTRAP: 'force' }).length > 0)
  assert.ok(run({ WAGERFORGE_BOOTSTRAP: 'off' }).length > 0)
})
