import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validate, parseFrontmatter, wordCount, stripFences } from './validate.mjs'

// A well-formed domain skill; override any part to break exactly one rule.
function skill(name, { description = 'Use when testing the validator.', fm = '', title = `# ${name}`, insight = '> **Core insight:** One sharp line.', body = 'Body.' } = {}) {
  return `---\nname: ${name}\ndescription: ${description}\n${fm}---\n\n${title}\n\n${insight}\n\n${body}\n`
}

// Builds <root>/skills/<name>/SKILL.md plus optional top-level files; returns { root, skillsDir }.
function fixture(skills, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wf-'))
  const skillsDir = join(root, 'skills')
  mkdirSync(skillsDir)
  for (const [name, content] of Object.entries(skills)) {
    mkdirSync(join(skillsDir, name), { recursive: true })
    if (content !== null) writeFileSync(join(skillsDir, name, 'SKILL.md'), content)
  }
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true })
    writeFileSync(join(root, rel), content)
  }
  return { root, skillsDir }
}

function check(skills, files) {
  const { root, skillsDir } = fixture(skills, files)
  try { return validate(skillsDir) } finally { rmSync(root, { recursive: true, force: true }) }
}
const has = (list, re) => list.some((m) => re.test(m))

test('a well-formed skill passes with no errors and no warnings', () => {
  assert.deepEqual(check({ 'math-rtp-modeling': skill('math-rtp-modeling') }), { errors: [], warnings: [] })
})

test('name/folder, hyphen-case and presence rules', () => {
  assert.ok(has(check({ 'math-rtp-modeling': skill('wrong-name') }).errors, /!= folder/))
  assert.ok(has(check({ 'fair-verify': null }).errors, /missing SKILL\.md/))
  for (const bad of ['Bad_Name', '-lead', 'double--hyphen', 'trail-']) {
    assert.ok(has(check({ [bad]: skill(bad) }).errors, /not hyphen-case/), bad)
  }
  assert.ok(has(check({ 'fair-verify': '---\ndescription: Use when x.\n---\n# T\n\n> **Core insight:** y.\n' }).errors, /missing name/))
  assert.ok(has(check({ 'fair-verify': '---\nname: fair-verify\n---\n# T\n\n> **Core insight:** y.\n' }).errors, /missing description/))
  assert.ok(has(check({ x: '---\nname: x\ndescription: Use when X.' }).errors, /missing\/invalid frontmatter/))
  assert.ok(has(validate('/nonexistent/path/does/not/exist').errors, /skills dir not found/))
})

test('description: >1024 chars is an error, a missing "Use when" trigger is a warning', () => {
  assert.ok(has(check({ 'fair-verify': skill('fair-verify', { description: 'Use when ' + 'x'.repeat(1100) }) }).errors, /> 1024/))
  assert.ok(has(check({ 'fair-verify': skill('fair-verify', { description: 'Models the RTP precisely.' }) }).warnings, /not trigger-shaped/))
})

test('word budget (>540) warns and the hard cap (>800) errors', () => {
  const words = (n) => Array.from({ length: n }, () => 'w').join(' ')
  const soft = check({ 'fair-verify': skill('fair-verify', { body: words(560) }) })
  assert.equal(soft.errors.length, 0)
  assert.ok(has(soft.warnings, /> budget/))
  assert.ok(has(check({ 'fair-verify': skill('fair-verify', { body: words(820) }) }).errors, /> hard cap/))
})

test('parseFrontmatter: CRLF, quotes, one nested metadata map, whole-line delimiters only', () => {
  const p = parseFrontmatter('---\r\nname: x\r\ndescription: "Use when y."\r\nmetadata:\r\n  constraints: C1, C4\r\n---\r\nbody')
  assert.equal(p.fm.name, 'x')
  assert.equal(p.fm.description, 'Use when y.')
  assert.deepEqual(p.fm.metadata, { constraints: 'C1, C4' })
  assert.equal(parseFrontmatter('---oops\nname: x\ndescription: Use when y.\n---oops\nbody'), null)
  assert.equal(wordCount('one two three'), 3)
})

test('frontmatter must stay portable to Codex: unknown top-level keys are errors, metadata is fine', () => {
  assert.ok(has(check({ 'math-x': skill('math-x', { fm: 'constraints: C1\n' }) }).errors, /key "constraints" is not portable/))
  const ok = check({ 'math-x': skill('math-x', { fm: 'metadata:\n  constraints: C1\n', body: '## Correctness constraints\n- C1: RTP is multilinear in the reel weights; recompute it fully.' }) })
  assert.deepEqual(ok, { errors: [], warnings: [] })
  assert.ok(has(check({ 'math-x': skill('math-x', { description: '>' }) }).errors, /one line/))
})

test('the title is the skill name, so every skill reads the same way in the catalogue', () => {
  assert.deepEqual(check({ 'math-x': skill('math-x') }).errors, [])
  assert.ok(has(check({ 'math-x': skill('math-x', { title: '# Math X Mathematics' }) }).errors, /title "Math X Mathematics" must be the skill name "math-x"/))
})

test('every skill needs a title and a Core insight as the first line after it (not inside a code fence)', () => {
  assert.ok(has(check({ 'math-x': skill('math-x', { title: 'No heading here' }) }).errors, /no "# Title"/))
  assert.ok(has(check({ 'math-x': skill('math-x', { insight: 'Plain intro first.' }) }).errors, /Core insight/))
  const fenced = skill('math-x', { insight: '```md\n> **Core insight:** inside a fence\n```' })
  assert.ok(has(check({ 'math-x': fenced }).errors, /Core insight/))
})

test('correctness constraints: section required, non-empty, whole-token references, known ids only', () => {
  const tagged = (body, fm = '') => check({ 'fair-rng-core': skill('fair-rng-core', { fm, body }) })
  assert.ok(has(tagged('Uses HMAC [C7] and [C12].').errors, /no "Correctness constraints" section/))
  assert.ok(has(tagged('Uses [C1].\n\n## Correctness constraints\n<!-- TODO fill in -->').errors, /empty\/placeholder/))
  const real = tagged('Body [C7] [C12].\n\n## Correctness constraints\n- C7: use HMAC-SHA256, never a secret-prefix MAC.\n- C12: a stateless HMAC derivation is fine.')
  assert.deepEqual(real, { errors: [], warnings: [] })
  assert.ok(has(tagged('Body.\n\n## Correctness constraints\n- C7: use HMAC-SHA256 for keyed derivation.', 'metadata:\n  constraints: C7, C12\n').warnings, /C12 not referenced/))
  // "C10" in the section must not satisfy a declared C1.
  assert.ok(has(tagged('Body.\n\n## Correctness constraints\n- C10: thresholds are soft and per tier.', 'metadata:\n  constraints: C1\n').warnings, /C1 not referenced/))
  assert.ok(has(tagged('Uses [C15].\n\n## Correctness constraints\n- C15: a constraint that does not exist.').errors, /unknown correctness constraint C15/))
})

test('a heading inside a fenced code block does not count as the Correctness constraints section', () => {
  const body = 'Uses [C7].\n\n```md\n## Correctness constraints\nC7: only an example, not a real section.\n```'
  assert.ok(has(check({ 'fair-rng-core': skill('fair-rng-core', { body }) }).errors, /no "Correctness constraints" section/))
  assert.equal(stripFences('a\n```\n# x\n```\nb'), 'a\n\n\n\nb')
})

test('references must resolve: wagerforge:<name>, backticked skill names, [[links]]; commands and agents count', () => {
  const r = check({ 'fair-verify': skill('fair-verify', { body: 'See wagerforge:fair-nope, `math-nope` and [[qa-nope]].' }) })
  assert.ok(has(r.errors, /dangling reference wagerforge:fair-nope/))
  assert.ok(has(r.errors, /dangling skill reference `math-nope`/))
  assert.ok(has(r.errors, /broken \[\[link\]\]: qa-nope/))
  const ok = check(
    { 'fair-verify': skill('fair-verify', { body: 'Run /wagerforge:fairness-audit or ask wagerforge:fairness-auditor; `fair-verify` itself.' }) },
    { 'commands/fairness-audit.md': '---\ndescription: Audit fairness.\n---\nUse `fair-verify`.\n', 'agents/fairness-auditor.md': '---\nname: fairness-auditor\ndescription: Audits.\n---\nUse `fair-verify`.\n' },
  )
  assert.deepEqual(ok, { errors: [], warnings: [] })
})

test('commands, agents, hooks and top-level docs are checked too', () => {
  const r = check({ 'fair-verify': skill('fair-verify') }, {
    'commands/x.md': '---\ndescription: X.\n---\nFirst run `wagerforge:brainstorming`.\n',
    'agents/y.md': '---\nname: not-y\ndescription: Y.\n---\nbody\n',
    'hooks/h.mjs': "const s = 'see wagerforge:writing-plans'\n",
    'README.md': 'Requires superpowers:using-superpowers.\n',
  })
  assert.ok(has(r.errors, /\[commands\/x\.md\] dangling reference wagerforge:brainstorming/))
  assert.ok(has(r.errors, /agent name "not-y" != file "y"/))
  assert.ok(has(r.errors, /\[hooks\/h\.mjs\] dangling reference wagerforge:writing-plans/))
  assert.ok(has(r.errors, /\[README\.md\] references "superpowers:"/))
})

test('every domain skill must be reachable from the using-wagerforge router', () => {
  const router = (body) => skill('using-wagerforge', { body })
  const r = check({ 'using-wagerforge': router('| Math | `math-a` |'), 'math-a': skill('math-a'), 'math-b': skill('math-b'), 'econ-c': skill('econ-c') })
  assert.ok(has(r.errors, /\[math-b\] not reachable/))
  assert.ok(has(r.errors, /\[econ-c\] not reachable/))
  const ok = check({ 'using-wagerforge': router('| Math | `math-a`, `math-b` |\n| Economy | `econ-*` |'), 'math-a': skill('math-a'), 'math-b': skill('math-b'), 'econ-c': skill('econ-c') })
  assert.deepEqual(ok, { errors: [], warnings: [] })
})

test('symlinked skill folders and stray files in skills/ are refused, not silently skipped', () => {
  const { root, skillsDir } = fixture({ 'fair-verify': skill('fair-verify') })
  try {
    symlinkSync(join(skillsDir, 'fair-verify'), join(skillsDir, 'fair-link'))
    writeFileSync(join(skillsDir, 'stray.md'), 'x')
    const { errors } = validate(skillsDir)
    assert.ok(has(errors, /\[fair-link\] symlinked skill folders are not supported/))
    assert.ok(has(errors, /\[stray\.md\] unexpected file/))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('credentials listed in docs/SECURITY-NOTE.md may not appear anywhere else (Law #6)', () => {
  const note = '| Key file | Env |\n|---|---|\n| `fake-games-prod-0123456789ab.json` | prod |\n\nKey IDs: `0123456789ab`.\n'
  const r = check({ 'fair-verify': skill('fair-verify', { body: 'Load 0123456789ab from disk.' }) }, { 'docs/SECURITY-NOTE.md': note, 'README.md': 'see fake-games-prod-0123456789ab.json\n' })
  assert.ok(has(r.errors, /\[fair-verify\] references an excluded credential/))
  assert.ok(has(r.errors, /\[README\.md\] references an excluded credential/))
})
