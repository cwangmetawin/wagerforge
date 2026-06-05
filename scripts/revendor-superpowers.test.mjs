import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rewriteRefs, addProvenance, trimUsingSuperpowers, VENDORED_SKILLS } from './revendor-superpowers.mjs'

test('VENDORED_SKILLS has the 14 superpowers skills', () => {
  assert.equal(VENDORED_SKILLS.length, 14)
  assert.ok(VENDORED_SKILLS.includes('writing-plans'))
})

test('rewriteRefs maps vendored skill namespaces to wagerforge:', () => {
  assert.equal(rewriteRefs('see superpowers:writing-plans'), 'see wagerforge:writing-plans')
  assert.equal(rewriteRefs('superpowers:test-driven-development'), 'wagerforge:test-driven-development')
})

test('rewriteRefs leaves webapp-testing as a bare global skill (not vendored)', () => {
  assert.equal(rewriteRefs('use superpowers:webapp-testing'), 'use webapp-testing')
})

test('rewriteRefs maps the wildcard prose form', () => {
  assert.equal(rewriteRefs('Reference superpowers:* by name'), 'Reference wagerforge:* by name')
})

test('addProvenance lands after frontmatter and is idempotent', () => {
  const md = '---\nname: x\ndescription: d\n---\n\n# X\n'
  const once = addProvenance(md)
  assert.match(once, /^---\n[\s\S]*?\n---\n<!-- Vendored from superpowers/)
  assert.equal(addProvenance(once), once)
})

const USING_SP = [
  '## How to Access Skills', '',
  '**In Claude Code:** Use the `Skill` tool.', '',
  '**In Copilot CLI:** Use the `skill` tool.', '',
  '**In Gemini CLI:** Skills activate via `activate_skill`.', '',
  '**In other environments:** Check your platform docs.', '',
  '## Platform Adaptation', '',
  'Skills use Claude Code tool names. Non-CC platforms: see `references/copilot-tools.md`.', '',
  '# Using Skills', '',
  'The rule.', '',
].join('\n')

test('trimUsingSuperpowers removes non-Claude platform content, keeps Claude Code + substance', () => {
  const t = trimUsingSuperpowers(USING_SP)
  assert.ok(t.includes('**In Claude Code:**'), 'keeps the Claude Code access note')
  assert.ok(!t.includes('Copilot CLI') && !t.includes('Gemini CLI'), 'drops Copilot/Gemini bullets')
  assert.ok(!t.includes('## Platform Adaptation'), 'drops the Platform Adaptation section')
  assert.ok(!t.includes('references/copilot-tools.md'), 'drops the dead references/ pointer')
  assert.ok(t.includes('# Using Skills') && t.includes('The rule.'), 'preserves downstream substance')
  assert.ok(!/\n{3,}/.test(t), 'no triple-blank runs left behind')
})

test('trimUsingSuperpowers is idempotent', () => {
  const once = trimUsingSuperpowers(USING_SP)
  assert.equal(trimUsingSuperpowers(once), once)
})
