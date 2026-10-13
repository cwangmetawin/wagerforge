// Proves that Codex CLI loads every wagerforge skill straight from this checkout. Runs in a
// throwaway HOME + CODEX_HOME, so the user's real ~/.codex, auth and personal skills are never
// read, changed or counted. No model call is made (`codex debug prompt-input` only renders context).
import { mkdtempSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))

export function codexAvailable() {
  try { execFileSync('codex', ['--version'], { stdio: 'ignore' }); return true } catch { return false }
}

// Returns { plugin, loaded: Set<skill>, expected: Set<skill> } for the checkout at `repoRoot`.
export function codexLoad(repoRoot = REPO) {
  const market = JSON.parse(readFileSync(join(repoRoot, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const plugin = market.plugins[0].name
  const expected = new Set(readdirSync(join(repoRoot, 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name))
  const home = mkdtempSync(join(tmpdir(), 'wf-codex-'))
  const env = { ...process.env, HOME: home, CODEX_HOME: join(home, '.codex') }
  mkdirSync(env.CODEX_HOME)
  try {
    const run = (args) => execFileSync('codex', args, { env, cwd: home, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 })
    run(['plugin', 'marketplace', 'add', repoRoot])
    run(['plugin', 'add', plugin, '--marketplace', market.name])
    const out = run(['debug', 'prompt-input', 'hi'])
    const loaded = new Set([...out.matchAll(new RegExp(`${plugin}:([a-z0-9-]+)`, 'g'))].map((m) => m[1]))
    return { plugin, loaded, expected }
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!codexAvailable()) { console.log('codex CLI not found: skipped'); process.exit(0) }
  const { plugin, loaded, expected } = codexLoad()
  const missing = [...expected].filter((s) => !loaded.has(s))
  const extra = [...loaded].filter((s) => !expected.has(s))
  console.log(`codex loaded ${loaded.size}/${expected.size} ${plugin} skills`)
  if (missing.length) console.error('missing in Codex: ' + missing.join(', '))
  if (extra.length) console.error('unexpected in Codex: ' + extra.join(', '))
  process.exit(missing.length || extra.length ? 1 : 0)
}
