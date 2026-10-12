import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { parseFrontmatter, wordCount } from './validate.mjs'
import { buildDashboard, validateCoverage } from './build-dashboard.mjs'

const script = fileURLToPath(new URL('./build-dashboard.mjs', import.meta.url))
const repo = fileURLToPath(new URL('..', import.meta.url))
const output = 'docs/dashboard/index.html'
const coveragePath = 'docs/coverage/mss-games.json'
const specPath = 'docs/specs/2026-06-04-wagerforge-design.md'
const payload = '<script>alert("x")</script> & \'quoted\''
const escaped = '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quoted&#39;'

function write(root, path, value) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), value)
}

const json = (root, path, value) => write(root, path, JSON.stringify(value))
const cli = (root, args = []) => spawnSync(process.execPath, [script, '--root', root, ...args], { cwd: root, encoding: 'utf8' })
const read = (root, path) => readFileSync(join(root, path), 'utf8')
const card = (html, name) => html.match(new RegExp(`<article id="skill-${name}"[\\s\\S]*?</article>`))?.[0] || ''
const row = (html, id) => html.match(new RegExp(`<tr id="${id}"[\\s\\S]*?</tr>`))?.[0] || ''
const matches = (text, patterns) => patterns.forEach((pattern) => assert.match(text, pattern))

const skill = (name, constraints = '') => `---\nname: ${name}\ndescription: "Use when handling ${name} triggers"\nmetadata:\n  constraints: ${constraints || '""'}\n---\n# Title ${name}\n> **Core insight:** Insight ${name}\n## When to use\nBody words. [C12]\n\`\`\`md\n# False title\n> **Core insight:** False insight\n## False section\n\`\`\`\n## Process\nDo the work.\n`

const coverage = () => ({
  source: { repo: 'fixture-repo', commit: 'abc123', date: '2026-06-01' },
  families: [
    { id: 'z-none', name: 'No coverage', coverage: 'none', skills: [], games: ['Uncovered'], notes: 'Not audited' },
    { id: 'm-partial', name: 'Partial coverage', coverage: 'partial', skills: ['fair-demo'], games: ['Crash'], notes: 'Some gaps' },
    { id: 'a-full', name: 'Full coverage', coverage: 'full', skills: ['math-demo'], games: ['Dice', 'Crash'], notes: 'Audited' }
  ]
})

const legacySummary = () => ({
  date: '2026-06-02',
  claude: { model: 'Claude fixture', cases: [{ name: 'z-loss', with: 2, without: 5 }, { name: 'a-gain', with: 8, without: 5 }] },
  codex: { model: 'Codex fixture', cases: [{ name: 'equal', with: 4, without: 4 }] }
})
const summary = () => ({
  date: '2026-06-02',
  claude: {
    model: 'Claude fixture', runs: 2, runMeans: [{ with: 0.5, without: 0.75 }, { with: 1, without: 1 }],
    cases: [
      { name: 'z-loss', with: 1, without: 2, withScores: [0, 1], withoutScores: [1, 1] },
      { name: 'a-gain', with: 2, without: 1, withScores: [1, 1], withoutScores: [0.5, 1] }
    ]
  },
  codex: {
    model: 'Codex fixture', runs: 3, runMeans: [{ with: 1, without: 0 }, { with: 0, without: 1 }, { with: 1, without: 1 }],
    cases: [{ name: 'equal', with: 2, without: 2, withScores: [1, 0, 1], withoutScores: [0, 1, 1] }],
    skillReadRates: { any: 2 / 3, expected: 1 / 3 }
  }
})

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wf-dashboard-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  json(root, '.claude-plugin/plugin.json', { name: 'fixture-plugin', version: '1.2.3', description: 'Repository description' })
  for (const [name, constraints] of [['math-demo', 'C7, C1 C7'], ['fair-demo', 'C12, C7'], ['using-wagerforge', '']]) {
    write(root, `skills/${name}/SKILL.md`, skill(name, constraints))
  }
  const rows = Array.from({ length: 14 }, (_, i) => `| C${14 - i} | Folk ${14 - i} → Corrected ${14 - i} | \`math-demo\` |`).join('\n')
  write(root, specPath, `## 6. Other section\n| C1 | Outside trap | outside |\n## 7. Correctness Constraints\n| # | Folk claim → corrected | Binds to |\n|---|---|---|\n${rows}\n## 8. Other section\n| C1 | Outside trap | outside |\n`)
  json(root, coveragePath, coverage())
  return root
}
const scenario = (name, run) => test(name, (t) => run(fixture(t)))

test('deterministic bytes across builds, roots, input ordering and environment', (t) => {
  const [first, second] = [fixture(t), fixture(t)]
  const expected = buildDashboard(first)
  assert.equal(buildDashboard(first), expected)
  const reversed = coverage()
  reversed.families.reverse()
  reversed.families.forEach((family) => {
    family.games.reverse()
    family.skills.reverse()
  })
  json(second, coveragePath, reversed)
  assert.equal(buildDashboard(second), expected)
  assert.equal(cli(first).status, 0)
  const run = spawnSync(process.execPath, [script, '--root', second], {
    cwd: second, encoding: 'utf8', env: { ...process.env, TZ: 'Pacific/Honolulu', LC_ALL: 'tr_TR.UTF-8' }
  })
  assert.equal(run.status, 0, run.stderr)
  assert.equal(read(first, output), read(second, output))
  assert.equal(expected.includes(first), false)
  assert.equal(expected.includes(second), false)
})
scenario('--check detects missing and stale output without writing, then passes after rebuild', (root) => {
  let run = cli(root, ['--check'])
  assert.equal(run.status, 1)
  assert.match(run.stderr, /index\.html.*missing/)
  assert.equal(existsSync(join(root, output)), false)
  assert.equal(cli(root).status, 0)
  const original = read(root, output)
  assert.equal(cli(root, ['--check']).status, 0)
  write(root, 'skills/fair-demo/SKILL.md', read(root, 'skills/fair-demo/SKILL.md').replace('Insight fair-demo', 'Changed core insight'))
  run = cli(root, ['--check'])
  assert.equal(run.status, 1)
  assert.match(run.stderr, /index\.html.*differs.*fresh build/)
  assert.equal(read(root, output), original)
  assert.equal(cli(root).status, 0)
  assert.match(read(root, output), /Changed core insight/)
  assert.equal(cli(root, ['--check']).status, 0)
})
test('default root follows the script location and CLI rejects unsupported arguments', (t) => {
  const root = fixture(t)
  write(root, 'scripts/build-dashboard.mjs', readFileSync(script, 'utf8'))
  write(root, 'scripts/validate.mjs', readFileSync(new URL('./validate.mjs', import.meta.url), 'utf8'))
  const cwd = fixture(t)
  const run = spawnSync(process.execPath, [join(root, 'scripts/build-dashboard.mjs')], { cwd, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.equal(existsSync(join(root, output)), true)
  assert.equal(existsSync(join(cwd, output)), false)
  for (const args of [['--unknown'], ['--root'], ['--root', root, '--root', root], ['--check', '--check'], ['--fragment'], ['--check', '--fragment', 'x.html']]) {
    const invalid = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' })
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /Usage:/)
  }
})
scenario('live skill extraction reuses frontmatter and body word counts while ignoring fenced examples', (root) => {
  const path = 'skills/fair-demo/SKILL.md'
  write(root, path, read(root, path).replace(/\n/g, '\r\n'))
  const html = buildDashboard(root)
  const rendered = card(html, 'fair-demo')
  matches(rendered, [/Title fair-demo/, /Use when handling fair-demo triggers/, /Insight fair-demo/,
    new RegExp(`${wordCount(parseFrontmatter(read(root, path)).body)} 词`), /When to use/, /Process/])
  assert.doesNotMatch(rendered, /False (title|insight|section)/)
  for (const [pillar, count] of Object.entries({ router: 1, math: 1, fair: 1, build: 0, econ: 0, qa: 0, comp: 0 })) assert.match(html, new RegExp(`<code>${pillar}</code> <strong>${count}</strong>`))
  assert.equal((html.match(/<article id="skill-/g) || []).length, 3)
  matches(html, [/fixture-plugin/, /1\.2\.3/, /Repository description/])
})
scenario('constraints are numerically ordered and reverse-indexed only from metadata', (root) => {
  const html = buildDashboard(root)
  assert.equal((html.match(/<tr id="constraint-C\d+"/g) || []).length, 14)
  assert.ok(html.indexOf('id="constraint-C2"') < html.indexOf('id="constraint-C10"'))
  assert.match(row(html, 'constraint-C7'), /Folk 7 → Corrected 7/)
  const bound = row(html, 'constraint-C7').match(/<td class="bound-skills">([\s\S]*?)<\/td>/)[1]
  matches(bound, [/href="#skill-fair-demo"/, /href="#skill-math-demo"/])
  assert.ok(bound.indexOf('fair-demo') < bound.indexOf('math-demo'))
  assert.doesNotMatch(bound, /using-wagerforge/)
  assert.doesNotMatch(row(html, 'constraint-C12').match(/<td class="bound-skills">([\s\S]*?)<\/td>/)[1], /math-demo/)
  assert.doesNotMatch(html, /Outside trap/)
  assert.equal((card(html, 'math-demo').match(/href="#constraint-C7"/g) || []).length, 1)
})
scenario('coverage matrix includes provenance, notes, badges, links and sorted game details', (root) => {
  const html = buildDashboard(root)
  matches(html, [/fixture-repo/, /abc123/, /2026-06-01/, /<strong>3<\/strong> 个游戏家族/, /<strong>2<\/strong> 款游戏有覆盖/,
    /aria-label="完整 1，部分 1，未覆盖 1"/])
  assert.ok(html.indexOf('Full coverage') < html.indexOf('Partial coverage'))
  for (const level of ['full', 'partial', 'none']) assert.match(html, new RegExp(`class="badge ${level}"`))
  assert.match(html, /<details><summary>2 款游戏<\/summary>[\s\S]*?Crash[\s\S]*?Dice/)
  matches(html, [/class="badge full">完整</, /class="badge partial">部分</, /class="badge none">未覆盖</])
  matches(html, [/Some gaps/, /href="#skill-math-demo"/])
  matches(html, [/完整：按书面定义/, /部分：还有机制没讲到/, /未覆盖：没有技能讲它的核心模型/])
  assert.doesNotMatch(html, /判定：/)
})
scenario('a recorded coverage check is shown with its method, result and details file', (root) => {
  const check = { date: '2026-10-12', method: 'independent blind check', full: 1, families: 3, details: 'docs/coverage/mss-gaps.json' }
  json(root, coveragePath, { ...coverage(), check })
  matches(buildDashboard(root), [/判定：independent blind check · 2026-10-12 · 完整 1\/3/, /docs\/coverage\/mss-gaps\.json/])
  for (const bad of [{ ...check, full: 4 }, { ...check, families: 2 }, { ...check, date: 'yesterday' }, { ...check, method: '' }, 'check']) {
    json(root, coveragePath, { ...coverage(), check: bad })
    assert.throws(() => buildDashboard(root), /mss-games\.json\.check/)
  }
})
scenario('all file-derived text is escaped in both text and attribute contexts', (root) => {
  json(root, '.claude-plugin/plugin.json', { name: payload, version: payload, description: payload })
  write(root, 'skills/fair-demo/SKILL.md', skill('fair-demo', 'C7').replace('Use when handling fair-demo triggers', `Use when ${payload}`).replace('Title fair-demo', payload).replace('Insight fair-demo', payload).replace('When to use', payload))
  write(root, specPath, read(root, specPath).replace('Folk 7 → Corrected 7', payload).replaceAll('`math-demo`', payload))
  const data = coverage()
  Object.assign(data.source, { repo: payload, commit: payload })
  Object.assign(data.families[0], { name: payload, games: [payload], notes: payload })
  json(root, coveragePath, data)
  const results = summary()
  results.claude.model = payload
  results.claude.cases[0].name = payload
  json(root, 'evals/summary.json', results)
  const html = buildDashboard(root)
  assert.equal(html.includes(payload), false)
  assert.ok(html.includes(escaped))
  assert.match(card(html, 'fair-demo'), /data-search="[^"<>]*&lt;script&gt;/)
  assert.equal((html.match(/<script>/g) || []).length, 1)
  assert.doesNotMatch(html, /<img|onerror=/)
})
scenario('page is self-contained, accessible and confines table scrolling to its container', (root) => {
  const html = buildDashboard(root)
  matches(html, [/name="viewport"/, /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\)/, /:root\[data-theme="dark"\]/,
    /color-scheme: dark/, /body \{[^}]*background: var\(--bg\)/, /<html lang="zh-CN">/, /<p class="insight" lang="en">/, /overflow-x: auto/,
    /minmax\(0, 1fr\)/, /<label[^>]*for="skill-search"/, /aria-live="polite"/])
  assert.doesNotMatch(html, /(?:src|href)="(?:https?:|\/\/)|@import|fetch\(|innerHTML|Date\.now/)
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(target), `missing anchor ${target}`)
})
scenario('search filters by name, description and insight, hides empty pillars and restores linked cards', (root) => {
  const html = buildDashboard(root)
  const cards = ['math-demo', 'fair-demo', 'using-wagerforge'].map((name) => ({ dataset: { search: card(html, name).match(/data-search="([^"]+)"/)[1] }, hidden: false }))
  const groups = cards.map((item) => ({ querySelectorAll: () => [item], hidden: false }))
  const input = { value: '', addEventListener: (_, listener) => { input.filter = listener } }
  const status = { textContent: '' }
  let linkListener
  const document = {
    getElementById: (id) => id === 'skill-search' ? input : status,
    querySelectorAll: (selector) => selector === '.skill-card' ? cards : groups,
    addEventListener: (_, listener) => { linkListener = listener }
  }
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { document })
  for (const query of [' FAIR-DEMO ', 'handling fair-demo triggers', 'insight fair-demo']) {
    input.value = query
    input.filter()
    assert.deepEqual(cards.map((item) => item.hidden), [true, false, true])
    assert.deepEqual(groups.map((item) => item.hidden), [true, false, true])
    assert.equal(status.textContent, '显示 1 / 3 个技能')
  }
  input.value = 'no matches'
  input.filter()
  assert.equal(status.textContent, '显示 0 / 3 个技能')
  linkListener({ target: { closest: () => ({}) } })
  assert.deepEqual(cards.map((item) => item.hidden), [false, false, false])
})
scenario('evals absent means not run yet; multi-run results show means, pass counts and skill shares', (root) => {
  assert.match(buildDashboard(root), /尚未运行/)
  json(root, 'evals/summary.json', summary())
  const html = buildDashboard(root)
  assert.doesNotMatch(html, /尚未运行/)
  matches(html, [/claude[\s\S]*?共 <strong>2<\/strong> 轮[\s\S]*?装技能均分 <strong>0\.75<\/strong> · 不装 <strong>0\.88<\/strong> · 差值 <strong>-0\.13<\/strong>/,
    /codex[\s\S]*?共 <strong>3<\/strong> 轮[\s\S]*?装技能均分 <strong>0\.67<\/strong> · 不装 <strong>0\.67<\/strong>/])
  for (const value of ['2026-06-02', 'Claude fixture', 'Codex fixture', 'claude', 'codex']) assert.ok(html.includes(value))
  matches(html, [/a-gain<\/th><td>2 \/ 2<\/td><td>1 \/ 2<\/td><td>\+1<\/td>/,
    /z-loss<\/th><td>1 \/ 2<\/td><td>2 \/ 2<\/td><td>-1<\/td>/, /equal<\/th><td>2 \/ 3<\/td><td>2 \/ 3<\/td><td>0<\/td>/,
    /claude 每轮均分/, /codex 每轮均分/, /<th scope="row">1<\/th><td>0\.50<\/td><td>0\.75<\/td><td>-0\.25<\/td>/,
    /<th scope="row">2<\/th><td>1\.00<\/td><td>1\.00<\/td><td>0\.00<\/td>/,
    /读取任意 wagerforge 技能 <strong>66\.7%<\/strong>/, /读取预期技能 <strong>33\.3%<\/strong>/])
  assert.ok(html.indexOf('a-gain') < html.indexOf('z-loss'))
  const reversed = summary()
  reversed.claude.cases.reverse()
  json(root, 'evals/summary.json', reversed)
  assert.equal(buildDashboard(root), html)
})
scenario('legacy single-run summaries still show their original scores and signed deltas', (root) => {
  json(root, 'evals/summary.json', legacySummary())
  const html = buildDashboard(root)
  matches(html, [/装技能均分 <strong>5\.00<\/strong> · 不装 <strong>5\.00<\/strong>/,
    /a-gain<\/th><td>8<\/td><td>5<\/td><td>\+3<\/td>/, /z-loss<\/th><td>2<\/td><td>5<\/td><td>-3<\/td>/])
})
scenario('unavailable legacy skill metrics are shown as unrecorded instead of zero', (root) => {
  const value = summary()
  value.codex.skillReadRates = { any: null, expected: 0 }
  json(root, 'evals/summary.json', value)
  matches(buildDashboard(root), [/读取任意 wagerforge 技能 <strong>未记录<\/strong>/, /读取预期技能 <strong>0\.0%<\/strong>/])
})
scenario('multi-run fields cannot be silently rendered as legacy scores when runs is missing', (root) => {
  for (const edit of [
    v => { delete v.claude.runs }, v => { delete v.codex.runs },
    v => {
      delete v.claude.runs
      delete v.claude.runMeans
    }
  ]) {
    const value = summary()
    edit(value)
    json(root, 'evals/summary.json', value)
    assert.throws(() => buildDashboard(root), /evals\/summary\.json.*runs/)
  }
})
scenario('malformed multi-run summaries fail without replacing the existing dashboard', (root) => {
  write(root, output, 'keep this page')
  const edits = [
    v => { v.claude.runs = 0 }, v => { v.claude.runs = 1.5 }, v => { v.claude.runs = '2' },
    v => { v.claude.runMeans = {} }, v => { v.claude.runMeans.pop() },
    v => { v.claude.runMeans[0].with = 1.5 }, v => { v.claude.runMeans[0].with = 0.4 },
    v => { v.claude.cases[0].with = 0.5 }, v => { v.claude.cases[0].without = 3 },
    v => { v.claude.cases[0].with = 0 }, v => { v.claude.cases[0].withScores = {} },
    v => { v.claude.cases[0].withScores.pop() }, v => { v.claude.cases[0].withoutScores[0] = -0.5 },
    v => { v.claude.cases[0].withoutScores[0] = '1' }, v => { v.claude.cases[0].withScores[0] = null },
    v => { v.claude.cases[0].name = v.claude.cases[1].name }, v => { v.claude.cases = [] },
    v => { delete v.codex.skillReadRates }, v => { v.codex.skillReadRates.any = '0.5' },
    v => { v.codex.skillReadRates.expected = 1.1 }, v => { v.codex.skillReadRates.expected = -0.1 },
    v => { v.codex.skillReadRates.expected = 1 }
  ]
  for (const edit of edits) {
    const value = summary()
    edit(value)
    json(root, 'evals/summary.json', value)
    assert.throws(() => buildDashboard(root), /evals\/summary\.json/)
    assert.equal(cli(root).status, 1)
    assert.equal(read(root, output), 'keep this page')
  }
})

const invalidCoverage = [
  ['object', () => null, /coverage.*object/],
  ['source', (v) => { v.source = [] }, /source.*object/],
  ['repo type', (v) => { v.source.repo = 1 }, /source\.repo.*string/],
  ['commit type', (v) => { v.source.commit = null }, /source\.commit.*string/],
  ['date format', (v) => { v.source.date = 'June 1' }, /source\.date.*YYYY-MM-DD/],
  ['date calendar', (v) => { v.source.date = '2026-02-30' }, /source\.date.*YYYY-MM-DD/],
  ['families array', (v) => { v.families = {} }, /families.*array/],
  ['family object', (v) => { v.families[0] = null }, /families\[0\].*object/],
  ['id format', (v) => { v.families[0].id = 'Bad_ID' }, /id.*kebab-case/],
  ['duplicate id', (v) => { v.families[1].id = v.families[0].id }, /duplicate.*id/],
  ['name type', (v) => { v.families[0].name = 3 }, /name.*string/],
  ['coverage enum', (v) => { v.families[0].coverage = 'complete' }, /coverage.*full.*partial.*none/],
  ['skills array', (v) => { v.families[0].skills = 'math-demo' }, /skills.*array/],
  ['skill type', (v) => { v.families[0].skills = [1] }, /skills\[0\].*string/],
  ['unknown skill', (v) => { v.families[0].skills = ['fair-missing'] }, /unknown skill.*fair-missing/],
  ['games array', (v) => { v.families[0].games = {} }, /games.*array/],
  ['game type', (v) => { v.families[0].games = [null] }, /games\[0\].*string/],
  ['notes type', (v) => { v.families[0].notes = [] }, /notes.*string/]
]

for (const [name, edit, message] of invalidCoverage) scenario(`coverage rejects ${name} with a field-specific error`, (root) => {
  let data = coverage()
  data = edit(data) === null ? null : data
  assert.throws(() => validateCoverage(data, new Set(['math-demo', 'fair-demo'])), message)
  json(root, coveragePath, data)
  assert.throws(() => buildDashboard(root), message)
})
scenario('valid empty coverage and leap dates are accepted without mutating input', (root) => {
  const data = { source: { repo: '', commit: '', date: '2024-02-29' }, families: [] }
  const before = JSON.stringify(data)
  assert.equal(validateCoverage(data, new Set()), data)
  assert.equal(JSON.stringify(data), before)
  json(root, coveragePath, data)
  assert.match(buildDashboard(root), /<strong>0<\/strong> 个游戏家族/)
})
scenario('invalid JSON and malformed evals fail closed without replacing existing output', (root) => {
  write(root, output, 'keep this page')
  write(root, coveragePath, '{')
  assert.throws(() => buildDashboard(root), /mss-games\.json.*invalid JSON/)
  assert.equal(cli(root).status, 1)
  assert.equal(read(root, output), 'keep this page')
  json(root, coveragePath, coverage())
  for (const edit of [
    (v) => { v.date = '2026-02-30' }, (v) => { delete v.codex },
    (v) => { v.claude.model = 3 }, (v) => { v.codex.cases = {} },
    (v) => { v.claude.cases[0].name = null }, (v) => { v.claude.cases[0].with = '8' },
    (v) => { v.claude.cases[0].without = null }, (v) => {
      v.claude.cases[0].with = 1e308
      v.claude.cases[0].without = -1e308
    }
  ]) {
    const value = summary()
    edit(value)
    json(root, 'evals/summary.json', value)
    assert.throws(() => buildDashboard(root), /evals\/summary\.json/)
  }
  write(root, 'evals/summary.json', '{')
  assert.throws(() => buildDashboard(root), /evals\/summary\.json.*invalid JSON/)
})
scenario('broken skills and incomplete constraint tables fail rather than silently disappearing', (root) => {
  const path = 'skills/math-demo/SKILL.md'
  const valid = read(root, path)
  for (const broken of [valid.replace('name: math-demo', 'name: math-other'), valid.replace('C7, C1 C7', 'C99'), valid.replace('# Title math-demo', ''), valid.replace('> **Core insight:** Insight math-demo', ''), 'no frontmatter']) {
    write(root, path, broken)
    assert.throws(() => buildDashboard(root), /skills\/math-demo\/SKILL\.md/)
  }
  write(root, path, valid)
  const spec = read(root, specPath)
  for (const broken of [spec.replace('| C14 |', '| C13 |'), spec.replace(/\| C14 .*\n/, ''), spec.replace('## 7.', '## 17.')]) {
    write(root, specPath, broken)
    assert.throws(() => buildDashboard(root), /C1.*C14|section 7/)
  }
})
scenario('the artifact fragment carries the same page without the document wrapper', (root) => {
  const page = buildDashboard(root)
  const fragment = buildDashboard(root, { fragment: true })
  assert.match(fragment, /^<title>fixture-plugin 技能看板<\/title><style>/)
  assert.doesNotMatch(fragment, /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]|<\/head>|<\/body>|<\/html>/i)
  assert.ok(page.includes(fragment.slice(fragment.indexOf('<main'))))
  const target = join(root, 'out', 'dashboard-fragment.html')
  const run = cli(root, ['--fragment', target])
  assert.equal(run.status, 0, run.stderr)
  assert.equal(read(root, 'out/dashboard-fragment.html'), fragment)
  assert.equal(existsSync(join(root, output)), false)
})
scenario('a skill whose heading is its name shows the name once', (root) => {
  write(root, 'skills/math-demo/SKILL.md', skill('math-demo').replace('# Title math-demo', '# math-demo'))
  const rendered = card(buildDashboard(root), 'math-demo')
  assert.match(rendered, /<h3 class="skill-name"><code>math-demo<\/code><\/h3>/)
  assert.equal((rendered.match(/>math-demo</g) || []).length, 1)
})

test('the committed dashboard is current: regenerate it after changing skills, coverage or eval results', () => {
  assert.ok(read(repo, output) === buildDashboard(repo), `${output} is stale: run node scripts/build-dashboard.mjs`)
})
