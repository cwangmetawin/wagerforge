import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validate, parseFrontmatter, wordCount } from './validate.mjs'

function makeSkills(spec) {
  const root = mkdtempSync(join(tmpdir(), 'wf-'))
  for (const [name, content] of Object.entries(spec)) {
    mkdirSync(join(root, name), { recursive: true })
    if (content !== null) writeFileSync(join(root, name, 'SKILL.md'), content)
  }
  return root
}

test('valid skill passes with no errors', () => {
  const root = makeSkills({
    'math-rtp-modeling': `---\nname: math-rtp-modeling\ndescription: Use when modeling or verifying a target RTP.\n---\n\nBody.`,
  })
  const { errors } = validate(root)
  assert.equal(errors.length, 0)
  rmSync(root, { recursive: true, force: true })
})

test('name not matching folder is an error', () => {
  const root = makeSkills({
    'math-rtp-modeling': `---\nname: wrong-name\ndescription: Use when X.\n---\nBody.`,
  })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('!= folder')))
  rmSync(root, { recursive: true, force: true })
})

test('missing SKILL.md is an error', () => {
  const root = makeSkills({ 'fair-verify': null })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('missing SKILL.md')))
  rmSync(root, { recursive: true, force: true })
})

test('broken [[link]] is a warning', () => {
  const root = makeSkills({
    'fair-verify': `---\nname: fair-verify\ndescription: Use when verifying provable fairness.\n---\nSee [[does-not-exist]].`,
  })
  const { warnings } = validate(root)
  assert.ok(warnings.some((w) => w.includes('broken [[link]]')))
  rmSync(root, { recursive: true, force: true })
})

test('parseFrontmatter + wordCount helpers', () => {
  const p = parseFrontmatter(`---\nname: x\ndescription: Use when y.\n---\nbody here`)
  assert.equal(p.fm.name, 'x')
  assert.equal(p.fm.description, 'Use when y.')
  assert.equal(wordCount('one two three'), 3)
})

test('missing name is an error', () => {
  const root = makeSkills({ 'fair-verify': `---\ndescription: Use when verifying.\n---\nbody` })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('frontmatter missing name')))
  rmSync(root, { recursive: true, force: true })
})

test('non-hyphen-case name is an error', () => {
  const root = makeSkills({ 'Bad_Name': `---\nname: Bad_Name\ndescription: Use when X.\n---\nbody` })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('not hyphen-case')))
  rmSync(root, { recursive: true, force: true })
})

test('missing description is an error', () => {
  const root = makeSkills({ 'fair-verify': `---\nname: fair-verify\n---\nbody` })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('frontmatter missing description')))
  rmSync(root, { recursive: true, force: true })
})

test('description over 1024 chars is an error', () => {
  const long = 'Use when ' + 'x'.repeat(1100)
  const root = makeSkills({ 'fair-verify': `---\nname: fair-verify\ndescription: ${long}\n---\nbody` })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('description > 1024 chars')))
  rmSync(root, { recursive: true, force: true })
})

test('description without a "use when" trigger is a warning', () => {
  const root = makeSkills({ 'fair-verify': `---\nname: fair-verify\ndescription: Models the RTP precisely.\n---\nbody` })
  const { warnings } = validate(root)
  assert.ok(warnings.some((w) => w.includes('not trigger-shaped')))
  rmSync(root, { recursive: true, force: true })
})

test('body over the word budget (>500) is a warning, not an error', () => {
  const body = Array.from({ length: 501 }, () => 'w').join(' ')
  const root = makeSkills({ 'fair-verify': `---\nname: fair-verify\ndescription: Use when X.\n---\n${body}` })
  const { warnings, errors } = validate(root)
  assert.equal(errors.length, 0)
  assert.ok(warnings.some((w) => w.includes('> budget')))
  rmSync(root, { recursive: true, force: true })
})

test('body over the hard cap (>800) is an error', () => {
  const body = Array.from({ length: 801 }, () => 'w').join(' ')
  const root = makeSkills({ 'fair-verify': `---\nname: fair-verify\ndescription: Use when X.\n---\n${body}` })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('> hard cap')))
  rmSync(root, { recursive: true, force: true })
})

test('unterminated frontmatter is an error', () => {
  const root = makeSkills({ 'fair-verify': `---\nname: fair-verify\ndescription: Use when X.` })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('missing/invalid frontmatter')))
  rmSync(root, { recursive: true, force: true })
})

test('missing skills dir is an error', () => {
  const { errors } = validate('/nonexistent/path/does/not/exist')
  assert.ok(errors.some((e) => e.includes('skills dir not found')))
})

test('parseFrontmatter handles CRLF and strips surrounding quotes', () => {
  const p = parseFrontmatter(`---\r\nname: x\r\ndescription: "Use when y."\r\n---\r\nbody`)
  assert.equal(p.fm.name, 'x')
  assert.equal(p.fm.description, 'Use when y.')
})

test('constraint-tagged skill without a Correctness constraints section is an error', () => {
  const root = makeSkills({
    'fair-rng-core': `---\nname: fair-rng-core\ndescription: Use when deriving RNG.\n---\nUses HMAC [C7] and [C12].`,
  })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('no "Correctness constraints" section')))
  rmSync(root, { recursive: true, force: true })
})

test('constraint skill with a real Correctness constraints section passes', () => {
  const md = `---\nname: fair-rng-core\ndescription: Use when deriving RNG.\nconstraints: C7, C12\n---\nBody uses [C7] and [C12].\n\n## Correctness constraints\n- C7: SHA-256 length-extension only bites when used as a secret-prefix MAC; use HMAC-SHA256.\n- C12: stateless HMAC(serverSeed, clientSeed||nonce) is fine; the real fault is a recoverable seed.`
  const root = makeSkills({ 'fair-rng-core': md })
  const { errors } = validate(root)
  assert.equal(errors.length, 0)
  rmSync(root, { recursive: true, force: true })
})

test('constraint skill with an empty/placeholder Correctness section is an error', () => {
  const md = `---\nname: math-rtp-modeling\ndescription: Use when modeling RTP.\n---\nUses [C1].\n\n## Correctness constraints\n<!-- TODO fill in -->`
  const root = makeSkills({ 'math-rtp-modeling': md })
  const { errors } = validate(root)
  assert.ok(errors.some((e) => e.includes('empty/placeholder')))
  rmSync(root, { recursive: true, force: true })
})

test('declared constraint not referenced in its section is a warning', () => {
  const md = `---\nname: fair-rng-core\ndescription: Use when deriving RNG.\nconstraints: C7, C12\n---\nBody.\n\n## Correctness constraints\n- C7: use HMAC-SHA256, not a secret-prefix MAC over attacker data.`
  const root = makeSkills({ 'fair-rng-core': md })
  const { warnings } = validate(root)
  assert.ok(warnings.some((w) => w.includes('C12 not referenced')))
  rmSync(root, { recursive: true, force: true })
})

// --- vendored-skill gates (superpowers integration) ---
const PROV = '<!-- Vendored from superpowers v5.1.0 — MIT, Copyright (c) 2025 Jesse Vincent. See /THIRD-PARTY-NOTICES.md. -->'

// Mirrors the real repo layout: a root holding skills/ and (optionally) THIRD-PARTY-NOTICES.md.
function makeVendored({ withNotices = true, skills }) {
  const root = mkdtempSync(join(tmpdir(), 'wf-vendor-'))
  const skillsDir = join(root, 'skills')
  mkdirSync(skillsDir, { recursive: true })
  if (withNotices) writeFileSync(join(root, 'THIRD-PARTY-NOTICES.md'), 'MIT\nCopyright (c) 2025 Jesse Vincent\n')
  for (const [name, content] of Object.entries(skills)) {
    mkdirSync(join(skillsDir, name), { recursive: true })
    if (content !== null) writeFileSync(join(skillsDir, name, 'SKILL.md'), content)
  }
  return { root, skillsDir }
}

test('vendored skill is exempt from the 800-word hard cap', () => {
  const big = Array.from({ length: 1200 }, () => 'w').join(' ')
  const { root, skillsDir } = makeVendored({ skills: {
    'writing-plans': `---\nname: writing-plans\ndescription: Use when planning.\n---\n${PROV}\n\n${big}`,
  } })
  const { errors } = validate(skillsDir)
  assert.deepEqual(errors.filter((e) => /words >/.test(e)), [])
  rmSync(root, { recursive: true, force: true })
})

test('vendored skill missing provenance header is an error', () => {
  const { root, skillsDir } = makeVendored({ skills: {
    'writing-plans': `---\nname: writing-plans\ndescription: Use when planning.\n---\n\n# x`,
  } })
  const { errors } = validate(skillsDir)
  assert.ok(errors.some((e) => /provenance/i.test(e)))
  rmSync(root, { recursive: true, force: true })
})

test('residual superpowers: namespace in a skill is an error', () => {
  const { root, skillsDir } = makeVendored({ skills: {
    'using-wagerforge': `---\nname: using-wagerforge\ndescription: Use when routing.\n---\nsee superpowers:writing-plans`,
  } })
  const { errors } = validate(skillsDir)
  assert.ok(errors.some((e) => /superpowers:/.test(e)))
  rmSync(root, { recursive: true, force: true })
})

test('missing THIRD-PARTY-NOTICES.md with vendored skills present is an error', () => {
  const { root, skillsDir } = makeVendored({ withNotices: false, skills: {
    'writing-plans': `---\nname: writing-plans\ndescription: Use when planning.\n---\n${PROV}\n\n# x`,
  } })
  const { errors } = validate(skillsDir)
  assert.ok(errors.some((e) => /THIRD-PARTY-NOTICES/.test(e)))
  rmSync(root, { recursive: true, force: true })
})
