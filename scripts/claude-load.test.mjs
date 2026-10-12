import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadedFromInit } from './check-claude-load.mjs'

// The live check makes one small model call, so tests cover only how its output is read.
const stream = (init) => ['{"type":"user"}', JSON.stringify({ type: 'system', subtype: 'init', ...init }), 'not json', ''].join('\n')

test('the init message names the plugin skills, agents and errors that Claude Code loaded', () => {
  const out = stream({
    skills: ['wagerforge:fair-verify', 'other:skill', 'wagerforge:math-rtp-modeling'],
    agents: ['wagerforge:fairness-auditor', 'general-purpose'],
    plugin_errors: [{ plugin: 'someone-else@skills-dir', message: 'bad manifest' }, { plugin: 'wagerforge@inline', message: 'broken hook' }]
  })
  assert.deepEqual(loadedFromInit(out, 'wagerforge'), {
    skills: new Set(['fair-verify', 'math-rtp-modeling']), agents: new Set(['fairness-auditor']), errors: ['broken hook']
  })
})

test('output without an init message fails instead of reporting zero skills', () => {
  assert.throws(() => loadedFromInit('{"type":"result"}\n', 'wagerforge'), /init/)
})
