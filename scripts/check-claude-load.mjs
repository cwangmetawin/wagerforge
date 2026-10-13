// Proves that Claude Code loads every wagerforge skill straight from this checkout: it starts one
// print-mode session with `--plugin-dir` and reads the session's init message, which lists the
// skills and agents the plugin registered. This makes ONE small model call (haiku, one turn).
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))

// Returns { skills, agents, errors } registered by `plugin`, from stream-json output.
export function loadedFromInit(output, plugin) {
  const init = output.split('\n').map((line) => { try { return JSON.parse(line) } catch { return null } })
    .find((message) => message?.type === 'system' && message.subtype === 'init')
  if (!init) throw new Error('no init message in the Claude Code output')
  const own = (names) => new Set((names ?? []).filter((name) => typeof name === 'string' && name.startsWith(`${plugin}:`)).map((name) => name.slice(plugin.length + 1)))
  const errors = (init.plugin_errors ?? []).filter((error) => String(error?.plugin ?? '').startsWith(`${plugin}@`)).map((error) => String(error.message))
  return { skills: own(init.skills), agents: own(init.agents), errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const expected = new Set(readdirSync(join(REPO, 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name))
  const output = execFileSync('claude', ['--plugin-dir', REPO, '-p', '--model', 'haiku', '--output-format', 'stream-json', '--verbose', '--max-turns', '1', 'Reply with exactly OK.'],
    { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000, maxBuffer: 64 << 20 })
  const { skills, agents, errors } = loadedFromInit(output, 'wagerforge')
  const missing = [...expected].filter((s) => !skills.has(s))
  const extra = [...skills].filter((s) => !expected.has(s))
  console.log(`claude loaded ${skills.size}/${expected.size} wagerforge skills and ${agents.size} agents`)
  for (const error of errors) console.error('plugin error: ' + error)
  if (missing.length) console.error('missing in Claude Code: ' + missing.join(', '))
  if (extra.length) console.error('unexpected in Claude Code: ' + extra.join(', '))
  process.exit(missing.length || extra.length || errors.length ? 1 : 0)
}
