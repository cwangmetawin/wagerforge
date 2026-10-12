import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HOOK = fileURLToPath(new URL('./domain-edit-reminder.mjs', import.meta.url))

// Runs the hook like Claude Code does (JSON on stdin) and returns the reminder text, or '' when silent.
function remind(filePath, cwd = '/work/proj') {
  const input = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath } })
  const out = execFileSync('node', [HOOK], { input, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '' } })
  return out ? JSON.parse(out).hookSpecificOutput.additionalContext : ''
}

test('wallet / settlement edits get the money reminder and money skills, not the RNG one', () => {
  for (const p of ['/work/proj/src/wallet.ts', '/work/proj/games/hitShooter/settle.ts', '/work/proj/src/ledgerService.ts']) {
    const msg = remind(p)
    assert.match(msg, /wagerforge:build-durable-settlement/, p)
    assert.match(msg, /wagerforge:build-wallet-and-money/, p)
    assert.doesNotMatch(msg, /wagerforge:fair-rng-core/, p)
  }
})

test('RNG / seed / fairness edits get the fairness reminder', () => {
  for (const p of ['/work/proj/src/RNGService.ts', '/work/proj/lib/seeds.mjs', '/work/proj/games/hitShooter/fairness.ts']) {
    assert.match(remind(p), /wagerforge:fair-rng-core/, p)
  }
})

test('real metawin-slot-server math files get the math reminder (camelCase and digit boundaries split)', () => {
  for (const p of ['/work/proj/games/zeus/rtp96MathConfig.ts', '/work/proj/games/zeus/myRtp94MathConfig.ts', '/work/proj/games/bars/rtp97.ts', '/work/proj/src/paytable.json']) {
    assert.match(remind(p), /wagerforge:math-rtp-modeling/, p)
  }
})

test('outcome logic touches both math and fairness', () => {
  const msg = remind('/work/proj/games/zeus/gameLogic.ts')
  assert.match(msg, /wagerforge:math-rtp-modeling/)
  assert.match(msg, /wagerforge:fair-rng-core/)
})

test('ancestor folders outside the project never classify a file (no substring or parent-dir false positives)', () => {
  // The project itself lives in a folder named "fair-games": only the file's project-relative path counts.
  const msg = remind('/Users/x/fair-games/src/paytable.ts', '/Users/x/fair-games')
  assert.match(msg, /wagerforge:math-rtp-modeling/)
  assert.doesNotMatch(msg, /wagerforge:fair-rng-core/)
  assert.equal(remind('/Users/x/fair-games/src/menu.ts', '/Users/x/fair-games'), '')
})

test('whole-token matching: "affairs", "warnings", "seedling" do not trigger', () => {
  assert.equal(remind('/work/proj/src/affairs/notes.ts'), '')
  assert.equal(remind('/work/proj/src/warnings.ts'), '')
  assert.equal(remind('/work/proj/src/seedling.ts'), '')
})

test('documentation and non-code files stay silent', () => {
  assert.equal(remind('/work/proj/games/zeus/README.md'), '')
  assert.equal(remind('/work/proj/docs/wallet-design.md'), '')
})

test('malformed or empty stdin never crashes and stays silent', () => {
  for (const input of ['', 'not json', '{}', '{"tool_input":{}}']) {
    assert.equal(execFileSync('node', [HOOK], { input, encoding: 'utf8' }), '')
  }
})
