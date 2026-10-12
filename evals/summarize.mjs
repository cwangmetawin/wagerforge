// Turns the two eval result files into evals/summary.json, the dashboard's behaviour-test input:
// one score per case and arm (with / without the skills) for Claude and for Codex.
//   node evals/summarize.mjs [--root <repo>]
// reads evals/results/claude.json (claude plugin eval --json) and evals/results/codex.json
// (node evals/run-codex.mjs --json). A malformed file throws: no partial summary is written.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

function fail(message) {
  throw new TypeError(message)
}

const record = (value, label) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : fail(`${label} must be an object`))
const text = (value, label) => (typeof value === 'string' && value.length > 0 ? value : fail(`${label} must be a non-empty string`))
const score = (value, label) => (typeof value === 'number' && Number.isFinite(value) ? value : fail(`${label} must be a finite number`))

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

export function summarize(claude, codex) {
  record(claude, 'claude results')
  record(codex, 'codex results')
  const started = text(claude.startedAt, 'claude startedAt')
  if (!/^\d{4}-\d{2}-\d{2}T/.test(started)) fail('claude startedAt must be an ISO timestamp')
  const suite = record(claude.suite, 'claude suite')
  const options = record(codex.options, 'codex options')
  return {
    date: started.slice(0, 10),
    claude: {
      model: `${text(suite.modelOverride, 'claude suite.modelOverride')} (judge ${text(suite.judgeModel, 'claude suite.judgeModel')})`,
      cases: cases(claude.cases, 'claude cases', (item, label) => {
        const aggregates = record(item.aggregates, `${label}.aggregates`)
        return { name: text(item.name, `${label}.name`), with: score(aggregates.score, `${label}.score`), without: score(aggregates.scoreWithout, `${label}.scoreWithout`) }
      })
    },
    codex: {
      model: `${text(options.model, 'codex options.model')}, effort ${text(options.effort, 'codex options.effort')} (judge same)`,
      cases: cases(codex.results, 'codex results', (item, label) => ({
        name: text(item.case, `${label}.case`), with: score(item.with, `${label}.with`), without: score(item.without, `${label}.without`)
      }))
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    let root = ROOT
    if (args.length === 2 && args[0] === '--root') root = resolve(args[1])
    else if (args.length !== 0) fail('Usage: node evals/summarize.mjs [--root <repo>]')
    const read = (name) => JSON.parse(readFileSync(join(root, 'evals', 'results', name), 'utf8'))
    const summary = summarize(read('claude.json'), read('codex.json'))
    writeFileSync(join(root, 'evals', 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
    console.log('Wrote evals/summary.json')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
