import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const WHEN_TRIGGER_RE = /\buse (when|during|before|after|this)\b/i
const CONSTRAINT_TAG_RE = /\[(C\d{1,2})\]/g
const KNOWN_CONSTRAINTS = new Set(Array.from({ length: 14 }, (_, i) => `C${i + 1}`))
// Spec section 7 key phrases required anywhere in the body for metadata-declared constraints.
const CONSTRAINT_KEY_PHRASES = new Map([
  ['C5', ['624']],
  ['C10', ['unified memory']],
  ['C12', ['800-90']],
])
const CORRECTNESS_HEADING_RE = /^#{1,6}\s*correctness constraints\b/im
const CORE_INSIGHT_RE = /^> \*\*Core insight:\*\* \S/
// Skill references: the namespaced form anywhere, and a bare pillar-prefixed name in backticks.
const NS_REF_RE = /wagerforge:([a-z0-9-]+)/g
const BARE_REF_RE = /`((?:math|fair|build|econ|qa|comp)-[a-z0-9-]+|using-wagerforge)`/g
// superpowers was removed in 0.3.0; any reference to it is now a dangling dependency.
const RESIDUAL_NS_RE = /superpowers:/
// Portable SKILL.md frontmatter: the Agent Skills keys that both Claude Code and Codex accept.
// Project-specific data (our `constraints`) lives under `metadata:`.
const ALLOWED_FM_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'])
// Budget raised 500→540 (2026-06-22): every domain skill carries a mandated one-line
// `> **Core insight:**` (~35 words); 540 = prior 500 + that allowance. Hard cap unchanged.
const WORD_BUDGET = 540
const WORD_HARD_CAP = 800

const unquote = (v) => ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")) ? v.slice(1, -1) : v)

// Minimal frontmatter reader (not a YAML parser): scalar `key: value` lines plus ONE level of
// nested map for `metadata:`. Delimiters must be whole `---` lines. Returns null when malformed.
export function parseFrontmatter(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  if (lines[0] !== '---') return null
  const end = lines.indexOf('---', 1)
  if (end === -1) return null
  const fm = {}
  let mapKey = null
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || /^\s*#/.test(line)) continue
    const nested = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/)
    if (nested && mapKey) { fm[mapKey][nested[1]] = unquote(nested[2].trim()); continue }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) return null
    const value = m[2].trim()
    if (value === '') { fm[m[1]] = {}; mapKey = m[1] } else { fm[m[1]] = unquote(value); mapKey = null }
  }
  return { fm, body: lines.slice(end + 1).join('\n') }
}

export function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length
}

// Blank out fenced code blocks so headings, tags and the insight line inside examples never count.
export function stripFences(body) {
  let fence = null
  return body.split('\n').map((line) => {
    const m = line.match(/^\s*(`{3,}|~{3,})/)
    if (m && (!fence || m[1][0] === fence)) { fence = fence ? null : m[1][0]; return '' }
    return fence ? '' : line
  }).join('\n')
}

// Text of the "Correctness constraints" section (heading excluded), or null if absent.
export function correctnessSection(body) {
  const h = body.match(CORRECTNESS_HEADING_RE)
  if (!h) return null
  const rest = body.slice(body.indexOf(h[0]) + h[0].length)
  const next = rest.search(/\n#{1,6}\s/)
  return next === -1 ? rest : rest.slice(0, next)
}

const listDir = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [])

function checkFrontmatterKeys(tag, fm, errors) {
  for (const k of Object.keys(fm)) {
    if (!ALLOWED_FM_KEYS.has(k)) errors.push(`${tag} frontmatter key "${k}" is not portable (allowed: ${[...ALLOWED_FM_KEYS].join(', ')}; put project data under metadata:)`)
  }
  for (const k of ['name', 'description']) {
    if (fm[k] !== undefined && typeof fm[k] !== 'string') errors.push(`${tag} frontmatter ${k} must be a one-line string`)
    else if (fm[k] === '>' || fm[k] === '|') errors.push(`${tag} frontmatter ${k} must be on one line (no YAML block scalar)`)
  }
  if (fm.metadata !== undefined && (typeof fm.metadata !== 'object' || fm.metadata === null)) errors.push(`${tag} metadata must be a map`)
}

function checkConstraints(tag, fm, body, errors, warnings) {
  const declared = String(fm.metadata?.constraints || '').split(/[,\s]+/).filter(Boolean)
  const lowerBody = body.toLowerCase()
  for (const c of new Set(declared)) {
    for (const phrase of CONSTRAINT_KEY_PHRASES.get(c) ?? []) {
      if (!lowerBody.includes(phrase)) errors.push(`${tag} constraint ${c} missing required phrase "${phrase}"`)
    }
  }
  body = stripFences(body)
  const tagged = [...body.matchAll(CONSTRAINT_TAG_RE)].map((m) => m[1])
  const ids = [...new Set([...declared, ...tagged])]
  for (const c of ids) if (!KNOWN_CONSTRAINTS.has(c)) errors.push(`${tag} unknown correctness constraint ${c} (known: C1..C14)`)
  if (!ids.length) return
  const section = correctnessSection(body)
  if (section === null) return void errors.push(`${tag} declares constraints ${ids.join(',')} but has no "Correctness constraints" section`)
  if (section.replace(/<!--[\s\S]*?-->/g, '').trim().length < 20) return void errors.push(`${tag} "Correctness constraints" section is empty/placeholder`)
  for (const c of ids) {
    if (!new RegExp(`\\b${c}\\b`).test(section)) warnings.push(`${tag} constraint ${c} not referenced in its Correctness constraints section`)
  }
}

function checkSkill(skillsDir, dir, known, secrets, errors, warnings) {
  const tag = `[${dir}]`
  const skillPath = join(skillsDir, dir, 'SKILL.md')
  if (!existsSync(skillPath)) return void errors.push(`${tag} missing SKILL.md`)
  const text = readFileSync(skillPath, 'utf8')
  const parsed = parseFrontmatter(text)
  if (!parsed) return void errors.push(`${tag} missing/invalid frontmatter`)
  const { fm } = parsed
  const body = stripFences(parsed.body)
  checkFrontmatterKeys(tag, fm, errors)
  if (!fm.name) errors.push(`${tag} frontmatter missing name`)
  else {
    if (!SKILL_NAME_RE.test(fm.name)) errors.push(`${tag} name not hyphen-case: ${fm.name}`)
    if (fm.name !== dir) errors.push(`${tag} name "${fm.name}" != folder "${dir}"`)
  }
  if (!fm.description) errors.push(`${tag} frontmatter missing description`)
  else if (typeof fm.description === 'string') {
    if (fm.description.length > 1024) errors.push(`${tag} description > 1024 chars`)
    if (!WHEN_TRIGGER_RE.test(fm.description)) warnings.push(`${tag} description not trigger-shaped (no "Use when…")`)
  }
  const h1 = body.match(/^# \S.*$/m)
  if (!h1) errors.push(`${tag} body has no "# Title" heading`)
  else {
    // One convention for every skill: the heading is the name, as the catalogue and router show it.
    const title = h1[0].slice(2).trim()
    if (fm.name && title !== fm.name) errors.push(`${tag} title "${title}" must be the skill name "${fm.name}"`)
    const after = body.slice(body.indexOf(h1[0]) + h1[0].length).split('\n').find((l) => l.trim())
    if (!after || !CORE_INSIGHT_RE.test(after)) errors.push(`${tag} first line after the title must be "> **Core insight:** …"`)
  }
  const wc = wordCount(parsed.body)
  if (wc > WORD_HARD_CAP) errors.push(`${tag} body ${wc} words > hard cap ${WORD_HARD_CAP}`)
  else if (wc > WORD_BUDGET) warnings.push(`${tag} body ${wc} words > budget ${WORD_BUDGET}`)
  checkConstraints(tag, fm, parsed.body, errors, warnings)
  checkText(tag, text, known, errors, secrets)
}

// Cross-file text rules shared by skills, commands, agents, hooks and top-level docs.
function checkText(tag, text, known, errors, secrets = []) {
  if (RESIDUAL_NS_RE.test(text)) errors.push(`${tag} references "superpowers:" — superpowers was removed in 0.3.0`)
  for (const m of text.matchAll(NS_REF_RE)) if (!known.has(m[1])) errors.push(`${tag} dangling reference wagerforge:${m[1]}`)
  for (const m of text.matchAll(BARE_REF_RE)) if (!known.has(m[1])) errors.push(`${tag} dangling skill reference \`${m[1]}\``)
  for (const m of text.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) if (!known.has(m[1])) errors.push(`${tag} broken [[link]]: ${m[1]}`)
  for (const s of secrets) if (text.includes(s)) errors.push(`${tag} references an excluded credential listed in docs/SECURITY-NOTE.md`)
}

// Credential identifiers from SECURITY-NOTE.md, read at run time so this file never embeds them (Law #6).
function excludedCredentials(root) {
  const p = join(root, 'docs', 'SECURITY-NOTE.md')
  if (!existsSync(p)) return []
  return [...readFileSync(p, 'utf8').matchAll(/`([^`]+)`/g)]
    .map((m) => m[1].trim())
    .filter((t) => /\.json$|^[0-9a-f]{12}$|secure-gcp-key-backup/.test(t))
    .map((t) => t.replace(/^rm -rf\s+/, '').replace(/\/$/, ''))
}

// Every domain skill must be reachable from the router: named in it, or covered by a `prefix-*` row.
// Codex runs no hooks, so the router table is the only guaranteed entry point there.
const ROUTER = 'using-wagerforge'
function checkReachability(skillsDir, dirs, errors) {
  if (!dirs.includes(ROUTER)) return
  const parsed = parseFrontmatter(readFileSync(join(skillsDir, ROUTER, 'SKILL.md'), 'utf8'))
  if (!parsed) return
  const body = stripFences(parsed.body)
  const named = new Set([...body.matchAll(BARE_REF_RE)].map((m) => m[1]))
  const wildcards = new Set([...body.matchAll(/`(math|fair|build|econ|qa|comp)-\*`/g)].map((m) => m[1]))
  for (const d of dirs) {
    if (d === ROUTER || named.has(d) || wildcards.has(d.split('-')[0])) continue
    errors.push(`[${d}] not reachable from ${ROUTER}: name it in the routing table or cover its prefix with \`${d.split('-')[0]}-*\``)
  }
}

function checkThinComponent(tag, text, kind, stem, errors) {
  const parsed = parseFrontmatter(text)
  if (!parsed) return void errors.push(`${tag} missing/invalid frontmatter`)
  if (!parsed.fm.description) errors.push(`${tag} frontmatter missing description`)
  if (kind === 'agent' && parsed.fm.name !== stem) errors.push(`${tag} agent name "${parsed.fm.name}" != file "${stem}"`)
}

export function validate(skillsDir) {
  const errors = []
  const warnings = []
  if (!existsSync(skillsDir)) return { errors: [`skills dir not found: ${skillsDir}`], warnings }
  const root = join(skillsDir, '..')
  const entries = readdirSync(skillsDir, { withFileTypes: true }).filter((e) => !e.name.startsWith('.') && !e.name.startsWith('_'))
  for (const e of entries) {
    if (e.isSymbolicLink()) errors.push(`[${e.name}] symlinked skill folders are not supported (copy the skill in)`)
    else if (!e.isDirectory()) errors.push(`[${e.name}] unexpected file in skills/ (each skill is a folder with SKILL.md)`)
  }
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  const commands = listDir(join(root, 'commands')).filter((e) => e.isFile() && e.name.endsWith('.md'))
  const agents = listDir(join(root, 'agents')).filter((e) => e.isFile() && e.name.endsWith('.md'))
  // Names a `wagerforge:` reference may resolve to: skills, slash commands and agents.
  const known = new Set([...dirs, ...commands.map((e) => basename(e.name, '.md')), ...agents.map((e) => basename(e.name, '.md'))])
  const secrets = excludedCredentials(root)
  for (const dir of dirs) checkSkill(skillsDir, dir, known, secrets, errors, warnings)
  checkReachability(skillsDir, dirs, errors)
  for (const [sub, list, kind] of [['commands', commands, 'command'], ['agents', agents, 'agent']]) {
    for (const e of list) {
      const text = readFileSync(join(root, sub, e.name), 'utf8')
      const tag = `[${sub}/${e.name}]`
      checkThinComponent(tag, text, kind, basename(e.name, '.md'), errors)
      checkText(tag, text, known, errors, secrets)
    }
  }
  const others = [
    ...listDir(join(root, 'hooks')).filter((e) => e.isFile() && /\.(mjs|json)$/.test(e.name) && !e.name.endsWith('.test.mjs')).map((e) => join('hooks', e.name)),
    ...['README.md', 'CLAUDE.md', 'AGENTS.md'].filter((f) => existsSync(join(root, f))),
  ]
  for (const f of others) checkText(`[${f}]`, readFileSync(join(root, f), 'utf8'), known, errors, secrets)
  return { errors, warnings }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const skillsDir = process.argv[2] || fileURLToPath(new URL('../skills', import.meta.url))
  const { errors, warnings } = validate(skillsDir)
  for (const w of warnings) console.warn('WARN ' + w)
  for (const e of errors) console.error('ERR  ' + e)
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(errors.length ? 1 : 0)
}
