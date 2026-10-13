import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, stripFences, wordCount } from './validate.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUTPUT = 'docs/dashboard/index.html'
const COVERAGE = 'docs/coverage/mss-games.json'
const SPEC = 'docs/specs/2026-06-04-wagerforge-design.md'
const EVALS = 'evals/summary.json'
const PILLARS = ['router', 'math', 'fair', 'build', 'econ', 'qa', 'comp']
const IDS = Array.from({ length: 14 }, (_, i) => `C${i + 1}`)
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
const sorted = (items, key) => [...items].sort((a, b) => compare(a[key], b[key]))

function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}

function object(value, label) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
}

function string(value, label) {
  requireValue(typeof value === 'string', `${label} must be a string`)
}

function array(value, label) {
  requireValue(Array.isArray(value), `${label} must be an array`)
}

function date(value, label) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, `${label} must be a valid YYYY-MM-DD date`)
}

// Unknown bindings must fail instead of making missing teaching coverage look complete.
export function validateCoverage(value, skillNames) {
  object(value, COVERAGE)
  object(value.source, `${COVERAGE}.source`)
  for (const key of ['repo', 'commit']) string(value.source[key], `${COVERAGE}.source.${key}`)
  date(value.source.date, `${COVERAGE}.source.date`)
  array(value.families, `${COVERAGE}.families`)
  const seen = new Set()
  value.families.forEach((family, index) => {
    const label = `${COVERAGE}.families[${index}]`
    object(family, label)
    requireValue(typeof family.id === 'string' && KEBAB.test(family.id), `${label}.id must be kebab-case`)
    requireValue(!seen.has(family.id), `${label}: duplicate family id ${family.id}`)
    seen.add(family.id)
    for (const key of ['name', 'notes']) string(family[key], `${label}.${key}`)
    requireValue(['full', 'partial', 'none'].includes(family.coverage), `${label}.coverage must be full, partial or none`)
    for (const key of ['skills', 'games']) {
      array(family[key], `${label}.${key}`)
      family[key].forEach((item, i) => {
        string(item, `${label}.${key}[${i}]`)
        if (key === 'skills') requireValue(skillNames.has(item), `${label}: unknown skill ${item}`)
      })
    }
  })
  return value
}

function read(root, path) {
  try {
    requireValue(lstatSync(join(root, path)).isFile(), `${path}: expected a regular file`)
    return readFileSync(join(root, path), 'utf8')
  } catch (error) {
    throw new Error(error.code ? `${path}: cannot read file (${error.code})` : error.message)
  }
}

function readJson(root, path) {
  const text = read(root, path)
  try { return JSON.parse(text) } catch { throw new Error(`${path}: invalid JSON`) }
}

function readSkills(root) {
  const entries = readdirSync(join(root, 'skills'), { withFileTypes: true })
  requireValue(!entries.some((entry) => entry.isSymbolicLink()), 'skills/: symlinks are not supported')
  return entries.filter((entry) => entry.isDirectory()).map(({ name }) => {
    const path = `skills/${name}/SKILL.md`
    const parsed = parseFrontmatter(read(root, path))
    requireValue(parsed, `${path}: invalid frontmatter`)
    const { fm } = parsed
    requireValue(typeof fm.name === 'string' && KEBAB.test(fm.name) && fm.name === name, `${path}: name must match its kebab-case folder`)
    string(fm.description, `${path}: description`)
    if (fm.metadata !== undefined) object(fm.metadata, `${path}: metadata`)
    const declared = fm.metadata?.constraints ?? ''
    string(declared, `${path}: metadata.constraints`)
    const constraints = [...new Set(declared.split(/[,\s]+/).filter(Boolean))]
    requireValue(constraints.every((id) => IDS.includes(id)), `${path}: unknown constraint in metadata.constraints`)
    const pillar = name === 'using-wagerforge' ? 'router' : name.split('-')[0]
    requireValue(PILLARS.includes(pillar), `${path}: unknown pillar ${pillar}`)
    const body = stripFences(parsed.body)
    const title = body.match(/^# (\S.*)$/m)?.[1]
    const insight = body.match(/^> \*\*Core insight:\*\* (\S.*)$/m)?.[1]
    requireValue(title && insight, `${path}: missing # Title or Core insight`)
    return { name, pillar, title, insight, description: fm.description, constraints: IDS.filter((id) => constraints.includes(id)),
      words: wordCount(parsed.body), sections: [...body.matchAll(/^## (\S.*)$/gm)].map((match) => match[1]) }
  }).sort((a, b) => compare(a.name, b.name))
}

function readConstraints(root) {
  const text = stripFences(read(root, SPEC).replace(/\r\n/g, '\n'))
  const heading = text.match(/^## 7\. [^\n]*$/m)
  requireValue(heading, `${SPEC}: missing section 7`)
  const section = text.slice(heading.index + heading[0].length).split(/\n## /)[0]
  const rows = section.split('\n').filter((line) => /^\|\s*C\d+\s*\|/.test(line)).map((line) => {
    const cells = line.trim().split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replace(/\\\|/g, '|'))
    requireValue(cells.length === 3 && cells.every(Boolean), `${SPEC}: invalid C1–C14 table row`)
    return { id: cells[0], corrected: cells[1], binds: cells[2] }
  })
  requireValue(rows.length === 14 && IDS.every((id) => rows.filter((row) => row.id === id).length === 1), `${SPEC}: expected C1–C14 exactly once`)
  return IDS.map((id) => rows.find((row) => row.id === id))
}

function readEvals(root) {
  if (!existsSync(join(root, EVALS))) return null
  const value = readJson(root, EVALS)
  object(value, EVALS)
  date(value.date, `${EVALS}.date`)
  for (const agent of ['claude', 'codex']) {
    const label = `${EVALS}.${agent}`
    object(value[agent], label)
    string(value[agent].model, `${label}.model`)
    array(value[agent].cases, `${label}.cases`)
    value[agent].cases.forEach((item, i) => {
      const path = `${label}.cases[${i}]`
      object(item, path)
      string(item.name, `${path}.name`)
      for (const key of ['with', 'without']) requireValue(typeof item[key] === 'number' && Number.isFinite(item[key]), `${path}.${key} must be a finite number`)
      requireValue(Number.isFinite(item.with - item.without), `${path}.delta must be finite`)
    })
  }
  return value
}

const PILLAR_LABELS = { router: '路由', math: '数学', fair: '公平', build: '构建', econ: '经济', qa: '质检', comp: '合规' }
const COVERAGE_LABELS = { full: '完整', partial: '部分', none: '未覆盖' }
const skillLinks = (names) => [...new Set(names)].sort().map((name) => `<a href="#skill-${escape(name)}">${escape(name)}</a>`).join(' · ') || '—'
const list = (items) => `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`
const table = (caption, headings, rows) => `<div class="table-scroll" role="region" aria-label="${escape(caption)}" tabindex="0"><table><caption>${escape(caption)}</caption><thead><tr>${headings.map((heading) => `<th scope="col">${escape(heading)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
const badge = (level) => `<span class="badge ${escape(level)}">${COVERAGE_LABELS[level]}</span>`
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length
const signed = (value, digits) => `${value > 0 ? '+' : ''}${digits === undefined ? value : value.toFixed(digits)}`

function skillCard(skill) {
  const { name, title, insight, description, constraints, words, sections } = skill
  // Skill headings are their names (the validator enforces it); show a separate name only if they differ.
  const heading = title === name ? `<h3 class="skill-name"><code>${escape(name)}</code></h3>` : `<h3 lang="en">${escape(title)}</h3><code>${escape(name)}</code>`
  return `<article id="skill-${escape(name)}" class="skill-card" data-search="${escape(`${name} ${description} ${insight}`.toLowerCase())}">${heading}<p class="insight" lang="en"><span class="label" lang="zh-CN">核心要点</span> ${escape(insight)}</p><p class="description" lang="en">${escape(description)}</p><p class="meta">${constraints.map((id) => `<a class="badge" href="#constraint-${escape(id)}">${escape(id)}</a>`).join(' ')} <span>${words} 词</span></p><details><summary>章节（${sections.length}）</summary><div lang="en">${list(sections)}</div></details></article>`
}

function skillsSection(skills) {
  return `<section id="skills"><h2>技能</h2><label for="skill-search">按名称、触发场景或核心要点搜索</label><input id="skill-search" type="search" placeholder="搜索技能…"><p id="search-status" role="status" aria-live="polite">显示 ${skills.length} / ${skills.length} 个技能</p>
${PILLARS.map((pillar) => {
    const items = skills.filter((skill) => skill.pillar === pillar)
    return `<section class="pillar-group"><h3 class="pillar-title">${PILLAR_LABELS[pillar]} <code>${pillar}</code> <span class="count">${items.length}</span></h3><div class="cards">${items.map(skillCard).join('\n')}</div></section>`
  }).join('\n')}</section>`
}

function constraintsSection(constraints, skills) {
  const rows = constraints.map(({ id, corrected, binds }) => `<tr id="constraint-${escape(id)}"><th scope="row">${escape(id)}</th><td lang="en">${escape(corrected)}</td><td lang="en">${escape(binds)}</td><td class="bound-skills">${skillLinks(skills.filter((skill) => skill.constraints.includes(id)).map((skill) => skill.name))}</td></tr>`).join('\n')
  return `<section id="constraints"><h2>正确性约束</h2>${table('设计规范 §7 的 C1–C14', ['编号', '流行说法 → 修正结论', '规范绑定的技能', '声明该约束的技能'], rows)}</section>`
}

function coverageSection(coverage) {
  const { source, families } = coverage
  const rows = sorted(families, 'id').map((family) => `<tr><th scope="row"><span lang="en">${escape(family.name)}</span><small>${escape(family.id)}</small></th><td>${badge(family.coverage)}</td><td>${skillLinks(family.skills)}</td><td><details><summary>${family.games.length} 款游戏</summary>${list([...family.games].sort())}</details></td><td>${escape(family.notes)}</td></tr>`).join('\n')
  const legend = '<p class="meta">完整：该家族列出的每个机制都有技能专门讲到。部分：核心机制已覆盖，个别游戏的特定玩法尚未专门讲。未覆盖：没有技能讲它的核心模型。</p>'
  return `<section id="coverage"><h2>MSS 游戏覆盖</h2><p class="meta">来源：${escape(source.repo)} · 提交 <code>${escape(source.commit)}</code> · ${escape(source.date)}</p>${legend}${table('游戏家族', ['家族', '覆盖', '技能', '游戏', '说明'], rows)}</section>`
}

function evalsSection(evals) {
  if (!evals) return '<section id="behaviour"><h2>行为测试（装 / 不装技能）</h2><p>尚未运行</p></section>'
  return `<section id="behaviour"><h2>行为测试（装 / 不装技能）</h2><p class="meta">${escape(evals.date)}</p>${['claude', 'codex'].map((agent) => {
    const { model, cases } = evals[agent]
    const rows = sorted(cases, 'name').map((item) => `<tr><th scope="row">${escape(item.name)}</th><td>${escape(item.with)}</td><td>${escape(item.without)}</td><td>${escape(signed(item.with - item.without))}</td></tr>`).join('\n')
    const withMean = cases.length ? mean(cases.map((item) => item.with)) : 0
    const withoutMean = cases.length ? mean(cases.map((item) => item.without)) : 0
    const line = cases.length ? `装技能均分 <strong>${withMean.toFixed(2)}</strong> · 不装 <strong>${withoutMean.toFixed(2)}</strong> · 差值 <strong>${escape(signed(withMean - withoutMean, 2))}</strong>` : '没有用例'
    return `<div class="agent"><p class="eval-mean"><code>${agent}</code> ${escape(model)}：${line}</p>${table(`${agent} — ${model}`, ['用例', '装技能', '不装技能', '差值'], rows)}</div>`
  }).join('\n')}</section>`
}

function summary(skills, constraints, coverage) {
  const games = new Set(coverage.families.filter((family) => family.coverage !== 'none').flatMap((family) => family.games))
  const levels = ['full', 'partial', 'none'].map((level) => [level, coverage.families.filter((family) => family.coverage === level).length])
  const pillars = PILLARS.map((pillar) => `<li>${PILLAR_LABELS[pillar]} <code>${pillar}</code> <strong>${skills.filter((skill) => skill.pillar === pillar).length}</strong></li>`).join('')
  const split = levels.map(([level, count]) => `<span class="seg ${level}" style="flex-grow: ${count}"></span>`).join('')
  const legend = levels.map(([level, count]) => `<li>${badge(level)} ${count}</li>`).join('')
  return `<ul class="counts"><li><strong>${skills.length}</strong> 个技能</li><li><strong>${constraints.length}</strong> 条正确性约束</li><li><strong>${coverage.families.length}</strong> 个游戏家族</li><li><strong>${games.size}</strong> 款游戏有覆盖</li></ul>
<ul class="pillars" aria-label="按支柱分的技能数">${pillars}</ul>
<div class="split"><div class="dist" role="img" aria-label="${levels.map(([level, count]) => `${COVERAGE_LABELS[level]} ${count}`).join('，')}">${split}</div><ul class="legend">${legend}</ul></div>`
}

const LIGHT = '--bg: #f3f5f8; --surface: #ffffff; --text: #19222d; --muted: #566475; --line: #d6dde6; --accent: #22507a; --full: #1d7348; --full-bg: #e1f2e8; --partial: #8f5b00; --partial-bg: #fbeed5; --none: #a23a2f; --none-bg: #f8e2de'
const DARK = '--bg: #0f141b; --surface: #17202b; --text: #e3e9f1; --muted: #a3b0c0; --line: #2c3947; --accent: #92bbea; --full: #84d4a8; --full-bg: #16362a; --partial: #efc274; --partial-bg: #3b2c12; --none: #f2a496; --none-bg: #40211c'

const CSS = `
/* Layout: one reading column, summary before detail: counts, pillars and the MSS coverage split up top, then the catalogue. System font stacks keep the page offline and self-contained. */
:root { ${LIGHT}; --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Segoe UI", system-ui, sans-serif; --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; color-scheme: light }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${DARK}; color-scheme: dark } }
:root[data-theme="dark"] { ${DARK}; color-scheme: dark }
* { box-sizing: border-box }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.65 var(--font-ui); overflow-wrap: anywhere }
main { max-width: 1180px; margin: 0 auto; padding-inline: max(16px, 4vw); padding-block: clamp(20px, 4vw, 44px); min-width: 0 }
header { display: grid; gap: 14px; border-bottom: 1px solid var(--line); padding-bottom: 24px }
h1, h2, h3, p { margin: 0 }
h1 { font-size: clamp(26px, 4.5vw, 36px); line-height: 1.2; text-wrap: balance }
h1 small { display: inline; font: 500 15px var(--font-mono); color: var(--muted); margin-left: 8px }
.skill-name code { font: 600 15px var(--font-mono); color: var(--text) }
h2 { font-size: 22px; margin-bottom: 14px; text-wrap: balance }
h3 { font-size: 16px; line-height: 1.4 }
code, small, .meta, #search-status { color: var(--muted) }
code { font: 13px var(--font-mono) }
small { display: block; font-family: var(--font-mono) }
a { color: var(--accent); text-underline-offset: 3px }
a:focus-visible, input:focus-visible, summary:focus-visible, .table-scroll:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px }
ul.counts, ul.pillars, ul.legend, nav { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding: 0; list-style: none }
.counts strong { font-size: 20px; font-variant-numeric: tabular-nums }
.pillars li { border: 1px solid var(--line); border-radius: 6px; padding: 2px 10px; background: var(--surface) }
.pillars strong, .count { font-variant-numeric: tabular-nums }
.split { display: grid; gap: 8px; max-width: 560px }
.dist { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--line) }
.seg.full { background: var(--full) } .seg.partial { background: var(--partial) } .seg.none { background: var(--none) }
.lede { color: var(--muted); max-width: 70ch }
section { margin-top: 36px; min-width: 0 }
label { display: block; margin-bottom: 6px }
input { width: 100%; background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 11px 12px; font: inherit }
#search-status { margin: 8px 0 0 }
.pillar-group { margin-top: 24px }
.pillar-title { display: flex; gap: 8px; align-items: baseline; margin-bottom: 12px }
.pillar-title .count { color: var(--muted) }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 14px }
.skill-card { display: grid; gap: 8px; align-content: start; min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; scroll-margin-top: 16px }
.insight { border-left: 3px solid var(--accent); padding-left: 10px }
.label { display: block; font-size: 12px; letter-spacing: 0.06em; color: var(--muted) }
.description { color: var(--muted); font-size: 14px }
.badge { display: inline-block; font-size: 13px; border: 1px solid var(--line); border-radius: 999px; padding: 0 9px; white-space: nowrap }
.badge.full { color: var(--full); background: var(--full-bg); border-color: transparent }
.badge.partial { color: var(--partial); background: var(--partial-bg); border-color: transparent }
.badge.none { color: var(--none); background: var(--none-bg); border-color: transparent }
.eval-mean { margin: 18px 0 10px; font-variant-numeric: tabular-nums }
.table-scroll { max-width: 100%; min-width: 0; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--surface) }
table { border-collapse: collapse; width: 100%; min-width: 640px; font-variant-numeric: tabular-nums }
caption { text-align: left; padding: 12px 14px; font-weight: 600 }
th, td { text-align: left; vertical-align: top; border-top: 1px solid var(--line); padding: 10px 14px; min-width: 80px }
th { font-weight: 600 }
summary { cursor: pointer }
ul { padding-left: 20px }
[hidden] { display: none !important }
@media (max-width: 600px) { .cards { grid-template-columns: minmax(0, 1fr) } .skill-card { padding: 14px } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important } }
`

const JS = `
const search = document.getElementById('skill-search')
const cards = [...document.querySelectorAll('.skill-card')]
const groups = [...document.querySelectorAll('.pillar-group')]
const status = document.getElementById('search-status')
function filter() {
  const query = search.value.trim().toLowerCase()
  let visible = 0
  for (const card of cards) {
    card.hidden = !card.dataset.search.includes(query)
    if (!card.hidden) visible++
  }
  for (const group of groups) group.hidden = ![...group.querySelectorAll('.skill-card')].some((card) => !card.hidden)
  status.textContent = '显示 ' + visible + ' / ' + cards.length + ' 个技能'
}
search.addEventListener('input', filter)
document.addEventListener('click', (event) => {
  if (event.target.closest('a[href^="#skill-"]')) {
    search.value = ''
    filter()
  }
})
filter()
`

// Build in memory first: invalid input never replaces a previously generated page. The fragment is
// the same page without the document wrapper, for hosts that supply their own (a claude.ai artifact).
export function buildDashboard(root = ROOT, { fragment = false } = {}) {
  const plugin = readJson(root, '.claude-plugin/plugin.json')
  object(plugin, '.claude-plugin/plugin.json')
  for (const key of ['name', 'version', 'description']) string(plugin[key], `.claude-plugin/plugin.json.${key}`)
  const skills = readSkills(root)
  const constraints = readConstraints(root)
  const coverage = validateCoverage(readJson(root, COVERAGE), new Set(skills.map((skill) => skill.name)))
  const evals = readEvals(root)
  const head = `<title>${escape(plugin.name)} 技能看板</title><style>${CSS}</style>`
  const body = `<main lang="zh-CN"><header><h1>${escape(plugin.name)} 技能看板 <small>v${escape(plugin.version)}</small></h1><p class="lede" lang="en">${escape(plugin.description)}</p>${summary(skills, constraints, coverage)}<nav aria-label="看板分区"><a href="#skills">技能</a><a href="#constraints">约束</a><a href="#coverage">覆盖</a><a href="#behaviour">行为测试</a></nav></header>
${skillsSection(skills)}\n${constraintsSection(constraints, skills)}\n${coverageSection(coverage)}\n${evalsSection(evals)}</main><script>${JS}</script>`
  if (fragment) return `${head}\n${body}\n`
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head>\n<body>${body}\n</body></html>\n`
}

if (import.meta.main) {
  try {
    let root = ROOT
    let check = false
    let rootSet = false
    let fragment
    const usage = 'Usage: node scripts/build-dashboard.mjs [--check | --fragment <file>] [--root <dir>]'
    const args = process.argv.slice(2)
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--check' && !check) check = true
      else if (args[i] === '--root' && !rootSet && args[i + 1] && !args[i + 1].startsWith('--')) {
        root = resolve(args[++i])
        rootSet = true
      } else if (args[i] === '--fragment' && fragment === undefined && args[i + 1] && !args[i + 1].startsWith('--')) {
        fragment = resolve(args[++i])
      } else throw new Error(usage)
    }
    if (check && fragment !== undefined) throw new Error(usage)
    if (fragment !== undefined) {
      const html = buildDashboard(root, { fragment: true })
      mkdirSync(dirname(fragment), { recursive: true })
      writeFileSync(fragment, html)
      console.log(`Generated ${fragment}`)
      process.exit(0)
    }
    const html = buildDashboard(root)
    if (check) {
      requireValue(existsSync(join(root, OUTPUT)), `${OUTPUT} is missing; run node scripts/build-dashboard.mjs`)
      requireValue(read(root, OUTPUT) === html, `${OUTPUT} differs from a fresh build; run node scripts/build-dashboard.mjs`)
      console.log(`${OUTPUT} matches a fresh build`)
    } else {
      mkdirSync(dirname(join(root, OUTPUT)), { recursive: true })
      writeFileSync(join(root, OUTPUT), html)
      console.log(`Generated ${OUTPUT}`)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
