#!/usr/bin/env node
// SessionStart: emit the wagerforge bootstrap context. Mode (full|defer) is decided by
// scripts/bootstrap-mode.mjs. Dual-install safe: defers to an enabled superpowers instead of
// double-injecting. Fail-open: any error -> full bootstrap. Output JSON on stdout.
import { readFileSync } from 'node:fs'

function emit(ctx) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ctx },
  }))
}
function readBody() {
  try { return readFileSync(new URL('../skills/using-superpowers/SKILL.md', import.meta.url), 'utf8') } catch { return '' }
}

try {
  const m = await import('../scripts/bootstrap-mode.mjs')
  const mode = m.resolveBootstrapMode(
    process.env.WAGERFORGE_BOOTSTRAP,
    () => m.detectSuperpowers({ settingsPaths: m.defaultSettingsPaths() }),
  )
  emit(m.renderContext(mode, { usingSuperpowersBody: mode === 'full' ? readBody() : '' }))
} catch {
  // Hook-level fail-open. Must NOT depend on the module (the import itself may have failed).
  emit('<EXTREMELY_IMPORTANT>\nYou have superpowers (bundled into wagerforge).\n\n' + readBody() + '\n</EXTREMELY_IMPORTANT>')
}
