import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectSuperpowers, SUPERPOWERS_RE } from './bootstrap-mode.mjs'

// Build an injectable fs from a {path: content|Error} map. size derived from content length unless overridden.
function fakeFs(files, sizes = {}) {
  const readFileSync = (p) => {
    const v = files[p]
    if (v === undefined) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
    if (v instanceof Error) throw v
    return v
  }
  const statSync = (p) => {
    const v = files[p]
    if (v === undefined) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
    return { isFile: () => true, size: sizes[p] ?? (typeof v === 'string' ? v.length : 0) }
  }
  return { readFileSync, statSync }
}
const U = '/home/.claude/settings.json'
const P = '/proj/.claude/settings.json'
const L = '/proj/.claude/settings.local.json'
const en = (obj) => JSON.stringify({ enabledPlugins: obj })

test('user scope superpowers@official:true -> matched', () => {
  const fs = fakeFs({ [U]: en({ 'superpowers@claude-plugins-official': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'matched')
})
test('marketplace-agnostic: @inline and @localname -> matched', () => {
  for (const key of ['superpowers@inline', 'superpowers@my-local']) {
    const fs = fakeFs({ [U]: en({ [key]: true }) })
    assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'matched', key)
  }
})
test('non-matches superpowers-ng@mp and wagerforge@superpowers -> absent', () => {
  const fs = fakeFs({ [U]: en({ 'superpowers-ng@mp': true, 'wagerforge@superpowers': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'absent')
})
test('higher scope disables lower -> absent; local re-enables -> matched', () => {
  const off = fakeFs({ [U]: en({ 'superpowers@x': true }), [P]: en({ 'superpowers@x': false }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...off }), 'absent')
  const on = fakeFs({ [U]: en({ 'superpowers@x': true }), [P]: en({ 'superpowers@x': false }), [L]: en({ 'superpowers@x': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...on }), 'matched')
})
test('no superpowers key anywhere -> absent', () => {
  const fs = fakeFs({ [U]: en({ 'other@mp': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'absent')
})
test('ANTI-REGRESSION: one malformed scope + clean superpowers signal elsewhere -> matched', () => {
  const fs = fakeFs({ [U]: '{ "enabledPlugins": { // jsonc\n "superpowers@x": true } }', [P]: en({ 'superpowers@x': true }) })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'matched')
})
test('malformed everywhere, no clean signal -> unreadable (NOT absent)', () => {
  const fs = fakeFs({ [U]: '{ bad json,, }' })
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'unreadable')
})
test('missing files -> absent, no throw', () => {
  const fs = fakeFs({})
  assert.equal(detectSuperpowers({ settingsPaths: [U, P, L], ...fs }), 'absent')
})
test('oversized file is skipped (treated unreadable), not parsed', () => {
  const fs = fakeFs({ [U]: en({ 'superpowers@x': true }) }, { [U]: 5 * 1024 * 1024 })
  assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'unreadable')
})
test('non-boolean superpowers value is not a match', () => {
  for (const v of ['true', 1, {}]) {
    const fs = fakeFs({ [U]: en({ 'superpowers@x': v }) })
    assert.equal(detectSuperpowers({ settingsPaths: [U], ...fs }), 'absent', String(v))
  }
})
test('SUPERPOWERS_RE matches @-prefixed only', () => {
  assert.ok(SUPERPOWERS_RE.test('superpowers@claude-plugins-official'))
  assert.ok(!SUPERPOWERS_RE.test('superpowers-ng@mp'))
})

// --- Task 2: resolveBootstrapMode ---
import { resolveBootstrapMode } from './bootstrap-mode.mjs'

test('env force -> full and detect is NOT called', () => {
  let called = false
  const mode = resolveBootstrapMode('force', () => { called = true; return 'matched' })
  assert.equal(mode, 'full'); assert.equal(called, false)
})
test('env off -> defer and detect is NOT called', () => {
  let called = false
  const mode = resolveBootstrapMode('off', () => { called = true; return 'absent' })
  assert.equal(mode, 'defer'); assert.equal(called, false)
})
test('no env: matched -> defer, absent -> full, unreadable -> full', () => {
  assert.equal(resolveBootstrapMode(undefined, () => 'matched'), 'defer')
  assert.equal(resolveBootstrapMode(undefined, () => 'absent'), 'full')
  assert.equal(resolveBootstrapMode(undefined, () => 'unreadable'), 'full')
})
test('unrecognized env value falls through to detection', () => {
  assert.equal(resolveBootstrapMode('maybe', () => 'matched'), 'defer')
})

// --- Task 3: renderContext + constants ---
import { renderContext, ROUTER_NUDGE, DISCIPLINE_POINTER } from './bootstrap-mode.mjs'

test('defer output: discipline pointer + nudge, NO double-injection content', () => {
  const ctx = renderContext('defer', { usingSuperpowersBody: 'IGNORED BODY' })
  assert.ok(ctx.includes(DISCIPLINE_POINTER))
  assert.ok(ctx.includes(ROUTER_NUDGE))
  assert.ok(!ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(!ctx.includes('using-superpowers'))
  assert.ok(!ctx.includes('IGNORED BODY'))
})
test('full output: wrapper + body + nudge', () => {
  const ctx = renderContext('full', { usingSuperpowersBody: 'BODYMARKER' })
  assert.ok(ctx.includes('<EXTREMELY_IMPORTANT>'))
  assert.ok(ctx.includes('</EXTREMELY_IMPORTANT>'))
  assert.ok(ctx.includes('BODYMARKER'))
  assert.ok(ctx.includes(ROUTER_NUDGE))
})
test('full output literally contains the exact defer-mode ROUTER_NUDGE (shared constant)', () => {
  const full = renderContext('full', { usingSuperpowersBody: 'B' })
  assert.ok(full.includes(ROUTER_NUDGE))
})
test('full-mode wrapper is golden-stable for a fixed body', () => {
  const ctx = renderContext('full', { usingSuperpowersBody: 'B' })
  const expected = [
    '<EXTREMELY_IMPORTANT>',
    'You have superpowers (bundled into wagerforge).',
    '',
    "**Below is the full content of your 'wagerforge:using-superpowers' skill — your introduction to using skills. For all other skills, use the 'Skill' tool:**",
    '',
    'B',
    '',
    ROUTER_NUDGE,
    '</EXTREMELY_IMPORTANT>',
  ].join('\n')
  assert.equal(ctx, expected)
})
test('ROUTER_NUDGE does not contain the substring "using-superpowers"', () => {
  assert.ok(!ROUTER_NUDGE.includes('using-superpowers'))
})
