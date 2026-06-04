# wagerforge — Design Spec

*Status: draft for review · Date: 2026-06-04 · Author: Chao + Claude*
*Grounding research: [`docs/research/2026-06-04-research-dossier.md`](../research/2026-06-04-research-dossier.md) (43-agent workflow). Security: [`docs/SECURITY-NOTE.md`](../SECURITY-NOTE.md).*

---

## 1. What this is

**wagerforge** is a Claude Code **plugin** — a "superpowers for iGaming / crypto-minigames / game studios." It is a curated library of **skills** (the single source of truth) plus thin **commands**, **agents**, and **hooks**, that make Claude reliably correct when building real-money slot and crypto-minigame software.

It is a **companion** to the `superpowers` plugin: wagerforge owns **domain WHAT** (RTP math, provable fairness, RGS/settlement, iGaming compliance); it **delegates all generic process HOW** (brainstorming, planning, TDD, debugging, review, parallel dispatch, skill-authoring) to `superpowers`. Zero duplication of process.

### Metaphor / voice
"The forge where wagering games are made." Skills read as a master smith's bench notes: opinionated, battle-tested, with escape hatches.

---

## 2. Goals, audience, scope

**Audience:** generic — any studio building slots or crypto minigames. MetaWin-specific details are abstracted into reusable patterns; nothing MetaWin-proprietary is hard-coded.

**Primary goal:** encode the non-obvious, get-it-wrong-and-you-ship-a-bug domain knowledge of iGaming into skills Claude auto-applies at the right moment.

**In scope:** the 6 pillars below (math, fairness, build, economy/liveops, QA, compliance), as skills + commands + agents + hooks, with a default opinionated stack and escape hatches.

**Out of scope (non-goals):**
- Re-implementing generic engineering process (lives in `superpowers`).
- Being engine-agnostic to the point of vagueness — we take a default stack stance.
- Shipping a game. wagerforge builds the *tooling and discipline*, not a title.
- Legal advice. Compliance skills encode technical requirements + checklists, not counsel.

**Tech stance (opinionated default + escape hatch):** TypeScript; **PixiJS** (slots, deterministic renderer) / Phaser where apt; **Spine** for skeletal animation; **Node** game server (RGS pattern); **decimal.js** money; crypto wallet (on/off-chain). Every `build-*` skill opens with "Default stack: …; if you use X instead, map these concepts: …".

---

## 3. Architecture (Approach A: single plugin, pillar namespaces)

```
wagerforge/
├── .claude-plugin/
│   ├── plugin.json              # manifest (name: wagerforge)
│   └── marketplace.json         # installable; lists wagerforge (+ documents superpowers companion)
├── skills/                      # ★ ALL knowledge lives here (single source of truth)
│   ├── using-wagerforge/        # domain router; defers generic work to using-superpowers
│   └── <prefix>-<topic>/        # SKILL.md (+ references/, scripts/)
├── commands/                    # thin: each invokes a skill
├── agents/                      # thin: persona + "always use these skills"
├── hooks/
│   └── hooks.json               # SessionStart loader + event reminders
├── CLAUDE.md                    # plugin-level laws (SoT, escape hatch, correctness constraints)
├── README.md                    # install (+ "Requires: superpowers >= 5.x") + pillar tour
└── docs/
    ├── specs/                   # this file
    ├── research/                # the dossier + raw research data
    └── SECURITY-NOTE.md
```

### Wiring law — Skill is the Single Source of Truth
Knowledge is written **once**, in a skill. Commands/agents/hooks are thin and **reference** skills by name; they never restate domain knowledge.

| Component | Weight | Role |
|---|---|---|
| **Skill** | heavy | full knowledge + `references/` + runnable `scripts/` |
| **Command** | thin | "load skill X, apply to args" |
| **Agent** | thin | persona bound to a fixed set of skills |
| **Hook** | thin | event → inject a reminder pointing at a skill |

### Namespacing — 6 prefixes
`math-` (probability/RTP) · `fair-` (provable fairness/RNG) · `build-` (engine/server/wallet) · `econ-` (economy/liveops) · `qa-` (testing/validation) · `comp-` (compliance/RG). Plus the `using-wagerforge` router.

---

## 4. Superpowers integration

- **Companion dependency** declared via (a) README/marketplace ("Requires: superpowers >= 5.x", same marketplace) and (b) a `using-wagerforge` / `SessionStart` **soft-check** that warns if superpowers skills don't resolve.
- **`using-wagerforge` is a domain router that defers to `using-superpowers`:** generic process → the matching `superpowers:*` skill; domain task → the matching `wagerforge` skill. Process-before-implementation ordering holds: `superpowers:brainstorming` → `superpowers:writing-plans` → execution, with wagerforge domain skills invoked **inside** implementation.
- **Cross-reference by namespaced name, never copy.** Use `superpowers:test-driven-development`, etc., with `REQUIRED SUB-SKILL:` markers. Never `@`-force-load or Read superpowers files directly.
- **Thin-wrapper pattern:** a wagerforge process-adjacent skill adds domain WHAT and *requires* the superpowers HOW (e.g., a domain debugging companion for RTP/RNG/settlement is invoked **from within** `superpowers:systematic-debugging`).
- **Authoring obeys `superpowers:writing-skills`** (see §6), including its Iron Law: no skill (or skill edit) without a failing test first.

---

## 5. The skill taxonomy (~50, built in waves)

⭐ = Wave-1 MVP (the vertical slice that proves all 6 pillars + wiring). Skills tagged `[Cn]` are governed by a Correctness Constraint in §7. Skills marked `(build-from-scratch)` have **no** reference implementation in the real repos — wagerforge owns them.

### Router
- ⭐ `using-wagerforge` — domain router; defers generic work to `using-superpowers`.

### `math-` — probability & RTP (10)
- ⭐ `math-rtp-modeling` — RTP via exhaustive outcome analysis from reel strips + paytable + weights `[C1]`
- ⭐ `math-montecarlo-simulation` — empirical RTP/variance; SE∝1/√N; convergence-to-tolerance `[C4]` (build-from-scratch)
- `math-volatility-tuning` — variance (losses included), hit frequency, distribution shaping
- `math-paytable-config` — RLE paytable codec (×10), reel strips `int[][]`, symbol tables (config-as-math)
- `math-lines-ways-cluster` — paylines / ways / cluster pays + persistent doubling multiplier grid
- `math-ladder-and-progression` — Dragon-Tower/Mines EV-cancellation + scatter-"machine" deterministic progression
- `math-crash-family` — crash/limbo/dice/aviator: constant-edge, inverse-CDF, instabust atom, EV-invariance, parallel streaks
- `math-plinko-lottery` — Plinko E[bucket]×E[ball] two-axis + keno hypergeometric / diamonds partition / blitz birthday-paradox
- `math-cascade-tumble` — avalanche/tumble pipeline (iterative sim, not pure combinatorics)
- `math-feature-buy-and-jackpot` — bonus-buy pricing (RTP parity) + progressive jackpot math (separate certification)

### `fair-` — provable fairness & RNG (6)
- ⭐ `fair-rng-core` — `HMAC-SHA256(serverSeed, clientSeed:nonce[:cursor]) → float`, configurable bits/cursor; ships Known-Answer Tests `[C7][C12]`
- ⭐ `fair-commit-reveal` — seed lifecycle: commit `SHA256(serverSeed)` before client seed, double-commit next hash, reveal-on-rotation, nonce reset, rotation-blocked-by-open-rounds `[C7]`
- ⭐ `fair-verify` — **FLAGSHIP**: independent client-side re-derivation of the outcome; re-implements the integer reduction itself, never trusts the server's decode (build-from-scratch; only `chase` does this today)
- `fair-hash-chain` — crash/aviator hash-chain mode (commit terminal hash; verify hash_i → sha256 → hash_{i-1})
- `fair-outcome-mappers` — inverse-CDF, Fisher-Yates, binomial-bucket; bias-free reduction `[C8][C11]`
- `fair-verification-ui` — player-facing verifier UX + CSPRNG client-seed generation (replaces `Math.random()`)

### `build-` — engine / server / wallet (12)
- ⭐ `build-minigame-from-scratch` — scaffold a crypto minigame end-to-end (TS + Pixi/Phaser + Node), server-authoritative
- `build-slot-reels-symbols` — bezier reel-spin + Reel3D perspective filter + SymbolMatrix object pooling + Spine swap
- `build-win-presentation` — win tiering, count-up, data-driven responsive scene graph
- `build-game-flow` — Sequence/Step coroutine engine (default) vs Gamestate FSM + Timeline
- `build-asset-pipeline` — Spine triad + WebP atlas + incremental build (`build-sprites`) + swappable AI-asset providers (ludo.ai)
- `build-mobile-performance` — frame budget, batching/atlasing, per-tier budgets, profile on real low/mid Android `[C10]`
- `build-host-bridge` — operator embed: slotify postMessage connector / `mwgame` inline mount; session bracketing (always end on error)
- ⭐ `build-game-server-rgs` — `IGame` contract, RNG-injected `play()`, deferred-settlement state machine, round-lock multi-step protocol
- `build-instant-crash-games` — deferred-settlement FSM, `next[]` action whitelist, hidden `_state`
- ⭐ `build-wallet-and-money` — decimal-safe money (native-is-truth, fiat-display) + idempotent ACID double-entry ledger `[C2]`
- ⭐ `build-durable-settlement` — bet→settle durable execution: idempotency keys, saga/compensation, exactly-once on-chain payout; default Inngest/BullMQ, Temporal for complex, n8n never on the bet hot-path
- `build-deploy-and-rtp-variant` — templated k8s + keyless WIF + version-gated migrations; one-bundle-N-RTP variant pipeline; reliability/SLO (measure end-to-end)

### `econ-` — economy & liveops (7)
- ⭐ `econ-bonus-design` — free-spin/multiplier/bonus mechanics + true cost (completion rate, sticky-vs-cashable) `[C3]`
- `econ-rtp-cost` — aggregate RTP cost accounting across base/bonus/jackpot `[C14]`
- `econ-sink-faucet` — sink/faucet economy balance & margin health
- `econ-ab-testing` — pre-validated A/B on game params; power calc; no peeking; Bonferroni
- `econ-ltv-cac` — LTV:CAC, cohort forecasting, bonus ROI
- `econ-progressive-jackpot` — pooled/network/mystery funding economics (1–5% contribution, seed, viability)
- `econ-tournament` — leaderboard / parimutuel / prediction-market structures + seasonal liveops events

### `qa-` — testing & validation (8)
- ⭐ `qa-math-validation` — implemented game matches math spec via convergent large-N sim (not raw spin count) `[C4]`
- `qa-monte-carlo-cert` — statistical simulation/certification layer; template = `plinkoMath.test.ts`, engine = `common/stats` + `TrackedRNG` (build-from-scratch)
- `qa-regression-golden` — golden-result deterministic regression (seeded `TrackedRNG`), pre-commit gate
- `qa-fairness-verification` — test provable-fair impl: recompute, Known-Answer Tests, edge cases
- `qa-rng-statistical` — NIST SP 800-22 + Diehard + TestU01; Bonferroni for 15+ tests `[C5]`
- `qa-cosmetic-sim-guard` — CI guard asserting visual/physics sim == server outcome index (e.g. Plinko)
- `qa-settlement-integrity` — inject crash/retry; assert no lost/double payout, idempotent recovery
- `qa-load-and-observability` — load/burst (p99, <0.1% error) + end-to-end round-latency SLO + Playwright e2e w/ failure-recovery mocks

### `comp-` — compliance & responsible gaming (8)
- ⭐ `comp-responsible-gaming` — server-side deposit/loss/session limits vs authoritative monotonic server clock; reality checks `[C13]`
- `comp-affordability` — UKGC affordability Stage 1/2 decision logic
- `comp-self-exclusion` — GamStop integration with static-IP whitelisting
- `comp-rng-certification` — CSPRNG + GLI-19/WLA-SCS requirements; NIST 800-90A/B/C mapping `[C5][C12]`
- `comp-rtp-certification` — theoretical vs field RTP at 95/99% CI; what does/doesn't require re-cert `[C14]`
- `comp-math-cert-report` — generate the lab-ready cert artifact (RTP, max win, simulation evidence)
- `comp-geo-edge-security` — route allowlist (404 unknown), geo-block, rate-limit exempting wallet/settlement
- `comp-audit-and-privacy` — immutable audit trails + ISO 27001 + GDPR + dark-pattern audit

**Count:** 1 router + 10 + 6 + 12 + 7 + 8 + 8 = **52 skills** (full vision). Wave 1 builds the **13 ⭐**.

---

## 6. SKILL.md authoring standard (per `superpowers:writing-skills`)

- **Frontmatter:** exactly `name` (hyphen-case, matches folder) + `description` (WHEN-to-use only, third person, "Use when…", concrete triggers/symptoms/keywords; ≤1024 chars). The description is the **trigger**, not a summary.
- **Token budget:** getting-started skills <150–200 words; others <500 (verify `wc -w`). Deep material → `references/*.md` (loaded on demand). Runnable tools → `scripts/`.
- **Body shape:** `When to use / When NOT` → `Default stack (+ escape hatch)` → `Process` (numbered; graphviz flowchart only for non-obvious A-vs-B decisions) → `Pitfalls / red flags` → `Verification`.
- **Correctness binding:** any skill tagged `[Cn]` must state the **corrected** rule from §7, never the refuted folk version.
- **Iron Law (applies to new skills AND edits):** RED = pressure-test the behavior without the skill; GREEN = minimal skill that fixes it; REFACTOR = close loopholes. No skill without a failing test first.
- **One excellent runnable, WHY-commented example** in the single most relevant language.

---

## 7. Correctness Constraints (C1–C14) — first-class, bound to skills

These came back **refuted/nuanced** from adversarial verification. Skills must encode the corrected statement. (Full detail in dossier §5.)

| # | Folk claim → corrected | Binds to |
|---|---|---|
| C1 | "reel weight scales RTP proportionally" → **REFUTED**; RTP is multilinear; recompute fully, weight by EV-share, net move is small and can be opposite-signed | `math-rtp-modeling`, `math-paytable-config` |
| C2 | "stored balance + daily reconcile is fine" → **REFUTED**; cache only if updated atomically in the same ACID txn as the ledger; debit = atomic overdraft-safe idempotent guarded write under serializable isolation; never authorize spend from cache/replica | `build-wallet-and-money` |
| C3 | "bonus cost = bonus + edge×wagering" → **REFUTED (sign inverted)**; edge×wagering is revenue that *offsets*; real cost driven by completion rate, sticky-vs-cashable, weighting, abuse rules | `econ-bonus-design` |
| C4 | "1M spins is sufficient" → **REFUTED**; sufficiency = CI half-width < tolerance at confidence; high-vol needs 5M–10⁹ | `qa-math-validation`, `math-montecarlo-simulation` |
| C5 | "Mersenne-Twister is adequate" → **REFUTED**; MT19937 state-recoverable from ~624 outputs; require CSPRNG; ISO 17025 accredits the *lab*, not the RNG | `qa-rng-statistical`, `comp-rng-certification` |
| C6 | retrigger variance closed-form → **NUANCED**; exact only subcritical/iid/non-path-dependent; else validated Monte-Carlo with CIs | `math-cascade-tumble`, `qa-math-validation` |
| C7 | "SHA-256 length-extension breaks fairness" → **NUANCED**; only if misused as secret-prefix MAC; plain `SHA256(serverSeed)` commitment is fine; use HMAC for keyed derivation | `fair-rng-core`, `fair-commit-reveal` |
| C8 | "modulo bias is severe" → **NUANCED**; negligible (~1e-8) reducing full 32-bit+, zero for power-of-2; rejection-sample when range large vs source | `fair-outcome-mappers` |
| C9 | "outcome must be cryptographically committed before animation" → **NUANCED**; certified slots need server-determined + audit-logged, not necessarily commit-reveal (that's the provably-fair model) | `build-slot-reels-symbols`, `comp-rtp-certification` |
| C10 | ">500 draw calls / >256MB VRAM always stutters" → **NUANCED**; thresholds soft/workload-dependent; Android unified memory; budget per-tier + profile real devices | `build-mobile-performance` |
| C11 | backend plain-vs-HMAC + modulo example → **NUANCED** (same as C7/C8; example miscounted) | `build-game-server-rgs`, `fair-*` |
| C12 | "must reseed between bets" → **NUANCED**; real fault is non-CSPRNG/recoverable seed; stateless `HMAC(serverSeed, clientSeed‖nonce)` is fine; NIST 800-90A/B/C roles | `fair-rng-core`, `comp-rng-certification` |
| C13 | "platforms trust client timestamps for limits" → **NUANCED**; enforce server-side vs monotonic server clock; root cause = trusting client values | `comp-responsible-gaming` |
| C14 | "RTP locked at cert, can't change post-deploy" → **NUANCED**; can switch among *pre-certified* variants (display active %); promos outside RNG don't change certified RTP; re-cert only on math-model change | `econ-rtp-cost`, `comp-rtp-certification` |

---

## 8. Grounding & reuse (port, don't reinvent)

The real repos give the **I/O contract and several near-verbatim artifacts**; wagerforge ports + genericizes them into `scripts/`. Key portable artifacts (file refs in dossier §1.1 / §3):

- `TrackedRNG.ts` (record/replay RNG) → `qa-*`, `fair-*`
- `plinkoMath.ts` + `plinkoMath.test.ts` (**gold-standard QA template**) → `math-plinko-lottery`, `qa-monte-carlo-cert`
- `ChaseServerProxy.computeU()` (**the one true client-side verifier**) → `fair-verify`, `fair-rng-core`
- `chaseMath.rollCrashPoint` (inverse-CDF crash) → `math-crash-family`
- `math-operations.ts` (decimal.js; **fix inverted roundUp/roundDown on port**) → `build-wallet-and-money`
- `common/stats/index.ts` (RTP/variance/hit-freq, multi-core) → `qa-monte-carlo-cert`
- `build-sprites.js` + spine utils, RLE paytable codec, `strategy-manager.ts` (autobet), slotify/`mwgame` connectors, `IGame` contract, templated k8s + WIF workflows.

**House-standard conventions to enforce** (dossier §4): server-authoritative everything · two-tier engine/skin separation · config-as-math (JSON) · abstract over both code generations (legacy GDK mutable-singleton — *intentional, don't "fix"* — vs modern immutable TS) · decimal money native-is-truth · deterministic replay for QA · validate-at-boundary/refund-on-error · monorepo discipline · inline embed + session bracketing · keyless infra.

**Security exclusion:** the credentials in `SECURITY-NOTE.md` are permanently do-not-reference.

---

## 9. Wave-1 components (prove the wiring)

- **Commands:** `/wagerforge:new-minigame` (→ `build-minigame-from-scratch`), `/wagerforge:rtp-check` (→ `qa-math-validation` + `math-montecarlo-simulation`), `/wagerforge:fairness-audit` (→ `fair-verify` + `qa-fairness-verification`), `/wagerforge:settlement-check` (→ `qa-settlement-integrity`).
- **Agents:** `slot-math-designer` (bound to `math-*`), `fairness-auditor` (bound to `fair-*` + `qa-fairness-verification`), `settlement-engineer` (bound to `build-durable-settlement` + `build-wallet-and-money` + `qa-settlement-integrity`).
- **Hooks:** `SessionStart` loads `using-wagerforge` + soft-checks superpowers; `PostToolUse` on edits to `**/math/**`/`*.math.*` → remind RTP sim + validation; on `**/settle**`/`**/wallet**`/`**/rng**`/`**/seed**` → remind idempotency/durable/CSPRNG/fairness.

---

## 10. Build sequence (waves)

- **Wave 0 — Skeleton:** folder, `plugin.json`, `marketplace.json`, `CLAUDE.md` (laws + C1–C14), `README`, `using-wagerforge`, SKILL.md template, `hooks.json` (SessionStart), `scripts/validate.mjs`. → installable + authoring standard exists.
- **Wave 1 — Vertical slice:** the **13 ⭐** + the §9 commands/agents/hooks. Proves the full design→fairness→build→settle→validate→comply→operate loop and all wiring.
- **Wave 2 — Engine room:** remaining `math-*`, `fair-*`, `build-*`.
- **Wave 3 — Breadth:** remaining `econ-*`, `qa-*`, `comp-*`.

Each skill is built under `superpowers:writing-skills` (Iron Law) and `superpowers:test-driven-development`.

---

## 11. Validation & quality gates

- `scripts/validate.mjs`: every skill folder has `SKILL.md`; frontmatter has `name`+`description`; `name`==folder; description is trigger-shaped; no broken `[[links]]`; word-count budgets; every `[Cn]` skill references its constraint.
- **Abstraction adversarial test:** each ⭐ skill dry-runs against a *foreign* sample project (not the MetaWin repos) to confirm no coupling.
- **Fairness KATs:** `fair-rng-core`/`qa-fairness-verification` ship Known-Answer Tests (the repos have none).
- **Companion check:** `using-wagerforge` warns if `superpowers` is absent.

---

## 12. Success criteria

1. Installable plugin; `superpowers` companion documented + soft-checked.
2. The 13 ⭐ skills pass validate + their Iron-Law tests; `fair-verify` independently recomputes a known result client-side.
3. All `[Cn]` skills encode the corrected statement (auditable against §7).
4. A new minigame can go design→fair→build→settle→validate→comply guided end-to-end by wagerforge (delegating process to superpowers).
5. Nothing references the excluded credentials; no MetaWin-proprietary coupling.

---

## 13. Open questions

1. **Marketplace home:** publish wagerforge in its own repo/marketplace, or keep local-only for now? (affects `marketplace.json` source paths)
2. **`comp-provably-fair` skill:** the dossier references it as a concept; do we want a dedicated `comp-provably-fair` skill, or fold it into `comp-rtp-certification` + `fair-*`? (currently folded)
3. **Scripts language:** ship `scripts/` as TS (matches stack) or runnable `.mjs` (zero-build, like superpowers)? Recommendation: `.mjs` for plugin tooling, TS templates inside skill `references/` for game code.
4. **Wave-1 size:** 13 ⭐ is ambitious for one wave — split into 1a (router+math+fair+qa core) and 1b (build/settle/econ/comp) if needed?

---

*Supersedes nothing. The dossier §5 corrections supersede any conflicting folk wording. Next step after approval: `superpowers:writing-plans` to produce the implementation plan.*
