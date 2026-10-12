import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { summarize } from './summarize.mjs'

const script = fileURLToPath(new URL('./summarize.mjs', import.meta.url))

// Shapes as written by `claude plugin eval --json` and `node evals/run-codex.mjs --json`.
const claude = () => ({
  startedAt: '2026-10-12T16:17:01.731Z',
  suite: { modelOverride: 'sonnet', judgeModel: 'sonnet' },
  cases: [
    { name: 'b-case', aggregates: { score: 1, scoreWithout: 0, delta: 1 } },
    { name: 'a-case', aggregates: { score: 0.5, scoreWithout: 1, delta: -0.5 } }
  ]
})
const codex = () => ({
  options: { model: 'gpt-6.1-sol', effort: 'max' },
  results: [{ case: 'a-case', with: 1, without: 1, delta: 0, arms: {} }]
})

test('both result files become the dashboard summary, sorted by case name', () => {
  assert.deepEqual(summarize(claude(), codex()), {
    date: '2026-10-12',
    claude: { model: 'sonnet (judge sonnet)', cases: [{ name: 'a-case', with: 0.5, without: 1 }, { name: 'b-case', with: 1, without: 0 }] },
    codex: { model: 'gpt-6.1-sol, effort max (judge same)', cases: [{ name: 'a-case', with: 1, without: 1 }] }
  })
})

test('malformed result files throw instead of writing a misleading summary', () => {
  const broken = [
    [(c) => { delete c.startedAt }, () => {}],
    [(c) => { c.cases = {} }, () => {}],
    [(c) => { c.cases[0].aggregates.score = '1' }, () => {}],
    [(c) => { c.cases[0].aggregates.scoreWithout = NaN }, () => {}],
    [(c) => { c.cases[1].name = c.cases[0].name }, () => {}],
    [() => {}, (x) => { x.results = null }],
    [() => {}, (x) => { x.results[0].with = Infinity }],
    [() => {}, (x) => { delete x.options.effort }],
    [() => {}, (x) => { x.results = [] }]
  ]
  for (const [editClaude, editCodex] of broken) {
    const c = claude()
    const x = codex()
    editClaude(c)
    editCodex(x)
    assert.throws(() => summarize(c, x), TypeError)
  }
})

test('the CLI reads both files and writes evals/summary.json under the given root', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wf-summary-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'evals', 'results'), { recursive: true })
  writeFileSync(join(root, 'evals', 'results', 'claude.json'), JSON.stringify(claude()))
  writeFileSync(join(root, 'evals', 'results', 'codex.json'), JSON.stringify(codex()))
  const run = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'evals', 'summary.json'), 'utf8')), summarize(claude(), codex()))
  const missing = spawnSync(process.execPath, [script, '--root', join(root, 'nowhere')], { encoding: 'utf8' })
  assert.equal(missing.status, 1)
})
