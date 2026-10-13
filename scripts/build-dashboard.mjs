import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, stripFences, wordCount } from './validate.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUTPUTS = { 'zh-CN': 'docs/dashboard/index.html', en: 'docs/dashboard/en/index.html' }
const LLMS_OUTPUT = 'docs/dashboard/llms.txt'
const REPOSITORY_URL = 'https://github.com/cwangmetawin/wagerforge'
const COVERAGE = 'docs/coverage/mss-games.json'
const COVERAGE_EN = 'docs/coverage/mss-games.en.json'
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
  // Optional record of the check behind the verdicts: who judged, when, how many families came out full.
  if (value.check !== undefined) {
    const label = `${COVERAGE}.check`
    object(value.check, label)
    date(value.check.date, `${label}.date`)
    for (const key of ['method', 'details']) requireValue(typeof value.check[key] === 'string' && value.check[key].trim() !== '', `${label}.${key} must be a non-empty string`)
    requireValue(value.check.families === value.families.length, `${label}.families must equal the number of families`)
    requireValue(Number.isSafeInteger(value.check.full) && value.check.full >= 0 && value.check.full <= value.check.families, `${label}.full must be a count of families`)
  }
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

function readCoverageTranslations(root, coverage) {
  if (!existsSync(join(root, COVERAGE_EN))) return null
  const value = readJson(root, COVERAGE_EN)
  object(value, COVERAGE_EN)
  object(value.notes, `${COVERAGE_EN}.notes`)
  const ids = new Set(coverage.families.map(family => family.id))
  for (const [id, note] of Object.entries(value.notes)) {
    requireValue(ids.has(id), `${COVERAGE_EN}.notes: unknown family id ${id}`)
    requireValue(typeof note === 'string' && note.trim() !== '', `${COVERAGE_EN}.notes.${id} must be a non-empty string`)
  }
  for (const family of coverage.families) {
    if (dataLang(family.notes) === 'zh-CN') requireValue(Object.hasOwn(value.notes, family.id), `${COVERAGE_EN}.notes: missing translation for family ${family.id}`)
  }
  return value.notes
}

function validateRef(ref) {
  requireValue(typeof ref === 'string' && /^[0-9A-Za-z][0-9A-Za-z._/-]{0,99}$/.test(ref) && ref === ref.trim() && !ref.includes('..'), 'Invalid ref: use 1–100 letters, digits, dots, underscores, slashes or hyphens, starting with a letter or digit; ".." is not allowed')
}

function readPlugin(root) {
  const plugin = readJson(root, '.claude-plugin/plugin.json')
  object(plugin, '.claude-plugin/plugin.json')
  for (const key of ['name', 'version', 'description']) string(plugin[key], `.claude-plugin/plugin.json.${key}`)
  const marketplace = readJson(root, '.claude-plugin/marketplace.json')
  object(marketplace, '.claude-plugin/marketplace.json')
  string(marketplace.name, '.claude-plugin/marketplace.json.name')
  return { plugin, marketplace }
}

// Share the exact pinned commands between both HTML languages and the agent-readable Markdown.
function installCommands(plugin, marketplace, ref) {
  const repository = REPOSITORY_URL.slice('https://github.com/'.length)
  const claudeMarketplace = `plugin marketplace add ${repository}#${ref}`
  const claudeInstall = `plugin install ${plugin.name}@${marketplace.name}`
  return {
    claude: `claude ${claudeMarketplace}\nclaude ${claudeInstall}`,
    claudeSession: `/${claudeMarketplace}\n/${claudeInstall}`,
    codex: `codex plugin marketplace add ${repository} --ref ${ref}\ncodex plugin add ${plugin.name} --marketplace ${marketplace.name}`
  }
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

function validateRunSummary(value, label, agent) {
  requireValue(Number.isSafeInteger(value.runs) && value.runs > 0, `${label}.runs must be a positive integer`)
  requireValue(value.cases.length > 0, `${label}.cases must not be empty`)
  array(value.runMeans, `${label}.runMeans`)
  requireValue(value.runMeans.length === value.runs, `${label}.runMeans must contain one mean per run`)
  const seen = new Set()
  value.cases.forEach((item, i) => {
    const path = `${label}.cases[${i}]`
    requireValue(!seen.has(item.name), `${path}: duplicate case ${item.name}`)
    seen.add(item.name)
    for (const arm of ['with', 'without']) {
      requireValue(Number.isSafeInteger(item[arm]) && item[arm] >= 0 && item[arm] <= value.runs, `${path}.${arm} must be passes out of ${value.runs}`)
      const scores = item[arm + 'Scores']
      array(scores, `${path}.${arm}Scores`)
      requireValue(scores.length === value.runs && scores.every(score => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1), `${path}.${arm}Scores must contain one score in [0, 1] per run`)
      requireValue(item[arm] === scores.filter(score => score === 1).length, `${path}.${arm} must count only score 1`)
    }
  })
  value.runMeans.forEach((item, i) => {
    const path = `${label}.runMeans[${i}]`
    object(item, path)
    for (const arm of ['with', 'without']) {
      requireValue(typeof item[arm] === 'number' && Number.isFinite(item[arm]) && item[arm] >= 0 && item[arm] <= 1, `${path}.${arm} must be a score in [0, 1]`)
      const expected = mean(value.cases.map(row => row[arm + 'Scores'][i]))
      requireValue(Math.abs(item[arm] - expected) <= 1e-12, `${path}.${arm} must match the case scores`)
    }
  })
  if (agent === 'codex') {
    object(value.skillReadRates, `${label}.skillReadRates`)
    for (const key of ['any', 'expected']) {
      const rate = value.skillReadRates[key]
      requireValue(rate === null || (typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 1), `${label}.skillReadRates.${key} must be a share in [0, 1] or null`)
    }
    const { any, expected } = value.skillReadRates
    requireValue(any === null || expected === null || expected <= any, `${label}.skillReadRates.expected cannot exceed any`)
  }
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
    const multi = ['runs', 'runMeans', 'skillReadRates'].some(key => Object.hasOwn(value[agent], key)) ||
      value[agent].cases.some(item => ['withScores', 'withoutScores'].some(key => Object.hasOwn(item, key)))
    if (multi) validateRunSummary(value[agent], label, agent)
  }
  return value
}

// UI text belongs here; English coverage notes come from the optional companion translation file.
const LANGUAGES = {
  'zh-CN': {
    title: '{name} 技能看板',
    headings: { install: '下载与安装', skills: '技能', constraints: '正确性约束', coverage: 'MSS 游戏覆盖', behaviour: '行为测试（装 / 不装技能）' },
    nav: { install: '下载与安装', skills: '技能', constraints: '约束', coverage: '覆盖', behaviour: '行为测试' },
    navLabel: '看板分区', languageLabel: '语言', languageNames: { 'zh-CN': '中文', en: 'English' },
    download: '下载插件 ZIP', source: '源文件', repositorySource: '查看源码',
    installClaude: '安装到 Claude Code', installCodex: '安装到 Codex CLI（0.159+）',
    agentHeading: '给 AI agent', agentInstall: '把本页 URL 发给你的 agent，它会使用下方命令安装固定到 {ref} 的技能。',
    agentInstructions: 'AI agent 安装说明（llms.txt）', installClaudeSession: 'Claude Code 会话内命令',
    coreInsight: '核心要点', words: '词', sections: '章节（{count}）',
    searchLabel: '按名称、触发场景或核心要点搜索', searchPlaceholder: '搜索技能…', searchStatus: '显示 {visible} / {total} 个技能',
    pillars: { router: '路由', math: '数学', fair: '公平', build: '构建', econ: '经济', qa: '质检', comp: '合规' },
    coverage: { full: '完整', partial: '部分', none: '未覆盖' },
    skillCount: '个技能', constraintCount: '条正确性约束', familyCount: '个游戏家族', coveredGameCount: '款游戏有覆盖',
    pillarCountsLabel: '按支柱分的技能数', distributionSeparator: '，',
    constraintsCaption: '设计规范 §7 的 C1–C14', constraintsColumns: ['编号', '流行说法 → 修正结论', '规范绑定的技能', '声明该约束的技能'],
    coverageCaption: '游戏家族', coverageColumns: ['家族', '覆盖', '技能', '游戏', '说明'], games: '{count} 款游戏',
    coverageSource: '来源：{repo} · 提交 {commit} · {date}',
    coverageCheck: '判定：{method} · {date} · 完整 {full}/{families} · 逐条缺口 {details}',
    coverageLegend: '完整：按书面定义（docs/plans/2026-10-12-v0.3.1-backlog.md），家族里每个游戏用到的每个机制（改变钱、RTP、结果分布、状态或结算的规则；配置数值和表现不算）都有技能专门讲到。部分：还有机制没讲到。未覆盖：没有技能讲它的核心模型。',
    evalNotRun: '尚未运行', evalNoCases: '没有用例', evalColon: '：',
    evalRunLine: '共 {runs} 轮 · 跨轮装技能均分 {with} · 不装 {without} · 差值 {delta}',
    evalLine: '装技能均分 {with} · 不装 {without} · 差值 {delta}',
    evalReads: '装技能用例轮次：读取任意 wagerforge 技能 {any} · 读取预期技能 {expected}', evalUnrecorded: '未记录',
    evalMeansCaption: '{agent} 每轮均分', evalCasesCaption: '{agent} — {model}',
    evalMeansColumns: ['轮次', '装技能均分', '不装技能均分', '差值'],
    evalPassColumns: ['用例', '装技能通过次数', '不装技能通过次数', '通过次数差值'],
    evalScoreColumns: ['用例', '装技能', '不装技能', '差值']
  },
  en: {
    title: '{name} Skills dashboard',
    headings: { install: 'Download and install', skills: 'Skills', constraints: 'Correctness constraints', coverage: 'MSS game coverage', behaviour: 'Behaviour evals (with / without skills)' },
    nav: { install: 'Download and install', skills: 'Skills', constraints: 'Constraints', coverage: 'Coverage', behaviour: 'Behaviour evals' },
    navLabel: 'Dashboard sections', languageLabel: 'Language', languageNames: { 'zh-CN': '\u4e2d\u6587', en: 'English' },
    download: 'Download plugin ZIP', source: 'Source', repositorySource: 'View source',
    installClaude: 'Install for Claude Code', installCodex: 'Install for Codex CLI (0.159+)',
    agentHeading: 'For AI agents', agentInstall: "Give this page's URL to your agent; it will install the skills pinned to {ref} using the commands below.",
    agentInstructions: 'AI agent installation instructions (llms.txt)', installClaudeSession: 'In a Claude Code session',
    coreInsight: 'Core insight', words: 'words', sections: 'Sections ({count})',
    searchLabel: 'Search by name, trigger or core insight', searchPlaceholder: 'Search skills…', searchStatus: 'Showing {visible} / {total} skills',
    pillars: { router: 'Routing', math: 'Math', fair: 'Fairness', build: 'Build', econ: 'Economy', qa: 'QA', comp: 'Compliance' },
    coverage: { full: 'full', partial: 'partial', none: 'none' },
    skillCount: 'skills', constraintCount: 'correctness constraints', familyCount: 'game families', coveredGameCount: 'games with coverage',
    pillarCountsLabel: 'Skill counts by pillar', distributionSeparator: ', ',
    constraintsCaption: 'C1–C14 from design spec §7', constraintsColumns: ['ID', 'Folk claim → corrected statement', 'Skills bound by the spec', 'Skills declaring the constraint'],
    coverageCaption: 'Game families', coverageColumns: ['Family', 'Coverage', 'Skills', 'Games', 'Notes'], games: '{count} games',
    coverageSource: 'Source: {repo} · Commit {commit} · {date}',
    coverageCheck: 'Assessment: {method} · {date} · full {full}/{families} · Detailed gaps {details}',
    coverageLegend: 'full: Under the written definition (docs/plans/2026-10-12-v0.3.1-backlog.md), skills specifically teach every mechanism used by every game in the family: rules that change money, RTP, outcome distributions, state or settlement; configuration values and presentation do not count. partial: Some mechanisms are not yet taught. none: No skill teaches the core model.',
    evalNotRun: 'Not run yet', evalNoCases: 'No cases', evalColon: ': ',
    evalRunLine: '{runs} runs · Mean across runs with skills {with} · Without skills {without} · Delta {delta}',
    evalLine: 'Mean with skills {with} · Without skills {without} · Delta {delta}',
    evalReads: 'Case runs with skills: Read any wagerforge skill {any} · Read the expected skill {expected}', evalUnrecorded: 'Unrecorded',
    evalMeansCaption: '{agent} mean per run', evalCasesCaption: '{agent} — {model}',
    evalMeansColumns: ['Run', 'Mean with skills', 'Mean without skills', 'Delta'],
    evalPassColumns: ['Case', 'Passes with skills', 'Passes without skills', 'Pass count delta'],
    evalScoreColumns: ['Case', 'With skills', 'Without skills', 'Delta']
  }
}
const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key])
const dataLang = (value) => /\p{Script=Han}/u.test(value) ? 'zh-CN' : 'en'
const dataText = (value) => `<span lang="${dataLang(value)}">${escape(value)}</span>`
const skillLinks = (names) => [...new Set(names)].sort().map((name) => `<a href="#skill-${escape(name)}" lang="en">${escape(name)}</a>`).join(' · ') || '—'
const list = (items) => `<ul lang="en">${items.map((item) => `<li${dataLang(item) === 'zh-CN' ? ' lang="zh-CN"' : ''}>${escape(item)}</li>`).join('')}</ul>`
const table = (caption, headings, rows, { captionLang, lang } = {}) => `<div class="table-scroll" role="region" aria-label="${escape(caption)}"${captionLang ? ` lang="${captionLang}"` : ''} tabindex="0"><table${lang ? ` lang="${lang}"` : ''}><caption${captionLang ? ` lang="${captionLang}"` : ''}>${escape(caption)}</caption><thead><tr>${headings.map((heading) => `<th scope="col">${escape(heading)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
const badge = (level, t) => `<span class="badge ${escape(level)}">${escape(t.coverage[level])}</span>`
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length
const signed = (value, digits) => `${value > 0 ? '+' : ''}${digits === undefined ? value : value.toFixed(digits)}`

function languageSwitch(lang, t) {
  const links = Object.keys(LANGUAGES).map((language) => {
    const href = language === lang ? 'index.html' : lang === 'zh-CN' ? 'en/index.html' : '../index.html'
    // Character references preserve the native Chinese switch label without CJK in the English UI source.
    const label = lang === 'en' ? escape(t.languageNames[language]).replace(/\p{Script=Han}/gu, (char) => `&#${char.codePointAt(0)};`) : escape(t.languageNames[language])
    return `<a href="${href}" hreflang="${language}" lang="${language}"${language === lang ? ' aria-current="true"' : ''}>${label}</a>`
  }).join('')
  return `<nav class="language-switch" aria-label="${escape(t.languageLabel)}">${links}</nav>`
}

function installSection(plugin, marketplace, ref, instructionsHref, t) {
  const { claude, claudeSession, codex } = installCommands(plugin, marketplace, ref)
  return `<section id="install"><h2>${escape(t.headings.install)}</h2><div class="agent-install"><h3>${escape(t.agentHeading)}</h3><p>${escape(format(t.agentInstall, { ref }))} <a href="${instructionsHref}">${escape(t.agentInstructions)}</a></p><div class="install-commands"><div><h4>${escape(t.installClaude)}</h4><pre><code lang="en">${escape(claude)}</code></pre></div><div><h4>${escape(t.installCodex)}</h4><pre><code lang="en">${escape(codex)}</code></pre></div></div><div><h4>${escape(t.installClaudeSession)}</h4><pre><code lang="en">${escape(claudeSession)}</code></pre></div></div><p class="download-links"><a href="${escape(`${REPOSITORY_URL}/archive/${ref}.zip`)}">${escape(t.download)}</a><a href="${escape(`${REPOSITORY_URL}/tree/${ref}`)}">${escape(t.repositorySource)}</a></p></section>`
}

function skillCard(skill, ref, lang, t) {
  const { name, title, insight, description, constraints, words, sections } = skill
  // Skill headings are their names (the validator enforces it); show a separate name only if they differ.
  const heading = title === name ? `<h3 class="skill-name"><code>${escape(name)}</code></h3>` : `<h3 lang="${dataLang(title)}">${escape(title)}</h3><code lang="en">${escape(name)}</code>`
  return `<article id="skill-${escape(name)}" class="skill-card" data-search="${escape(`${name} ${description} ${insight}`.toLowerCase())}" lang="${dataLang(title)}">${heading}<p class="insight" lang="${dataLang(insight)}"><span class="label" lang="${lang}">${escape(t.coreInsight)}</span> ${escape(insight)}</p><p class="description" lang="${dataLang(description)}">${escape(description)}</p><p class="meta" lang="${lang}">${constraints.map((id) => `<a class="badge" href="#constraint-${escape(id)}">${escape(id)}</a>`).join(' ')} <span>${words} ${escape(t.words)}</span> <a href="${escape(`${REPOSITORY_URL}/blob/${ref}/skills/${name}/SKILL.md`)}">${escape(t.source)}</a></p><details lang="${lang}"><summary>${escape(format(t.sections, { count: sections.length }))}</summary><div lang="en">${list(sections)}</div></details></article>`
}

function skillsSection(skills, ref, lang, t) {
  return `<section id="skills"><h2>${escape(t.headings.skills)}</h2><label for="skill-search">${escape(t.searchLabel)}</label><input id="skill-search" type="search" placeholder="${escape(t.searchPlaceholder)}"><p id="search-status" role="status" aria-live="polite">${escape(format(t.searchStatus, { visible: skills.length, total: skills.length }))}</p>
${PILLARS.map((pillar) => {
    const items = skills.filter((skill) => skill.pillar === pillar)
    return `<section class="pillar-group"><h3 class="pillar-title">${escape(t.pillars[pillar])} <code lang="en">${pillar}</code> <span class="count">${items.length}</span></h3><div class="cards">${items.map((skill) => skillCard(skill, ref, lang, t)).join('\n')}</div></section>`
  }).join('\n')}</section>`
}

function constraintsSection(constraints, skills, t) {
  const rows = constraints.map(({ id, corrected, binds }) => `<tr id="constraint-${escape(id)}"><th scope="row">${escape(id)}</th><td lang="${dataLang(corrected)}">${escape(corrected)}</td><td lang="${dataLang(binds)}">${escape(binds)}</td><td class="bound-skills">${skillLinks(skills.filter((skill) => skill.constraints.includes(id)).map((skill) => skill.name))}</td></tr>`).join('\n')
  return `<section id="constraints"><h2>${escape(t.headings.constraints)}</h2>${table(t.constraintsCaption, t.constraintsColumns, rows)}</section>`
}

function coverageSection(coverage, translations, t) {
  const { source, families } = coverage
  const rows = sorted(families, 'id').map((family) => {
    const notes = translations?.[family.id] ?? family.notes
    return `<tr><th scope="row">${dataText(family.name)}<small lang="en">${escape(family.id)}</small></th><td>${badge(family.coverage, t)}</td><td>${skillLinks(family.skills)}</td><td><details><summary>${escape(format(t.games, { count: family.games.length }))}</summary>${list([...family.games].sort())}</details></td><td lang="${dataLang(notes)}">${escape(notes)}</td></tr>`
  }).join('\n')
  const legend = `<p class="meta">${escape(t.coverageLegend)}</p>`
  const check = coverage.check ? `<p class="meta">${format(t.coverageCheck, { method: dataText(coverage.check.method), date: escape(coverage.check.date), full: coverage.check.full, families: coverage.check.families, details: `<code lang="${dataLang(coverage.check.details)}">${escape(coverage.check.details)}</code>` })}</p>` : ''
  const sourceLine = format(t.coverageSource, { repo: dataText(source.repo), commit: `<code lang="${dataLang(source.commit)}">${escape(source.commit)}</code>`, date: escape(source.date) })
  return `<section id="coverage"><h2>${escape(t.headings.coverage)}</h2><p class="meta">${sourceLine}</p>${check}${legend}${table(t.coverageCaption, t.coverageColumns, rows)}</section>`
}

function runEvals(agent, value, lang, t) {
  const { model, cases, runs, runMeans } = value
  const withMean = mean(runMeans.map(item => item.with)), withoutMean = mean(runMeans.map(item => item.without))
  const line = format(t.evalRunLine, { runs: `<strong>${runs}</strong>`, with: `<strong>${withMean.toFixed(2)}</strong>`, without: `<strong>${withoutMean.toFixed(2)}</strong>`, delta: `<strong>${escape(signed(withMean - withoutMean, 2))}</strong>` })
  const means = runMeans.map((item, i) => `<tr><th scope="row">${i + 1}</th><td>${item.with.toFixed(2)}</td><td>${item.without.toFixed(2)}</td><td>${escape(signed(item.with - item.without, 2))}</td></tr>`).join('\n')
  const rows = sorted(cases, 'name').map(item => `<tr><th scope="row" lang="${dataLang(item.name)}">${escape(item.name)}</th><td>${item.with} / ${runs}</td><td>${item.without} / ${runs}</td><td>${escape(signed(item.with - item.without))}</td></tr>`).join('\n')
  const share = rate => rate === null ? t.evalUnrecorded : (rate * 100).toFixed(1) + '%'
  const reads = agent === 'codex' ? `<p class="meta">${format(t.evalReads, { any: `<strong>${escape(share(value.skillReadRates.any))}</strong>`, expected: `<strong>${escape(share(value.skillReadRates.expected))}</strong>` })}</p>` : ''
  return `<div class="agent"><p class="eval-mean"><code lang="en">${agent}</code> ${dataText(model)}${escape(t.evalColon)}${line}</p>${reads}${table(format(t.evalMeansCaption, { agent }), t.evalMeansColumns, means)}${table(format(t.evalCasesCaption, { agent, model }), t.evalPassColumns, rows, { captionLang: dataLang(model), lang })}</div>`
}

function evalsSection(evals, lang, t) {
  if (!evals) return `<section id="behaviour"><h2>${escape(t.headings.behaviour)}</h2><p>${escape(t.evalNotRun)}</p></section>`
  return `<section id="behaviour"><h2>${escape(t.headings.behaviour)}</h2><p class="meta">${escape(evals.date)}</p>${['claude', 'codex'].map((agent) => {
    if (Object.hasOwn(evals[agent], 'runs')) return runEvals(agent, evals[agent], lang, t)
    const { model, cases } = evals[agent]
    const rows = sorted(cases, 'name').map((item) => `<tr><th scope="row" lang="${dataLang(item.name)}">${escape(item.name)}</th><td>${escape(item.with)}</td><td>${escape(item.without)}</td><td>${escape(signed(item.with - item.without))}</td></tr>`).join('\n')
    const withMean = cases.length ? mean(cases.map((item) => item.with)) : 0
    const withoutMean = cases.length ? mean(cases.map((item) => item.without)) : 0
    const line = cases.length ? format(t.evalLine, { with: `<strong>${withMean.toFixed(2)}</strong>`, without: `<strong>${withoutMean.toFixed(2)}</strong>`, delta: `<strong>${escape(signed(withMean - withoutMean, 2))}</strong>` }) : escape(t.evalNoCases)
    return `<div class="agent"><p class="eval-mean"><code lang="en">${agent}</code> ${dataText(model)}${escape(t.evalColon)}${line}</p>${table(format(t.evalCasesCaption, { agent, model }), t.evalScoreColumns, rows, { captionLang: dataLang(model), lang })}</div>`
  }).join('\n')}</section>`
}

function summary(skills, constraints, coverage, t) {
  const games = new Set(coverage.families.filter((family) => family.coverage !== 'none').flatMap((family) => family.games))
  const levels = ['full', 'partial', 'none'].map((level) => [level, coverage.families.filter((family) => family.coverage === level).length])
  const pillars = PILLARS.map((pillar) => `<li>${escape(t.pillars[pillar])} <code>${pillar}</code> <strong>${skills.filter((skill) => skill.pillar === pillar).length}</strong></li>`).join('')
  const split = levels.map(([level, count]) => `<span class="seg ${level}" style="flex-grow: ${count}"></span>`).join('')
  const legend = levels.map(([level, count]) => `<li>${badge(level, t)} ${count}</li>`).join('')
  return `<ul class="counts"><li><strong>${skills.length}</strong> ${escape(t.skillCount)}</li><li><strong>${constraints.length}</strong> ${escape(t.constraintCount)}</li><li><strong>${coverage.families.length}</strong> ${escape(t.familyCount)}</li><li><strong>${games.size}</strong> ${escape(t.coveredGameCount)}</li></ul>
<ul class="pillars" aria-label="${escape(t.pillarCountsLabel)}">${pillars}</ul>
<div class="split"><div class="dist" role="img" aria-label="${escape(levels.map(([level, count]) => `${t.coverage[level]} ${count}`).join(t.distributionSeparator))}">${split}</div><ul class="legend">${legend}</ul></div>`
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
.language-switch { justify-self: start; gap: 6px }
.language-switch a { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); padding: 6px 12px }
.language-switch a[aria-current="true"] { font-weight: 700; border-color: var(--accent) }
h1, h2, h3, h4, p { margin: 0 }
h1 { font-size: clamp(26px, 4.5vw, 36px); line-height: 1.2; text-wrap: balance }
h1 small { display: inline; font: 500 15px var(--font-mono); color: var(--muted); margin-left: 8px }
.skill-name code { font: 600 15px var(--font-mono); color: var(--text) }
h2 { font-size: 22px; margin-bottom: 14px; text-wrap: balance }
h3, h4 { font-size: 16px; line-height: 1.4 }
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
.agent-install { display: grid; gap: 14px; margin-bottom: 18px }
.download-links { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-bottom: 14px }
.install-commands { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr)); gap: 14px }
.install-commands > div { min-width: 0 }
pre { margin: 8px 0 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); white-space: pre-wrap; overflow-wrap: anywhere }
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

const searchScript = (t) => `
const searchStatus = ${JSON.stringify(t.searchStatus)}
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
  status.textContent = searchStatus.replace('{visible}', visible).replace('{total}', cards.length)
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
export function buildDashboard(root = ROOT, { fragment = false, ref = 'main', lang = 'zh-CN' } = {}) {
  validateRef(ref)
  requireValue(Object.hasOwn(LANGUAGES, lang), 'Unsupported lang: use zh-CN or en')
  const t = LANGUAGES[lang]
  const { plugin, marketplace } = readPlugin(root)
  const skills = readSkills(root)
  const constraints = readConstraints(root)
  const coverage = validateCoverage(readJson(root, COVERAGE), new Set(skills.map((skill) => skill.name)))
  const translations = readCoverageTranslations(root, coverage)
  const evals = readEvals(root)
  const instructionsHref = lang === 'en' ? '../llms.txt' : 'llms.txt'
  const head = `<title>${escape(format(t.title, { name: plugin.name }))}</title><style>${CSS}</style><link rel="alternate" type="text/plain" href="${instructionsHref}" title="Instructions for AI agents">`
  const nav = Object.entries(t.nav).map(([id, label]) => `<a href="#${id}">${escape(label)}</a>`).join('')
  const body = `<main lang="${lang}"><header>${languageSwitch(lang, t)}<h1>${format(t.title, { name: dataText(plugin.name) })} <small>v${escape(plugin.version)}</small></h1><p class="lede" lang="${dataLang(plugin.description)}">${escape(plugin.description)}</p>${summary(skills, constraints, coverage, t)}<nav aria-label="${escape(t.navLabel)}">${nav}</nav></header>
${installSection(plugin, marketplace, ref, instructionsHref, t)}\n${skillsSection(skills, ref, lang, t)}\n${constraintsSection(constraints, skills, t)}\n${coverageSection(coverage, lang === 'en' ? translations : null, t)}\n${evalsSection(evals, lang, t)}</main><script>${searchScript(t)}</script>`
  if (fragment) return `${head}\n${body}\n`
  return `<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head>\n<body>${body}\n</body></html>\n`
}

export function buildLlms(root = ROOT, { ref = 'main' } = {}) {
  validateRef(ref)
  const { plugin, marketplace } = readPlugin(root)
  const { claude, claudeSession, codex } = installCommands(plugin, marketplace, ref)
  const skills = readSkills(root)
  const ordered = [...skills.filter(skill => skill.name === 'using-wagerforge'), ...skills.filter(skill => skill.name !== 'using-wagerforge')]
  const rawRepository = REPOSITORY_URL.replace('https://github.com/', 'https://raw.githubusercontent.com/')
  const oneLine = value => value.replace(/\s*\r?\n\s*/g, ' ')
  return `# ${plugin.name} v${plugin.version}

> ${oneLine(plugin.description)}

These are agent skills for iGaming developers. To give an agent these skills, install the plugin pinned to \`${ref}\`.

## Claude Code

\`\`\`sh
${claude}
\`\`\`

In a Claude Code session, use the equivalent commands:

\`\`\`text
${claudeSession}
\`\`\`

## Codex CLI (0.159+)

\`\`\`sh
${codex}
\`\`\`

## Other agents

Download [the plugin ZIP](${REPOSITORY_URL}/archive/${ref}.zip), or read the skill files below directly. Start with \`using-wagerforge\`, which routes a task to the right skill, then open the skill it names.

## Skills

${ordered.map(skill => `- [${skill.name}](${rawRepository}/${ref}/skills/${skill.name}/SKILL.md): ${oneLine(skill.description)}`).join('\n')}

## Human dashboard

- [Chinese dashboard](index.html)
- [English dashboard](en/index.html)
`
}

if (import.meta.main) {
  try {
    let root = ROOT
    let check = false
    let rootSet = false
    let fragment
    let ref
    let lang
    const usage = 'Usage: node scripts/build-dashboard.mjs [--check | --fragment <file> [--lang en]] [--ref <git ref>] [--root <dir>]'
    const args = process.argv.slice(2)
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--check' && !check) check = true
      else if (args[i] === '--root' && !rootSet && args[i + 1] && !args[i + 1].startsWith('--')) {
        root = resolve(args[++i])
        rootSet = true
      } else if (args[i] === '--fragment' && fragment === undefined && args[i + 1] && !args[i + 1].startsWith('--')) {
        fragment = resolve(args[++i])
      } else if (args[i] === '--ref' && ref === undefined && args[i + 1] !== undefined && !args[i + 1].startsWith('--')) {
        ref = args[++i]
      } else if (args[i] === '--lang' && lang === undefined && args[i + 1] && !args[i + 1].startsWith('--')) {
        lang = args[++i]
      } else throw new Error(usage)
    }
    if ((check && fragment !== undefined) || (lang !== undefined && fragment === undefined)) throw new Error(usage)
    if (fragment !== undefined) {
      const html = buildDashboard(root, { fragment: true, ref, lang })
      mkdirSync(dirname(fragment), { recursive: true })
      writeFileSync(fragment, html)
      console.log(`Generated ${fragment}`)
      process.exit(0)
    }
    const artifacts = [...Object.entries(OUTPUTS).map(([lang, output]) => [output, buildDashboard(root, { ref, lang })]),
      [LLMS_OUTPUT, buildLlms(root, { ref })]]
    for (const [output, content] of artifacts) {
      if (check) {
        requireValue(existsSync(join(root, output)), `${output} is missing; run node scripts/build-dashboard.mjs`)
        requireValue(read(root, output) === content, `${output} differs from a fresh build; run node scripts/build-dashboard.mjs`)
        console.log(`${output} matches a fresh build`)
      } else {
        mkdirSync(dirname(join(root, output)), { recursive: true })
        writeFileSync(join(root, output), content)
        console.log(`Generated ${output}`)
      }
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
