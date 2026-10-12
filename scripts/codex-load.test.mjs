import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codexAvailable, codexLoad } from './check-codex-load.mjs'

// Skipped where Codex is not installed (e.g. CI); run locally before every release.
test('Codex CLI loads exactly the skills in skills/, namespaced by the plugin', { skip: !codexAvailable() && 'codex CLI not installed' }, () => {
  const { loaded, expected } = codexLoad()
  assert.ok(expected.size > 0)
  assert.deepEqual([...loaded].sort(), [...expected].sort())
})
