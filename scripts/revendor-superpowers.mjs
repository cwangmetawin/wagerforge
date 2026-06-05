#!/usr/bin/env node
// Re-vendor superpowers process skills into wagerforge (self-contained, MIT-attributed).
// Usage: node scripts/revendor-superpowers.mjs [UPSTREAM_DIR]
// UPSTREAM_DIR defaults to the installed superpowers 5.1.0 plugin cache.
import { readFileSync, writeFileSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKILLS_DIR = join(ROOT, 'skills')
const DEFAULT_UPSTREAM = '/Users/chaowang/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0'
const UPSTREAM = process.argv[2] || DEFAULT_UPSTREAM
const UPSTREAM_VERSION = '5.1.0'
const COPYRIGHT = 'Copyright (c) 2025 Jesse Vincent'
const UPSTREAM_URL = 'https://github.com/obra/superpowers'

export const VENDORED_SKILLS = [
  'brainstorming', 'dispatching-parallel-agents', 'executing-plans',
  'finishing-a-development-branch', 'receiving-code-review', 'requesting-code-review',
  'subagent-driven-development', 'systematic-debugging', 'test-driven-development',
  'using-git-worktrees', 'using-superpowers', 'verification-before-completion',
  'writing-plans', 'writing-skills',
]

const PROVENANCE = `<!-- Vendored from superpowers v${UPSTREAM_VERSION} — MIT, ${COPYRIGHT}. See /THIRD-PARTY-NOTICES.md. Do not edit process substance; re-vendor via scripts/revendor-superpowers.mjs. -->`

// Pure: rewrite namespace references. Exported for testing.
export function rewriteRefs(text) {
  let out = text
  for (const name of VENDORED_SKILLS) {
    out = out.split(`superpowers:${name}`).join(`wagerforge:${name}`)
  }
  // webapp-testing is NOT vendored (not a superpowers skill) — it is a separate global skill.
  out = out.split('superpowers:webapp-testing').join('webapp-testing')
  // Any remaining wildcard/prose form.
  out = out.split('superpowers:*').join('wagerforge:*')
  return out
}

// Pure: insert the provenance comment immediately after the frontmatter block.
export function addProvenance(md) {
  if (md.includes('Vendored from superpowers')) return md // idempotent
  const m = md.match(/^---\n[\s\S]*?\n---\n/)
  if (!m) return `${PROVENANCE}\n\n${md}`
  return `${m[0]}${PROVENANCE}\n${md.slice(m[0].length)}`
}

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function vendorSkill(name) {
  const src = join(UPSTREAM, 'skills', name)
  const dst = join(SKILLS_DIR, name)
  if (!existsSync(src)) throw new Error(`upstream skill missing: ${src}`)
  rmSync(dst, { recursive: true, force: true })
  cpSync(src, dst, { recursive: true })
  rmSync(join(dst, 'references'), { recursive: true, force: true }) // non-Claude platform docs
  for (const file of walk(dst)) {
    const t = readFileSync(file, 'utf8')
    let r = rewriteRefs(t)
    if (file.endsWith('SKILL.md')) r = addProvenance(r)
    if (r !== t) writeFileSync(file, r)
  }
}

function writeNotices() {
  const license = readFileSync(join(UPSTREAM, 'LICENSE'), 'utf8').trim()
  const body = [
    '# Third-Party Notices', '',
    'wagerforge bundles ("vendors") the generic engineering-process skills from the',
    `**superpowers** plugin (${UPSTREAM_URL}), version ${UPSTREAM_VERSION}, under the MIT license.`, '',
    'Vendored skills (under `skills/`): ' + VENDORED_SKILLS.map((s) => `\`${s}\``).join(', ') + '.', '',
    '## superpowers — MIT License', '', '```', license, '```', '',
  ].join('\n')
  writeFileSync(join(ROOT, 'THIRD-PARTY-NOTICES.md'), body)
}

function main() {
  for (const name of VENDORED_SKILLS) vendorSkill(name)
  writeNotices()
  console.log(`Vendored ${VENDORED_SKILLS.length} skills from ${UPSTREAM} (v${UPSTREAM_VERSION}).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
