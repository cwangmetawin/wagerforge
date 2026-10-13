import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
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
  results: [
    { case: 'a-case', with: 1, without: 1, delta: 0, arms: { with: { skillsRead: ['fair-verify'], graders: [{ type: 'tool_used', skill: 'fair-verify', pass: true }] } } },
    { case: 'b-case', with: 0.5, without: 0, delta: 0.5, arms: { with: { skillsRead: ['using-wagerforge'], graders: [{ type: 'tool_used', skill: 'fair-verify', pass: false }] } } }
  ]
})

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wf-summary-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'evals', 'results'), { recursive: true })
  return root
}
const write = (root, name, value) => writeFileSync(join(root, 'evals', 'results', name), JSON.stringify(value))
const cli = root => spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' })
const read = root => JSON.parse(readFileSync(join(root, 'evals', 'summary.json'), 'utf8'))

test('single result objects become one-run summaries with exact pass counts and raw scores', () => {
  assert.deepEqual(summarize(claude(), codex()), {
    date: '2026-10-12',
    claude: {
      model: 'sonnet (judge sonnet)', runs: 1, runMeans: [{ with: 0.75, without: 0.5 }],
      cases: [
        { name: 'a-case', with: 0, without: 1, withScores: [0.5], withoutScores: [1] },
        { name: 'b-case', with: 1, without: 0, withScores: [1], withoutScores: [0] }
      ]
    },
    codex: {
      model: 'gpt-6.1-sol, effort max (judge same)', runs: 1, runMeans: [{ with: 0.75, without: 0.5 }],
      cases: [
        { name: 'a-case', with: 1, without: 1, withScores: [1], withoutScores: [1] },
        { name: 'b-case', with: 0, without: 0, withScores: [0.5], withoutScores: [0] }
      ],
      skillReadRates: { any: 1, expected: 0.5 }
    }
  })
})
test('multiple runs preserve run order, count only score 1 and divide reads by case-arm runs', () => {
  const c = [claude(), claude(), claude()], x = [codex(), codex()]
  c[1].cases[0].aggregates = { score: 0, scoreWithout: 0.5 }
  c[1].cases[1].aggregates = { score: 1, scoreWithout: 0 }
  c[2].startedAt = '2026-10-13T00:00:00.000Z'
  c[2].cases[0].aggregates = { score: 1, scoreWithout: 1 }
  c[2].cases[1].aggregates = { score: 1 - Number.EPSILON, scoreWithout: 0.5 }
  x[1].results[0].with = 0
  x[1].results[0].without = 0.5
  x[1].results[1].with = 1
  x[1].results[1].without = 1
  for (const row of x[1].results) {
    row.arms.with.skillsRead = []
    row.arms.with.graders[0].pass = false
  }
  x[1].results.reverse()
  const before = JSON.stringify({ c, x }), result = summarize(c, x)
  assert.equal(JSON.stringify({ c, x }), before)
  assert.equal(result.date, '2026-10-13')
  assert.equal(result.claude.runs, 3)
  assert.deepEqual(result.claude.runMeans, [{ with: 0.75, without: 0.5 }, { with: 0.5, without: 0.25 }, { with: (2 - Number.EPSILON) / 2, without: 0.75 }])
  assert.deepEqual(result.claude.cases[0], { name: 'a-case', with: 1, without: 1, withScores: [0.5, 1, 1 - Number.EPSILON], withoutScores: [1, 0, 0.5] })
  assert.equal(result.claude.cases[1].with, 2)
  assert.equal(result.codex.runs, 2)
  assert.deepEqual(result.codex.runMeans, [{ with: 0.75, without: 0.5 }, { with: 0.5, without: 0.75 }])
  assert.deepEqual(result.codex.skillReadRates, { any: 0.5, expected: 0.25 })
  assert.deepEqual(result.codex.cases[1], { name: 'b-case', with: 1, without: 1, withScores: [0.5, 1], withoutScores: [0, 1] })
})
test('legacy Codex runs retain scores and mark unavailable skill metrics as unknown', () => {
  const x = codex()
  for (const row of x.results) delete row.arms.with.skillsRead
  assert.deepEqual(summarize(claude(), x).codex.skillReadRates, { any: null, expected: 0.5 })
  for (const row of x.results) row.arms = {}
  assert.deepEqual(summarize(claude(), x).codex.skillReadRates, { any: null, expected: null })
})
test('inconsistent Skill read indicators fail before an existing summary is replaced', (t) => {
  const root = fixture(t), output = join(root, 'evals', 'summary.json')
  write(root, 'claude-run-1.json', claude())
  writeFileSync(output, 'keep this summary\n')
  for (const skills of [[], ['using-wagerforge']]) {
    const x = codex()
    x.results[0].arms.with.skillsRead = skills
    assert.throws(() => summarize(claude(), x), /Skill indicator|skillsRead/)
    write(root, 'codex-run-1.json', x)
    assert.equal(cli(root).status, 1)
    assert.equal(readFileSync(output, 'utf8'), 'keep this summary\n')
  }
})

test('malformed result files throw instead of writing a misleading summary', () => {
  const broken = [
    [(c) => { delete c.startedAt }, () => {}],
    [(c) => { c.cases = {} }, () => {}],
    [(c) => { c.cases[0].aggregates.score = '1' }, () => {}],
    [(c) => { c.cases[0].aggregates.scoreWithout = NaN }, () => {}],
    [(c) => { c.cases[1].name = c.cases[0].name }, () => {}],
    [(c) => { c.startedAt = '2026-02-30T12:00:00Z' }, () => {}],
    [(c) => { c.startedAt = '2026-10-12Tgarbage' }, () => {}],
    [(c) => { c.cases[0].aggregates.score = -0.5 }, () => {}],
    [(c) => { c.cases[0].aggregates.score = 1.5 }, () => {}],
    [() => {}, (x) => { x.results = null }],
    [() => {}, (x) => { x.results[0].with = Infinity }],
    [() => {}, (x) => { delete x.options.effort }],
    [() => {}, (x) => { x.results = [] }],
    [() => {}, (x) => { x.results[0].arms.with.skillsRead = 'fair-verify' }],
    [() => {}, (x) => { x.results[0].arms.with.skillsRead = ['bad/name'] }],
    [() => {}, (x) => { x.results[0].arms.with.skillsRead = ['fair-verify', 'fair-verify'] }],
    [() => {}, (x) => { x.results[0].arms.with.graders[0].pass = 'true' }],
    [() => {}, (x) => { x.results[0].arms.with.graders = [] }],
    [() => {}, (x) => { x.results[0].arms = null }]
  ]
  for (const [editClaude, editCodex] of broken) {
    const c = claude()
    const x = codex()
    editClaude(c)
    editCodex(x)
    assert.throws(() => summarize(c, x), TypeError)
  }
})
test('empty runs, inconsistent models and missing cases fail instead of changing denominators', () => {
  assert.throws(() => summarize([], [codex()]), TypeError)
  assert.throws(() => summarize([claude()], []), TypeError)
  for (const edit of [
    c => { c.suite.modelOverride = 'opus' }, c => { c.suite.judgeModel = 'haiku' },
    c => { c.cases.pop() }, c => { c.cases[0].name = 'other-case' }
  ]) {
    const c = claude()
    edit(c)
    assert.throws(() => summarize([claude(), c], [codex()]), /model|cases/)
  }
  for (const edit of [x => { x.options.effort = 'ultra' }, x => { x.results.pop() }]) {
    const x = codex()
    edit(x)
    assert.throws(() => summarize([claude()], [codex(), x]), /model|cases/)
  }
})

test('the CLI reads both files and writes evals/summary.json under the given root', (t) => {
  const root = fixture(t)
  write(root, 'claude.json', claude())
  write(root, 'codex.json', codex())
  const run = cli(root)
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(read(root), summarize(claude(), codex()))
  const missing = cli(join(root, 'nowhere'))
  assert.equal(missing.status, 1)
})
test('CLI selects run files in name order and ignores legacy files when runs exist', (t) => {
  const root = fixture(t), c = claude(), x = codex()
  c.cases[0].aggregates.score = 0
  x.results[0].with = 0
  write(root, 'claude-run-2.json', c)
  write(root, 'claude-run-1.json', claude())
  write(root, 'codex-run-2.json', x)
  write(root, 'codex-run-1.json', codex())
  write(root, 'claude.json', null)
  write(root, 'codex.json', null)
  write(root, 'codex-dry-run.json', { dryRun: true })
  const run = cli(root)
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(read(root), summarize([claude(), c], [codex(), x]))
})
test('CLI requires each agent and falls back independently when that agent has no run files', (t) => {
  const root = fixture(t)
  write(root, 'claude-run-1.json', claude())
  assert.equal(cli(root).status, 1)
  assert.equal(existsSync(join(root, 'evals', 'summary.json')), false)
  write(root, 'codex.json', codex())
  const run = cli(root)
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(read(root), summarize([claude()], [codex()]))
})
test('CLI validates all runs before writing and preserves an existing summary on malformed input', (t) => {
  const root = fixture(t), output = join(root, 'evals', 'summary.json')
  write(root, 'claude-run-1.json', claude())
  write(root, 'codex-run-1.json', codex())
  for (const value of [null, { ...codex(), results: [] }]) {
    write(root, 'codex-run-2.json', value)
    assert.equal(cli(root).status, 1)
    assert.equal(existsSync(output), false)
  }
  writeFileSync(output, 'keep this summary\n')
  writeFileSync(join(root, 'evals', 'results', 'codex-run-2.json'), '{')
  assert.equal(cli(root).status, 1)
  assert.equal(readFileSync(output, 'utf8'), 'keep this summary\n')
  write(root, 'codex-run-2.json', codex())
  write(root, 'claude-run-2.json', { ...claude(), suite: { modelOverride: 'opus', judgeModel: 'sonnet' } })
  assert.equal(cli(root).status, 1)
  assert.equal(readFileSync(output, 'utf8'), 'keep this summary\n')
})
