#!/usr/bin/env node
// SessionStart: inject the bundled using-superpowers bootstrap (vendored from
// superpowers, MIT) wrapped in <EXTREMELY_IMPORTANT>, plus nudge the
// wagerforge:using-wagerforge router. Output JSON on stdout.
import { readFileSync } from 'node:fs'

let usingSp = ''
try {
  usingSp = readFileSync(new URL('../skills/using-superpowers/SKILL.md', import.meta.url), 'utf8')
} catch {
  usingSp = ''
}

const router = [
  'wagerforge plugin active. For any iGaming / slot / crypto-minigame task, first invoke the `wagerforge:using-wagerforge` skill to route correctly.',
  'wagerforge bundles the generic engineering-process skills (vendored from superpowers, MIT). Invoke them as `wagerforge:<name>` via the Skill tool.',
].join(' ')

const context = usingSp
  ? [
      '<EXTREMELY_IMPORTANT>',
      'You have superpowers (bundled into wagerforge).',
      '',
      "**Below is the full content of your 'wagerforge:using-superpowers' skill — your introduction to using skills. For all other skills, use the 'Skill' tool:**",
      '',
      usingSp,
      '',
      router,
      '</EXTREMELY_IMPORTANT>',
    ].join('\n')
  : router

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
}))
