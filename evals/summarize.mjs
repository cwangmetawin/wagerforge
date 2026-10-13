// Each agent's run files are read in filename order, with its legacy file as a fallback.
//   node evals/summarize.mjs [--root <repo>]
// Validate every run before writing evals/summary.json.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

function fail(message) {
  throw new TypeError(message)
}

const record = (value, label) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : fail(`${label} must be an object`))
const text = (value, label) => (typeof value === 'string' && value.trim().length > 0 ? value : fail(`${label} must be a non-empty string`))
const score = (value, label) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : fail(`${label} must be a score in [0, 1]`))
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length

function cases(items, label, read) {
  if (!Array.isArray(items) || items.length === 0) fail(`${label} must be a non-empty array`)
  const seen = new Set()
  const rows = items.map((item, i) => {
    const row = read(record(item, `${label}[${i}]`), `${label}[${i}]`)
    if (seen.has(row.name)) fail(`${label}: duplicate case ${row.name}`)
    seen.add(row.name)
    return row
  })
  return rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

function claudeRun(value, label) {
  record(value, label)
  const started = text(value.startedAt, `${label}.startedAt`), date = started.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(started) ||
    !Number.isFinite(Date.parse(started)) || new Date(date).toISOString().slice(0, 10) !== date) fail(`${label}.startedAt must be a valid ISO timestamp`)
  const suite = record(value.suite, `${label}.suite`)
  return { date, model: `${text(suite.modelOverride, `${label}.suite.modelOverride`)} (judge ${text(suite.judgeModel, `${label}.suite.judgeModel`)})`,
    cases: cases(value.cases, `${label}.cases`, (item, path) => {
      const aggregates = record(item.aggregates, `${path}.aggregates`)
      return { name: text(item.name, `${path}.name`), with: score(aggregates.score, `${path}.score`), without: score(aggregates.scoreWithout, `${path}.scoreWithout`) }
    }) }
}

function skillIndicators(item, label) {
  // Older runs lack these fields; unknown observations must not become zero reads.
  if (item.arms === undefined) return { any: null, expected: null }
  const arms = record(item.arms, `${label}.arms`), reads = {}
  for (const arm of ['with', 'without']) {
    if (arms[arm] === undefined) continue
    const path = `${label}.arms.${arm}`, value = record(arms[arm], path)
    let any = null, expected = null
    if (value.skillsRead !== undefined) {
      if (!Array.isArray(value.skillsRead) || value.skillsRead.some(skill => typeof skill !== 'string' || !/^[a-z][a-z0-9-]*$/.test(skill)) ||
        new Set(value.skillsRead).size !== value.skillsRead.length) fail(`${path}.skillsRead must be a unique list of skill names`)
      any = value.skillsRead.length > 0
    }
    if (value.graders !== undefined) {
      if (!Array.isArray(value.graders)) fail(`${path}.graders must be an array`)
      const indicators = value.graders.map((grader, i) => record(grader, `${path}.graders[${i}]`)).filter(grader => grader.type === 'tool_used')
      if (indicators.length !== 1 || typeof indicators[0].pass !== 'boolean') fail(`${path}.graders must contain one boolean Skill indicator`)
      expected = indicators[0].pass
      if (expected && value.skillsRead !== undefined && !value.skillsRead.includes(indicators[0].skill)) fail(`${path}.skillsRead must contain the passing Skill indicator`)
    }
    reads[arm] = { any, expected }
  }
  return reads.with ?? { any: null, expected: null }
}

function codexRun(value, label) {
  record(value, label)
  const options = record(value.options, `${label}.options`)
  return { model: `${text(options.model, `${label}.options.model`)}, effort ${text(options.effort, `${label}.options.effort`)} (judge same)`,
    cases: cases(value.results, `${label}.results`, (item, path) => ({
      name: text(item.case, `${path}.case`), with: score(item.with, `${path}.with`), without: score(item.without, `${path}.without`),
      ...skillIndicators(item, path)
    })) }
}

function runs(value, agent, read) {
  const items = Array.isArray(value) ? value : [value]
  if (!items.length) fail(`${agent} runs must be a non-empty array`)
  const parsed = items.map((item, i) => read(item, `${agent} runs[${i}]`)), first = parsed[0]
  for (const run of parsed) {
    if (run.model !== first.model) fail(`${agent} model must match across runs`)
    if (run.cases.length !== first.cases.length || run.cases.some((item, i) => item.name !== first.cases[i].name)) fail(`${agent} cases must match across runs`)
  }
  return parsed
}

function aggregate(runs) {
  return { model: runs[0].model, runs: runs.length,
    runMeans: runs.map(run => ({ with: mean(run.cases.map(item => item.with)), without: mean(run.cases.map(item => item.without)) })),
    cases: runs[0].cases.map((item, i) => {
      const withScores = runs.map(run => run.cases[i].with), withoutScores = runs.map(run => run.cases[i].without)
      return { name: item.name, with: withScores.filter(score => score === 1).length, without: withoutScores.filter(score => score === 1).length, withScores, withoutScores }
    }) }
}

export function summarize(claude, codex) {
  const c = runs(claude, 'claude', claudeRun), x = runs(codex, 'codex', codexRun)
  const observations = x.flatMap(run => run.cases)
  const rate = key => observations.some(item => item[key] === null) ? null : mean(observations.map(item => Number(item[key])))
  return { date: c.map(run => run.date).sort().at(-1), claude: aggregate(c),
    codex: { ...aggregate(x), skillReadRates: { any: rate('any'), expected: rate('expected') } } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    let root = ROOT
    if (args.length === 2 && args[0] === '--root') root = resolve(args[1])
    else if (args.length !== 0) fail('Usage: node evals/summarize.mjs [--root <repo>]')
    const directory = join(root, 'evals', 'results'), files = readdirSync(directory)
    const read = agent => {
      const names = files.filter(name => name.startsWith(agent + '-run-') && name.endsWith('.json')).sort()
      return (names.length ? names : [agent + '.json']).map(name => JSON.parse(readFileSync(join(directory, name), 'utf8')))
    }
    const summary = summarize(read('claude'), read('codex'))
    writeFileSync(join(root, 'evals', 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
    console.log('Wrote evals/summary.json')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
