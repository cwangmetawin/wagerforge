import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rewriteRefs, addProvenance, VENDORED_SKILLS } from './revendor-superpowers.mjs'

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
