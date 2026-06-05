import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const SKILL_NAME_RE = /^[a-z0-9-]+$/
const WHEN_TRIGGER_RE = /\buse (when|during|before|after|this)\b/i
const CONSTRAINT_TAG_RE = /\[(C(?:1[0-4]|[1-9]))\]/g
const CORRECTNESS_HEADING_RE = /^#{1,6}\s*correctness constraints\b/im
const WORD_BUDGET = 500
const WORD_HARD_CAP = 800
// Vendored skills (from superpowers, MIT) carry this marker; they are intentionally
// longer than the domain-skill budget and must never reference the old `superpowers:` namespace.
const PROVENANCE_MARKER = 'Vendored from superpowers'
const RESIDUAL_NS_RE = /superpowers:/
const VENDORED_SKILLS = new Set([
  'brainstorming', 'dispatching-parallel-agents', 'executing-plans',
  'finishing-a-development-branch', 'receiving-code-review', 'requesting-code-review',
  'subagent-driven-development', 'systematic-debugging', 'test-driven-development',
  'using-git-worktrees', 'using-superpowers', 'verification-before-completion',
  'writing-plans', 'writing-skills',
])

export function parseFrontmatter(md) {
  md = md.replace(/\r\n/g, '\n')
  if (!md.startsWith('---')) return null
  const end = md.indexOf('\n---', 3)
  if (end === -1) return null
  const fmText = md.slice(3, end).trim()
  const body = md.slice(end + 4)
  const fm = {}
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (m) {
      // Not a full YAML parser: strip a single pair of surrounding quotes.
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      fm[m[1]] = v
    }
  }
  return { fm, body }
}

export function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length
}

// Returns the text of the "Correctness constraints" section (heading excluded),
// or null if there is no such heading.
export function correctnessSection(body) {
  const h = body.match(CORRECTNESS_HEADING_RE)
  if (!h) return null
  const start = body.indexOf(h[0]) + h[0].length
  const rest = body.slice(start)
  const next = rest.search(/\n#{1,6}\s/)
  return next === -1 ? rest : rest.slice(0, next)
}

export function validate(skillsDir) {
  const errors = []
  const warnings = []
  if (!existsSync(skillsDir)) {
    errors.push(`skills dir not found: ${skillsDir}`)
    return { errors, warnings }
  }
  // withFileTypes avoids a statSync that throws on dangling symlinks (keeps the gate from failing open).
  const dirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name)
  const knownSkills = new Set(dirs)
  for (const dir of dirs) {
    const skillPath = join(skillsDir, dir, 'SKILL.md')
    const tag = `[${dir}]`
    if (!existsSync(skillPath)) { errors.push(`${tag} missing SKILL.md`); continue }
    const parsed = parseFrontmatter(readFileSync(skillPath, 'utf8'))
    if (!parsed) { errors.push(`${tag} missing/invalid frontmatter`); continue }
    const { fm, body } = parsed
    const vendored = body.includes(PROVENANCE_MARKER)
    if (!fm.name) {
      errors.push(`${tag} frontmatter missing name`)
    } else {
      if (!SKILL_NAME_RE.test(fm.name)) errors.push(`${tag} name not hyphen-case: ${fm.name}`)
      if (fm.name !== dir) errors.push(`${tag} name "${fm.name}" != folder "${dir}"`)
    }
    if (!fm.description) {
      errors.push(`${tag} frontmatter missing description`)
    } else {
      if (fm.description.length > 1024) errors.push(`${tag} description > 1024 chars`)
      if (!vendored && !WHEN_TRIGGER_RE.test(fm.description)) warnings.push(`${tag} description not trigger-shaped (no "Use when…")`)
    }
    const wc = wordCount(body)
    if (!vendored) {
      if (wc > WORD_HARD_CAP) errors.push(`${tag} body ${wc} words > hard cap ${WORD_HARD_CAP}`)
      else if (wc > WORD_BUDGET) warnings.push(`${tag} body ${wc} words > budget ${WORD_BUDGET}`)
    }
    if (RESIDUAL_NS_RE.test(body)) errors.push(`${tag} residual "superpowers:" namespace — rewrite to wagerforge: (bare "webapp-testing" for that one)`)
    for (const m of body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
      if (!knownSkills.has(m[1])) warnings.push(`${tag} broken [[link]]: ${m[1]}`)
    }
    // Correctness-constraint enforcement (spec §11): a constraint-bound skill —
    // declared via `constraints:` frontmatter OR tagged with [C1]..[C14] in the body —
    // MUST carry a non-empty "Correctness constraints" section encoding the corrected rule.
    const declared = (fm.constraints || '').split(/[,\s]+/).filter(Boolean)
    const tagged = [...body.matchAll(CONSTRAINT_TAG_RE)].map((m) => m[1])
    const constraintIds = [...new Set([...declared, ...tagged])]
    if (constraintIds.length > 0) {
      const section = correctnessSection(body)
      if (section === null) {
        errors.push(`${tag} declares constraints ${constraintIds.join(',')} but has no "Correctness constraints" section`)
      } else {
        const meat = section.replace(/<!--[\s\S]*?-->/g, '').trim()
        if (meat.length < 20) {
          errors.push(`${tag} "Correctness constraints" section is empty/placeholder`)
        } else {
          for (const c of constraintIds) {
            if (!section.includes(c)) warnings.push(`${tag} constraint ${c} not referenced in its Correctness constraints section`)
          }
        }
      }
    }
  }
  // Attribution gates (spec §11): if any vendored skill is present, the MIT NOTICES file
  // must exist at repo root and every vendored skill must carry its provenance header.
  const vendoredPresent = [...knownSkills].filter((d) => VENDORED_SKILLS.has(d))
  if (vendoredPresent.length) {
    const noticesPath = join(skillsDir, '..', 'THIRD-PARTY-NOTICES.md')
    if (!existsSync(noticesPath)) {
      errors.push('[THIRD-PARTY-NOTICES] missing at repo root (required: superpowers MIT attribution)')
    }
    for (const d of vendoredPresent) {
      const p = join(skillsDir, d, 'SKILL.md')
      if (existsSync(p) && !readFileSync(p, 'utf8').includes(PROVENANCE_MARKER)) {
        errors.push(`[${d}] vendored skill missing provenance header`)
      }
    }
  }
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
