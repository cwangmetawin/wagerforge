// Pure decision logic for the SessionStart bootstrap. No I/O except via injected fs fns.
import { readFileSync as fsRead, statSync as fsStat } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const SUPERPOWERS_RE = /^superpowers@/
const SIZE_CAP = 1024 * 1024 // 1 MiB — skip implausibly large settings files

export function defaultSettingsPaths({
  homeDir = homedir(),
  projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd(),
} = {}) {
  return [
    join(homeDir, '.claude', 'settings.json'),          // user (lowest precedence)
    join(projectDir, '.claude', 'settings.json'),       // project
    join(projectDir, '.claude', 'settings.local.json'), // local (highest precedence)
  ]
}

// Read one scope. Returns { state: 'clean', map } | { state: 'missing' } | { state: 'unreadable' }.
function readScope(path, readFileSync, statSync) {
  let st
  try { st = statSync(path) } catch (e) {
    if (e && e.code === 'ENOENT') return { state: 'missing' }
    return { state: 'unreadable' }
  }
  if (!st.isFile || !st.isFile() || st.size > SIZE_CAP) return { state: 'unreadable' }
  let text
  try { text = readFileSync(path, 'utf8') } catch { return { state: 'unreadable' } }
  try {
    const j = JSON.parse(text)
    const ep = j && typeof j === 'object' ? j.enabledPlugins : null
    return { state: 'clean', map: ep && typeof ep === 'object' ? ep : {} }
  } catch { return { state: 'unreadable' } }
}

// Tri-state: 'matched' (superpowers enabled), 'absent' (cleanly not enabled), 'unreadable'
// (some present scope could not be read/parsed AND no clean match found — distinct, never silently 'absent').
export function detectSuperpowers({
  settingsPaths = defaultSettingsPaths(),
  readFileSync = fsRead,
  statSync = fsStat,
} = {}) {
  const merged = {}
  let anyUnreadable = false
  for (const p of settingsPaths) {
    const r = readScope(p, readFileSync, statSync)
    if (r.state === 'clean') Object.assign(merged, r.map) // low->high: later overrides earlier
    else if (r.state === 'unreadable') anyUnreadable = true
    // 'missing' contributes nothing
  }
  const matched = Object.keys(merged).some((k) => SUPERPOWERS_RE.test(k) && merged[k] === true)
  if (matched) return 'matched'
  return anyUnreadable ? 'unreadable' : 'absent'
}

// Mode resolution: env override wins; otherwise only a confirmed 'matched' defers.
export function resolveBootstrapMode(env, detect) {
  if (env === 'force') return 'full'
  if (env === 'off') return 'defer'
  return detect() === 'matched' ? 'defer' : 'full'
}

// Single source of the SessionStart context for both modes (Plugin Law #1).
export const ROUTER_NUDGE =
  'wagerforge is active. For any iGaming / slot / crypto-minigame task, route via the `wagerforge:using-wagerforge` skill first; for that work, `wagerforge:*` skills take routing precedence (the bundled process skills are the domain-tuned copies to prefer).'
export const DISCIPLINE_POINTER =
  'Before acting, check whether a relevant skill applies and invoke it via the Skill tool — even a 1% chance means check.'

export function renderContext(mode, { usingSuperpowersBody = '' } = {}) {
  if (mode === 'defer') return `${DISCIPLINE_POINTER}\n\n${ROUTER_NUDGE}`
  return [
    '<EXTREMELY_IMPORTANT>',
    'You have superpowers (bundled into wagerforge).',
    '',
    "**Below is the full content of your 'wagerforge:using-superpowers' skill — your introduction to using skills. For all other skills, use the 'Skill' tool:**",
    '',
    usingSuperpowersBody,
    '',
    ROUTER_NUDGE,
    '</EXTREMELY_IMPORTANT>',
  ].join('\n')
}
