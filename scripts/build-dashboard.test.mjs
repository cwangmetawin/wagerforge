import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { parseFrontmatter, wordCount } from './validate.mjs'
import { buildDashboard, buildLlms, validateCoverage } from './build-dashboard.mjs'

const script = fileURLToPath(new URL('./build-dashboard.mjs', import.meta.url))
const repo = fileURLToPath(new URL('..', import.meta.url))
const output = 'docs/dashboard/index.html'
const englishOutput = 'docs/dashboard/en/index.html'
const llmsOutput = 'docs/dashboard/llms.txt'
const repositoryUrl = 'https://github.com/cwangmetawin/wagerforge'
const rawUrl = 'https://raw.githubusercontent.com/cwangmetawin/wagerforge'
const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const coveragePath = 'docs/coverage/mss-games.json'
const translationsPath = 'docs/coverage/mss-games.en.json'
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
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[name])

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
  json(root, '.claude-plugin/marketplace.json', { name: 'fixture-marketplace' })
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
  assert.equal(read(first, englishOutput), read(second, englishOutput))
  assert.equal(read(first, llmsOutput), read(second, llmsOutput))
  assert.equal(expected.includes(first), false)
  assert.equal(expected.includes(second), false)
})
scenario('--check names a missing or stale English page even when the Chinese page is current', (root) => {
  assert.equal(cli(root).status, 0)
  const original = read(root, output)
  rmSync(join(root, englishOutput))
  let run = cli(root, ['--check'])
  assert.equal(run.status, 1)
  assert.match(run.stderr, /docs\/dashboard\/en\/index\.html is missing/)
  assert.equal(existsSync(join(root, englishOutput)), false)
  write(root, englishOutput, 'stale English page')
  run = cli(root, ['--check'])
  assert.equal(run.status, 1)
  assert.match(run.stderr, /docs\/dashboard\/en\/index\.html differs from a fresh build/)
  assert.equal(read(root, output), original)
  assert.equal(read(root, englishOutput), 'stale English page')
  assert.equal(cli(root).status, 0)
  run = cli(root, ['--check'])
  assert.equal(run.status, 0, run.stderr)
  matches(run.stdout, [/docs\/dashboard\/index\.html matches a fresh build/, /docs\/dashboard\/en\/index\.html matches a fresh build/])
})
scenario('--check names missing or stale llms.txt when both HTML pages are current', (root) => {
  assert.equal(cli(root).status, 0)
  const pages = [read(root, output), read(root, englishOutput)]
  rmSync(join(root, llmsOutput))
  let run = cli(root, ['--check'])
  assert.equal(run.status, 1)
  assert.match(run.stderr, /docs\/dashboard\/llms\.txt is missing/)
  assert.equal(existsSync(join(root, llmsOutput)), false)
  write(root, llmsOutput, 'stale agent instructions')
  run = cli(root, ['--check'])
  assert.equal(run.status, 1)
  assert.match(run.stderr, /docs\/dashboard\/llms\.txt differs from a fresh build/)
  assert.deepEqual([read(root, output), read(root, englishOutput)], pages)
  assert.equal(read(root, llmsOutput), 'stale agent instructions')
  assert.equal(cli(root).status, 0)
  run = cli(root, ['--check'])
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /docs\/dashboard\/llms\.txt matches a fresh build/)
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
  for (const args of [['--unknown'], ['--root'], ['--root', root, '--root', root], ['--check', '--check'], ['--fragment'], ['--check', '--fragment', 'x.html'],
    ['--ref'], ['--ref', 'main', '--ref', 'main'], ['--lang'], ['--lang', 'en'], ['--check', '--lang', 'en'], ['--fragment', 'x.html', '--lang', 'en', '--lang', 'en']]) {
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
  matches(buildDashboard(root), [/判定：<span lang="en">independent blind check<\/span> · 2026-10-12 · 完整 1\/3/, /docs\/coverage\/mss-gaps\.json/])
  for (const bad of [{ ...check, full: 4 }, { ...check, families: 2 }, { ...check, date: 'yesterday' }, { ...check, method: '' }, 'check']) {
    json(root, coveragePath, { ...coverage(), check: bad })
    assert.throws(() => buildDashboard(root), /mss-games\.json\.check/)
  }
})
scenario('all file-derived text is escaped in both text and attribute contexts', (root) => {
  json(root, '.claude-plugin/plugin.json', { name: payload, version: payload, description: payload })
  json(root, '.claude-plugin/marketplace.json', { name: payload })
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
  for (const lang of ['zh-CN', 'en']) {
    const html = buildDashboard(root, { lang })
    assert.equal(html.includes(payload), false)
    assert.ok(html.includes(escaped))
    assert.match(card(html, 'fair-demo'), /data-search="[^"<>]*&lt;script&gt;/)
    assert.equal((html.match(/<script>/g) || []).length, 1)
    assert.doesNotMatch(html, /<img|onerror=/)
  }
})
scenario('page is self-contained, accessible and confines table scrolling to its container', (root) => {
  const html = buildDashboard(root)
  matches(html, [/name="viewport"/, /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\)/, /:root\[data-theme="dark"\]/,
    /color-scheme: dark/, /body \{[^}]*background: var\(--bg\)/, /<html lang="zh-CN">/, /<p class="insight" lang="en">/, /overflow-x: auto/,
    /minmax\(0, 1fr\)/, /<label[^>]*for="skill-search"/, /aria-live="polite"/])
  assert.doesNotMatch(html, /\bsrc\s*=|@import|url\s*\(|fetch\(|innerHTML|Date\.now/)
  assert.deepEqual(html.match(/<link\b[^>]*>/g), ['<link rel="alternate" type="text/plain" href="llms.txt" title="Instructions for AI agents">'])
  for (const [, href] of html.matchAll(/href="(https?:[^"\s]+)"/g)) assert.ok(href.startsWith(`${repositoryUrl}/`), `unexpected external link ${href}`)
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(target), `missing anchor ${target}`)
})
scenario('English UI and its search status are translated without CJK characters', (root) => {
  json(root, 'evals/summary.json', summary())
  const html = buildDashboard(root, { lang: 'en' })
  assert.doesNotMatch(html, cjk)
  matches(html, [/<html lang="en">/, /Skills dashboard/, /Core insight/, /Correctness constraints/, /MSS game coverage/,
    /Behaviour evals \(with \/ without skills\)/, /Sections \(2\)/, /\d+ words/, /placeholder="Search skills…"/,
    /<label for="skill-search">Search by name, trigger or core insight<\/label>/, /Showing 3 \/ 3 skills/,
    /aria-label="Dashboard sections"/, /aria-label="Skill counts by pillar"/, /aria-label="full 1, partial 1, none 1"/,
    /claude mean per run/, /Passes with skills/, /Read the expected skill/])
  assert.doesNotMatch(html, /<span class="label" lang="zh-CN">/)
  const status = { textContent: '' }
  const input = { value: 'no matches', addEventListener: () => {} }
  const document = {
    getElementById: (id) => id === 'skill-search' ? input : status,
    querySelectorAll: (selector) => selector === '.skill-card' ? [{ dataset: { search: 'math-demo' }, hidden: false }] : [],
    addEventListener: () => {}
  }
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { document })
  assert.equal(status.textContent, 'Showing 0 / 1 skills')
})
scenario('both headers link to explicit language files and mark only the current language', (root) => {
  const zh = buildDashboard(root)
  const en = buildDashboard(root, { lang: 'en' })
  const switches = [zh, en].map(html => html.match(/<header>[\s\S]*?<nav class="language-switch"[\s\S]*?<\/nav>/)[0])
  matches(switches[0], [/href="en\/index\.html" hreflang="en" lang="en">English<\/a>/,
    /href="index\.html" hreflang="zh-CN" lang="zh-CN" aria-current="true">中文<\/a>/])
  // The native Chinese link is encoded as character references in the English HTML source.
  matches(switches[1], [/href="\.\.\/index\.html" hreflang="zh-CN" lang="zh-CN">&#20013;&#25991;<\/a>/,
    /href="index\.html" hreflang="en" lang="en" aria-current="true">English<\/a>/])
  for (const menu of switches) assert.equal((menu.match(/aria-current="true"/g) || []).length, 1)
})
scenario('llms.txt lists every skill once with its ref, description and the router first', (root) => {
  const ref = 'v0.3.1'
  const text = buildLlms(root, { ref })
  const entries = [...text.matchAll(/^- \[([a-z0-9-]+)\]\((https:\/\/raw\.githubusercontent\.com\/[^)]+)\): (.+)$/gm)]
    .map(([, name, url, description]) => ({ name, url, description }))
  const names = ['using-wagerforge', 'fair-demo', 'math-demo']
  assert.deepEqual(entries, names.map(name => ({ name, url: `${rawUrl}/${ref}/skills/${name}/SKILL.md`, description: parseFrontmatter(read(root, `skills/${name}/SKILL.md`)).fm.description })))
  assert.equal((text.match(/\/SKILL\.md/g) || []).length, names.length)
  assert.ok(text.startsWith('# fixture-plugin v1.2.3\n\n> Repository description\n'))
  for (const section of ['Claude Code', 'Codex CLI (0.159+)', 'Other agents', 'Skills', 'Human dashboard']) assert.ok(text.includes(`## ${section}\n`))
  assert.ok(text.includes(`${repositoryUrl}/archive/${ref}.zip`))
  assert.ok(text.includes('[Chinese dashboard](index.html)'))
  assert.ok(text.includes('[English dashboard](en/index.html)'))
  assert.doesNotMatch(text, cjk)
  assert.equal(cli(root, ['--ref', ref]).status, 0)
  assert.equal(read(root, llmsOutput), text)
})
scenario('download, source and all install commands share the ref and manifest names across the three files', (root) => {
  const ref = 'release/v1.2_3-abc'
  const plugin = JSON.parse(read(root, '.claude-plugin/plugin.json')).name
  const marketplace = JSON.parse(read(root, '.claude-plugin/marketplace.json')).name
  const commands = [
    `claude plugin marketplace add cwangmetawin/wagerforge#${ref}\nclaude plugin install ${plugin}@${marketplace}`,
    `codex plugin marketplace add cwangmetawin/wagerforge --ref ${ref}\ncodex plugin add ${plugin} --marketplace ${marketplace}`,
    `/plugin marketplace add cwangmetawin/wagerforge#${ref}\n/plugin install ${plugin}@${marketplace}`
  ]
  const instructions = buildLlms(root, { ref })
  const llmsCommands = [...instructions.matchAll(/```(?:sh|text)\n([\s\S]*?)\n```/g)].map(match => match[1])
  assert.deepEqual(llmsCommands.sort(), [...commands].sort())
  for (const lang of ['zh-CN', 'en']) {
    const html = buildDashboard(root, { ref, lang })
    assert.ok(html.indexOf('id="install"') < html.indexOf('id="skills"'))
    const instructionsHref = lang === 'en' ? '../llms.txt' : 'llms.txt'
    assert.ok(html.includes(`<link rel="alternate" type="text/plain" href="${instructionsHref}" title="Instructions for AI agents">`))
    const install = html.match(/<section id="install">([\s\S]*?)<\/section>/)[1]
    assert.ok(install.startsWith(`<h2>${lang === 'en' ? 'Download and install' : '下载与安装'}</h2><div class="agent-install"><h3>${lang === 'en' ? 'For AI agents' : '给 AI agent'}</h3>`))
    assert.ok(install.includes(`href="${instructionsHref}"`))
    assert.ok(install.indexOf('class="agent-install"') < install.indexOf('class="download-links"'))
    assert.ok(html.includes(`href="${repositoryUrl}/archive/${ref}.zip"`))
    assert.ok(html.includes(`href="${repositoryUrl}/tree/${ref}"`))
    const names = ['fair-demo', 'math-demo', 'using-wagerforge']
    for (const name of names) assert.ok(card(html, name).includes(`href="${repositoryUrl}/blob/${ref}/skills/${name}/SKILL.md">${lang === 'en' ? 'Source' : '源文件'}</a>`))
    assert.equal((html.match(/\/SKILL\.md"/g) || []).length, names.length)
    const htmlCommands = [...install.matchAll(/<pre><code lang="en">([\s\S]*?)<\/code><\/pre>/g)].map(match => decode(match[1]))
    assert.deepEqual(htmlCommands.sort(), [...commands].sort())
    assert.doesNotMatch(html, /target="_blank"/)
  }
  const run = cli(root, ['--ref', ref])
  assert.equal(run.status, 0, run.stderr)
  assert.equal(read(root, output), buildDashboard(root, { ref }))
  assert.equal(read(root, englishOutput), buildDashboard(root, { ref, lang: 'en' }))
  assert.equal(read(root, llmsOutput), instructions)
  assert.equal(cli(root, ['--check', '--ref', ref]).status, 0)
  assert.ok(buildDashboard(root).includes(`${repositoryUrl}/archive/main.zip`))
})
scenario('invalid refs fail before replacing any generated file', (root) => {
  write(root, output, 'keep Chinese')
  write(root, englishOutput, 'keep English')
  write(root, llmsOutput, 'keep instructions')
  for (const ref of ['..', 'release/../main', 'a..b', 'bad ref', '<', '', '-main', 'a'.repeat(101), 'main\n']) {
    assert.throws(() => buildDashboard(root, { ref }), /Invalid ref/)
    assert.throws(() => buildLlms(root, { ref }), /Invalid ref/)
    const run = cli(root, ['--ref', ref])
    assert.equal(run.status, 1)
    assert.match(run.stderr, /Invalid ref|Usage:/)
    assert.equal(read(root, output), 'keep Chinese')
    assert.equal(read(root, englishOutput), 'keep English')
    assert.equal(read(root, llmsOutput), 'keep instructions')
  }
  for (const ref of ['main', 'A'.repeat(100), 'v0.3.2', 'a/b_c-d']) assert.doesNotThrow(() => buildDashboard(root, { ref }))
  for (const ref of [null, 1, {}]) assert.throws(() => buildDashboard(root, { ref }), /Invalid ref/)
})
scenario('Chinese data stays verbatim with truthful language markers on both pages', (root) => {
  const data = coverage()
  Object.assign(data.families[0], { name: '中文家族', notes: '原始中文说明', games: ['中文游戏'] })
  json(root, coveragePath, data)
  for (const lang of ['zh-CN', 'en']) {
    const html = buildDashboard(root, { lang })
    matches(html, [/<span lang="zh-CN">中文家族<\/span>/, /<td lang="zh-CN">原始中文说明<\/td>/,
      /<li lang="zh-CN">中文游戏<\/li>/])
    const englishCard = card(html, 'fair-demo')
    matches(englishCard, [/<article[^>]* lang="en">/, /<h3 lang="en">Title fair-demo<\/h3>/, /<p class="description" lang="en">/,
      new RegExp(`<span class="label" lang="${lang}">`), new RegExp(`<p class="meta" lang="${lang}">`), new RegExp(`<details lang="${lang}">`)])
  }
})
scenario('English notes use the translation while Chinese notes stay unchanged', (root) => {
  const data = coverage()
  data.families[0].notes = '原始中文说明'
  json(root, coveragePath, data)
  const zh = buildDashboard(root)
  assert.match(buildDashboard(root, { lang: 'en' }), /<td lang="zh-CN">原始中文说明<\/td>/)
  json(root, translationsPath, { notes: { 'z-none': 'Translated note & details' } })
  const en = buildDashboard(root, { lang: 'en' })
  assert.match(en, /<td lang="en">Translated note &amp; details<\/td>/)
  assert.doesNotMatch(en, cjk)
  assert.equal(buildDashboard(root), zh)
  assert.equal(read(root, coveragePath), JSON.stringify(data))
})
scenario('missing or unknown translation family IDs fail before replacing any generated file', (root) => {
  const data = coverage()
  data.families[0].notes = '原始中文说明'
  json(root, coveragePath, data)
  const originals = [output, englishOutput, llmsOutput].map(path => [path, `keep ${path}`])
  originals.forEach(([path, value]) => write(root, path, value))
  for (const [translations, error] of [
    [{ notes: {} }, /mss-games\.en\.json.*missing translation.*z-none/],
    [{ notes: { 'z-none': 'Translated', 'unknown-family': 'Unknown' } }, /mss-games\.en\.json.*unknown family id.*unknown-family/],
    [{ notes: { 'z-none': '' } }, /mss-games\.en\.json.*z-none.*non-empty string/],
    [{ notes: { 'z-none': 1 } }, /mss-games\.en\.json.*z-none.*non-empty string/],
    [{ notes: [] }, /mss-games\.en\.json.*notes.*object/]
  ]) {
    json(root, translationsPath, translations)
    for (const lang of ['zh-CN', 'en']) assert.throws(() => buildDashboard(root, { lang }), error)
    const run = cli(root)
    assert.equal(run.status, 1)
    assert.match(run.stderr, error)
    originals.forEach(([path, value]) => assert.equal(read(root, path), value))
  }
})
scenario('both pages have identical summary counts, skill order, constraint rows, coverage data and eval results', (root) => {
  json(root, 'evals/summary.json', summary())
  const zh = buildDashboard(root)
  const en = buildDashboard(root, { lang: 'en' })
  const collect = (html, pattern) => [...html.matchAll(pattern)].map(match => match[1])
  for (const pattern of [/class="counts">([\s\S]*?)<\/ul>/g, /class="pillars"[^>]*>([\s\S]*?)<\/ul>/g]) {
    const counts = html => collect(collect(html, pattern)[0], /<strong>(\d+)<\/strong>/g)
    assert.deepEqual(counts(zh), counts(en))
  }
  for (const pattern of [/<article id="(skill-[^"]+)"/g, /id="(constraint-[^"]+)"/g, /<tbody>([\s\S]*?)<\/tbody>/g]) {
    const values = html => collect(html, pattern).map(value => value.replace(/<span class="badge (full|partial|none)">[^<]+<\/span>/g, '$1').replace(/<summary>\d+ (?:款游戏|games)<\/summary>/g, 'games'))
    assert.deepEqual(values(zh), values(en))
  }
  assert.equal(collect(zh, /<article id="(skill-[^"]+)"/g).length, 3)
  assert.equal(collect(en, /id="(constraint-[^"]+)"/g).length, 14)
  assert.equal((en.match(/<small lang="en">[amz]-/g) || []).length, 3)
  assert.equal((en.match(/<th scope="row" lang="en">(?:a-gain|z-loss|equal)<\/th>/g) || []).length, 3)
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
  assert.equal(existsSync(join(root, englishOutput)), false)
  assert.equal(existsSync(join(root, llmsOutput)), false)
})
scenario('English fragments use the requested ref and language without writing the full pages', (root) => {
  const target = join(root, 'out', 'english-fragment.html')
  const ref = 'abc123'
  const run = cli(root, ['--fragment', target, '--lang', 'en', '--ref', ref])
  assert.equal(run.status, 0, run.stderr)
  const fragment = read(root, 'out/english-fragment.html')
  assert.equal(fragment, buildDashboard(root, { fragment: true, ref, lang: 'en' }))
  matches(fragment, [/^<title>fixture-plugin Skills dashboard<\/title><style>/, /<main lang="en">/, /archive\/abc123\.zip/])
  assert.doesNotMatch(fragment, /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]|<\/head>|<\/body>|<\/html>/i)
  assert.doesNotMatch(fragment, cjk)
  assert.equal(existsSync(join(root, output)), false)
  assert.equal(existsSync(join(root, englishOutput)), false)
  assert.equal(existsSync(join(root, llmsOutput)), false)
  assert.throws(() => buildDashboard(root, { lang: 'fr' }), /Unsupported lang/)
  const invalid = cli(root, ['--fragment', target, '--lang', 'fr'])
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /Unsupported lang/)
  assert.equal(read(root, 'out/english-fragment.html'), fragment)
})
scenario('a skill whose heading is its name shows the name once', (root) => {
  write(root, 'skills/math-demo/SKILL.md', skill('math-demo').replace('# Title math-demo', '# math-demo'))
  const rendered = card(buildDashboard(root), 'math-demo')
  assert.match(rendered, /<h3 class="skill-name"><code>math-demo<\/code><\/h3>/)
  assert.equal((rendered.match(/>math-demo</g) || []).length, 1)
})

test('repository English page translates every coverage note and contains no CJK', () => {
  const html = buildDashboard(repo, { lang: 'en' })
  assert.match(html, /<html lang="en">/)
  const families = JSON.parse(read(repo, coveragePath)).families
  const translations = JSON.parse(read(repo, translationsPath)).notes
  assert.deepEqual(Object.keys(translations).sort(), families.map(family => family.id).sort())
  for (const family of families) {
    const translation = translations[family.id]
    assert.doesNotMatch(translation, cjk)
    // Source notes interleave Chinese with technical English fragments and numeric literals.
    const fragments = (family.notes.match(/[A-Za-z][A-Za-z0-9_ .\/\[\]=×<>-]*/g) || []).map(value => value.trim())
    for (const fragment of fragments) assert.ok(translation.includes(fragment), `${family.id}: translation must preserve ${fragment}`)
    assert.deepEqual(translation.match(/\d+/g), family.notes.match(/\d+/g), `${family.id}: translation must preserve all numbers`)
    assert.ok([...html.matchAll(/<td lang="en">([^<]*)<\/td>/g)].some(match => decode(match[1]) === translation), `missing English note for ${family.id}`)
  }
  assert.doesNotMatch(html, cjk)
})
test('repository llms.txt lists the router first and every skill once with its description and raw URL', () => {
  const text = buildLlms(repo, { ref: 'v0.3.1' })
  const names = readdirSync(join(repo, 'skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  const expected = ['using-wagerforge', ...names.filter(name => name !== 'using-wagerforge')]
    .map(name => `- [${name}](${rawUrl}/v0.3.1/skills/${name}/SKILL.md): ${parseFrontmatter(read(repo, `skills/${name}/SKILL.md`)).fm.description}`)
  const lines = text.split('\n').filter(line => line.startsWith('- [') && line.includes(rawUrl))
  assert.deepEqual(lines, expected)
  assert.equal((text.match(/\/SKILL\.md/g) || []).length, names.length)
})
test('all three committed dashboard files are current: regenerate after changing skills, coverage or eval results', () => {
  for (const [lang, path] of [['zh-CN', output], ['en', englishOutput]]) {
    assert.ok(read(repo, path) === buildDashboard(repo, { lang }), `${path} is stale: run node scripts/build-dashboard.mjs`)
  }
  assert.equal(read(repo, llmsOutput), buildLlms(repo), `${llmsOutput} is stale: run node scripts/build-dashboard.mjs`)
})
