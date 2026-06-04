I'll synthesize the research payload into a comprehensive markdown dossier. This is a large synthesis task — let me work through it carefully and produce the complete dossier.

# WAGERFORGE RESEARCH DOSSIER
*A grounding document for writing the wagerforge spec and its 6-pillar skill set (math-, fair-, build-, econ-, qa-, comp-). Synthesized from real-codebase mining, a superpowers integration map, external best-practice research, and adversarial verdicts on risky claims.*

---

## 1. Executive Summary

### 1.1 What is proven and reusable from the real projects

Wagerforge sits on top of a substantial body of real, shippable code across three project families on disk:

- **PIXI.js slot games** (`/Users/chaowang/Documents/Developments/Slots/*`): two code generations — a legacy CommonJS reskin lineage (`zeus`, `medusa`, `tartarus`) and a TypeScript "Slot Framework V2" (`piggy-bank`, `fruit-nudge`, `cow-abduction`), plus a 7×7 cluster game (`sweety-treaty-cluster-pay`) with the richest protocol docs.
- **Crypto mini-games** (`/Users/chaowang/Documents/Developments/Mini games/*`): a Gen-1 "GDK" standalone generation and a Gen-2 "studio" pnpm/Turborepo monorepo, covering crash/limbo/dice, plinko, mines, dragon-tower, keno, diamonds, blitz, chase, plus the `GAME-ANALYSIS` synthesis docs.
- **Deployment/RGS infra** (`/Users/chaowang/Documents/Developments/Deployment/*`): `metawin-slot-server` (54-game Slotify game server with `IGame` contract, `TrackedRNG`, RTP sim), `inf-games-tequity` (Terraform/GKE for RGS+adapter+wallet+rng), and a `ludo.ai` AI-asset pipeline.

The single most important architectural truth, repeated in **every** project: **the server is authoritative for all math, RNG, win evaluation, and RTP; the client is a pure renderer that only animates server-resolved results.** This is the load-bearing constraint for the entire skill set.

Concretely reusable, near-verbatim artifacts:

| Artifact | Source | Feeds |
|---|---|---|
| `TrackedRNG.ts` (record/replay RNG decorator) | `/Users/chaowang/Documents/Developments/Deployment/metawin-slot-server/common/rng/TrackedRNG.ts:34-85` | qa- / fair- |
| `plinkoMath.ts` + `plinkoMath.test.ts` (binomial bucket + weighted reel, EV-calibrated) | `/Users/chaowang/Documents/Developments/Mini games/mini-game-plinko-100k/src/game/data/plinkoMath.ts:37-203` | math- / qa- |
| `ChaseServerProxy.computeU()` (HMAC-SHA256 → float, the only real client-side derivation) | `/Users/chaowang/Documents/Developments/Mini games/mini-game-chase/src/game/chase/server/ChaseServerProxy.ts:34` | fair- |
| `chaseMath.rollCrashPoint(u)` (inverse-CDF crash, EV-invariance proof) | `/Users/chaowang/Documents/Developments/Mini games/mini-game-chase/src/game/chase/data/chaseMath.ts:71` | math- |
| `math-operations.ts` (decimal.js money builder) | `/Users/chaowang/Documents/Developments/Mini games/mini-games-monorepo/packages/studio/src/utils/math-operations.ts:15-135` | build- / econ- |
| `common/stats/index.ts` (RTP/variance/hit-freq/top-wins, multi-core map/reduce) | `/Users/chaowang/Documents/Developments/Deployment/metawin-slot-server/common/stats/index.ts` | qa- |
| `build-sprites.js` + spine utilities | `/Users/chaowang/Documents/Developments/Slots/medusa/scripts/build-sprites.js:9-75` | build- |
| RLE paytable codec | `/Users/chaowang/Documents/Developments/Slots/medusa/docs/architecture/14-paytable-data.md:408-468` | math- / build- |
| `strategy-manager.ts` (autobet condition→action engine) | `/Users/chaowang/Documents/Developments/Mini games/mini-games-monorepo/packages/studio/src/utils/strategy/strategy-manager.ts:25-333` | build- / econ- |

### 1.2 The biggest correctness risks (must shape the skills)

1. **There is NO client-side RTP/Monte-Carlo simulator anywhere in any project.** All RTP, volatility, hit-rate, and reel-weight tuning happens on the unavailable remote math server. The slot repos contain only deterministic RNG-seed cheat scenarios, not statistical simulation. **wagerforge must BUILD the math-simulation/certification tooling from scratch** — the repos give the I/O contract, not the engine. The one real exception is `metawin-slot-server/common/stats/index.ts` (server-side) and `plinkoMath.test.ts` (the gold-standard QA template).

2. **"Provably fair" in the mini-games is mostly trust-the-house.** For every game except `chase`, the "verify" button calls the operator's own `/game/proveFairness` endpoint and the UI re-renders whatever `gameEvent` the **server** returns. `ChaseServerProxy.computeU` is the *only* implementation that independently recomputes the outcome locally. A true verifier must recompute from `serverSeed+clientSeed+nonce` client-side. **This is the single biggest gap to close in the fair- pillar.**

3. **Modulo bias is unhandled in-repo for discrete games.** The integer reduction (cards 0–51, mines tiles, keno) happens server-side and is never shown client-side, so "verification" is circular. A generic fair-verify must re-implement the reduction itself (rejection sampling), not trust the server's decode. *(See Corrections §5 for the nuanced reality of when modulo bias actually matters.)*

4. **Non-cryptographic client seed.** `generateSeedString()` uses `Math.random()` over 62 chars, default length 8 (~48 bits non-CSPRNG). Must use `crypto.getRandomValues` and a longer length.

5. **Several refuted/inverted claims in the source research** (e.g., bonus-cost accounting, reel-weight proportional scaling, "1M spins is sufficient", Mersenne-Twister adequacy). These are itemized in §5 and **must** be encoded as corrected statements in the skills, not the original wording.

6. **Money-math footguns to fix on port:** studio's `roundDown()` uses `ROUND_CEIL` and `roundUp()` uses `ROUND_UP` — the naming is inverted. Fix on port.

7. **Two code generations everywhere, drifted.** Legacy (CommonJS/GDK, mutable singletons) vs modern (TS/immutable). GDK is copy-pasted and has diverged (timeouts 10s vs 30s, differing currency allow-lists). A generic skill must abstract over both, not copy one. Note the **documented exception**: GDK intentionally mutates singletons — agents must not "fix" intentional mutation.

8. **Security hazard on disk:** `/Users/chaowang/Documents/Developments/Deployment/deploy/` holds 4 long-lived GCP service-account JSON keys (dev+prod, both brands). These are exfil-grade prod credentials, contradict the repo's keyless-WIF posture, and must **never** be ported into any skill or example. Flag for rotation.

---

## 2. Superpowers Integration Map

### 2.1 Companion-dependency declaration

Claude Code's `plugin.json` has no formal `dependencies`/`requires` field (superpowers' own `plugin.json` at `/Users/chaowang/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/.claude-plugin/plugin.json` declares none). Express the dependency two ways:

- **(a) Documentation + co-marketplace:** ship the standard layout (`/.claude-plugin/plugin.json` + a `marketplace.json` entry), document `Requires: superpowers (obra/superpowers) >= 5.x` in the README/description, and list both in the same marketplace so they install together.
- **(b) Runtime soft-check:** a `using-wagerforge` bootstrap (and/or a `SessionStart` hook mirroring superpowers' `hooks/` dir) that verifies superpowers skills resolve and emits a clear "install superpowers companion plugin" message rather than silently degrading.

**Cross-reference by namespaced name, never copy.** Reference `superpowers:test-driven-development`, `superpowers:brainstorming`, etc. with `**REQUIRED SUB-SKILL:**` / `**REQUIRED BACKGROUND:**` markers. Never use `@`-links (force-loads, burns 200k+ context) and never Read superpowers skill files directly — invoke via the Skill tool.

### 2.2 Which process skills to delegate (all `delegate: true`)

| Generic engineering process | Delegate to |
|---|---|
| Ideation / new feature design | `superpowers:brainstorming` (HARD-GATE: no implementation until design approved → `writing-plans`) |
| Turning spec into plan | `superpowers:writing-plans` |
| Plan execution | `superpowers:executing-plans` / `superpowers:subagent-driven-development` (preferred on subagent-capable platforms) |
| TDD discipline (RED-GREEN-REFACTOR Iron Law) | `superpowers:test-driven-development` |
| Debugging | `superpowers:systematic-debugging` |
| Code review request/receipt | `superpowers:requesting-code-review` / `superpowers:receiving-code-review` |
| Parallel fan-out | `superpowers:dispatching-parallel-agents` |
| Workspace isolation | `superpowers:using-git-worktrees` |
| Completion gate (evidence before claims) | `superpowers:verification-before-completion` |
| Branch finishing (merge/PR/cleanup) | `superpowers:finishing-a-development-branch` |
| Authoring/editing ANY wagerforge SKILL.md | `superpowers:writing-skills` (MANDATORY — Iron Law: no skill without a failing test first) |

### 2.3 How `using-wagerforge` routes

Model `using-wagerforge` on `/Users/chaowang/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/using-superpowers/SKILL.md` and its Skill Priority section. It is a **domain router that defers to `using-superpowers`**:

- **GENERIC engineering process** (ideation, planning, execution, TDD, debugging, review, dispatch, worktree, verification, finishing, skill authoring) ⇒ DELEGATE to the corresponding superpowers skill.
- **DOMAIN tasks** (minigame mechanics, RTP/house-edge/payout math, RNG & provable-fairness, crypto wagering/settlement, iGaming compliance) ⇒ route to wagerforge skills.
- **Process-before-implementation ordering still holds:** a wagerforge build request goes `superpowers:brainstorming` → `superpowers:writing-plans` → `superpowers:subagent-driven-development`/`executing-plans`, with wagerforge domain skills invoked **only inside** the implementation phase.

**Thin-wrapper pattern:** wagerforge process-adjacent skills add domain WHAT (e.g., "test for RTP invariants and provable-fairness") while *requiring* the superpowers HOW (RED-GREEN-REFACTOR). Zero duplication of generic process. Example: a domain `systematic-debugging` companion (RTP/house-edge math, RNG seeding, settlement mismatch) is **invoked from within** `superpowers:systematic-debugging`, never replacing it.

**Instruction priority:** user CLAUDE.md/AGENTS.md > skills > system. wagerforge skills must not override user instructions and yield to superpowers conventions where they overlap.

### 2.4 Authoring standards to honor (from `writing-skills`)

- Frontmatter: exactly two required fields `name` (letters/numbers/hyphens only, verb-first/gerund) and `description` (WHEN to use only, third person, "Use when…", concrete triggers/symptoms/keywords; never summarize the process). Max 1024 chars.
- Token efficiency: getting-started skills <150–200 words; others <500. Verify with `wc -w`.
- Flowcharts (graphviz dot) only for non-obvious decisions/A-vs-B; never for reference/code/linear steps.
- One excellent runnable, WHY-commented example in the single most relevant language.
- The Iron Law applies to NEW skills AND every EDIT. RED = baseline pressure-test without the skill; GREEN = minimal skill; REFACTOR = close loopholes.
- Create a skill only when non-obvious, reusable, broadly applicable. Project conventions → CLAUDE.md; mechanically-enforceable constraints → automation.

---

## 3. Per-Pillar Sections

> Naming convention used below: skill names are proposals using the 6 prefixes. Where a real installed skill already exists (`slot-math-designer`, `balance-check`, `asset-audit`, `setup-engine`, etc.) it is noted.

---

### 3.1 MATH Pillar (`math-*`)

#### Verified best practices

- **RTP via exhaustive outcome analysis:** RTP = Σ(P(outcome) × payout). Compute total combinations from reel weights; validate with simulation. For ways games (243/Megaways up to 117,649), probability = product of per-reel symbol frequencies ÷ total combos.
- **Virtual reel weighting** decouples on-screen symbol *visibility* from *payline probability* (26% visible / 2% payline achievable). Never conflate the two.
- **Variance per spin** = E[(outcome−EV)²]; scales linearly with N (SD as √N). **Always include zero payouts (losses)** or volatility is understated. Two identical-RTP games can have wildly different volatility.
- **Hit frequency** = winning combos ÷ total outcomes, independent of RTP.
- **Constant-house-edge crash/target math:** winChance% = (1−h)/multiplier×100; survival P(crash>x) = (1−h)/x with an "instabust" atom of probability exactly h at x=1.0, giving EV = (1−h)·bet for ALL targets. Holds for N parallel geometric rungs each staking bet/N (Chase proof).
- **Binomial Plinko:** P(bucket k) = C(rows,k)/2^rows; multiplier arrays hand-calibrated so Σ P(k)·mult[k] = RTP. Two-axis EV decomposition: E[total] = E[bucket]·E[ball] (e.g., 0.98/3 × 3 = 0.98 while branding a 100,000× jackpot).
- **Ladder games (Dragon Tower / Mines):** multiplier(row) = RTP·(total/safe)^row; survival cancels so EV = RTP·bet at every cash-out. Difficulty (columns/eggs ratio) is a volatility dial, not an EV dial.
- **Lottery paytables:** keno via hypergeometric P(X=k)=C(p,k)C(40−p,10−k)/C(40,10); diamonds via gem-frequency partition; blitz via birthday-paradox P(N)=∏(52−i)/52.
- **Bonus-buy pricing maintains RTP parity** and compresses variance in time, not EV. Buy-variant RTP disclosed separately; must equal/slightly exceed base.
- **Monte-Carlo SE ∝ 1/√N** (4× sims to halve error). High-volatility games need far more spins to converge.

#### Real-project patterns to port (with file refs)

- **RLE-encoded integer paytable, payout = value/10 × bet** — `paytable[symbolId] = int[]` indexed by win-count; run-length-decode to display ranges (`'8','13-14','19+'`). Server `initData.paytable` is truth; static JSON is display-only fallback. Port `GetSymbolPayouts` from `/Users/chaowang/Documents/Developments/Slots/medusa/docs/architecture/14-paytable-data.md:408-468` and `piggy-bank/src/client/GameConfigParser.ts:58 _parsePayouts`.
- **Reel strips as int[][]** keyed by mode (base/freegame/bonus). `/Users/chaowang/Documents/Developments/Slots/to-the-top/game/config/config-desktop.json:51` (coinReels); oversized de-stacking at `piggy-bank/src/client/GameConfigParser.ts:36`.
- **Symbol ID table** mapping `id → {name, isWild, isScatter, isHigh/Low, dropWeight}`. **Critical:** `dropWeight` is a *visual cascade weight* (scatter 1.8, hp 1.7, lp 1.5), NOT a math probability — actual probability lives in server reel strips. Note intentional ID collision (silver-wild & superscatter share ID 12). `/Users/chaowang/Documents/Developments/Slots/sweety-treaty-cluster-pay/docs/technical-reference/04-symbols-and-reels.md:3-17`.
- **Cluster pays + persistent doubling multiplier grid** — flood-fill orthogonal adjacency (min 5), per-cell doubling 1→2→4→…→1024 cap, grid resets per base round but PERSISTS across free-spin cascades; encode as int[][] with −1 sentinel. `/Users/chaowang/Documents/Developments/Slots/sweety-treaty-cluster-pay/game_rules updated.txt` + `docs/technical-reference/09-server-protocol.md:77-105`.
- **Scatter "machine" progression trigger** — deterministic 10-level meter with per-level weighted transition tables (oneScatterTables/twoScatterTables); 3+ scatters skip to max; reward-by-count (`[0,10,10,10,12,15,20,30]`, cap 100). `/Users/chaowang/Documents/Developments/Slots/sweety-treaty-cluster-pay/server-md/scatterMachine.md:13-35`.
- **Closed-form math to port directly:** `chaseMath.rollCrashPoint(u)`, `computeWinChance`, `generateLadderTiers` (`mini-game-chase/.../chaseMath.ts:71`); `plinkoMath.ts` binomialP/evOfTier/rollBucket/rollBallMultiplier (`mini-game-plinko-100k/src/game/data/plinkoMath.ts:37-203`).

#### Scripts wagerforge should ship (`scripts/`)

From external research + repo artifacts:
- `rtp-calculator` — exhaustive RTP/house-edge/hit-freq/variance from reel weights + paytable + combos.
- `virtual-reel-mapper` — physical→virtual stop weighting; verify visibility vs payline frequency.
- `variance-simulator` — Monte-Carlo RTP+variance with convergence diagnostics and 95%/99% bands; suggested min-spins for tolerance.
- `plinko-table-designer` — symmetric multiplier arrays calibrated to EV target + CDF sampler + optional independent multiplier axis.
- `crash-dice-limbo-ev` — closed-form EV/house-edge; instabust atom; input-range validation.
- `ladder-game-math` — auto-derive per-row multiplier/survival; prove EV=RTP·bet at every cash-out.
- `paytable-rtp-validator` — given paytable[tier][picks][matches] + analytic distribution (hypergeometric/partition/birthday), compute realized RTP per tier, assert within tolerance.
- `bonus-buy-pricer` — fair buy cost maintaining RTP parity; report buy-variant RTP + gap.
- `symbol-weight-impact-analyzer` — recompute full weighted RTP before/after a weight change (NOT proportional scaling — see §5).
- `bonus-layer-decomposition` — separate base / bonus / jackpot RTP contributions, weighted by trigger frequency.
- `rle-paytable-codec` — encode designer table → int[] (×10) and decode int[] → human ranges.

#### Pitfalls / red-flags

- Excluding losses from variance. Conflating visibility with payline probability. Using average bonus value × frequency without variance shape. Assuming convergence at 1–10M spins for high-volatility games (need 50M+, sometimes 10^8–10^9). Not modeling base/bonus separately for top-loaded games. Ignoring cascade/avalanche state changes (needs iterative sim, not combinatorics). Single-round variance for multi-round decision trees (Plinko/Mines compound multiplicatively).
- **GAP:** no client-side simulator exists; the server reel weights and scatter-machine transition tables are server-side and not in the client repos. wagerforge owns the math engine, not just the decoders.

#### Feeds skills
`math-config`, `math-engine`/`math-mechanics`, `math-simulation`/`math-certification` (GAP — build from scratch), `math-protocol`, `math-rtp-calibration`, `math-paytable-designer`, `slot-math-designer` (installed).

---

### 3.2 FAIR Pillar (`fair-*`)

#### Verified best practices

- **HMAC-SHA256, not plain SHA-256, for keyed outcome derivation.** Plain secret-prefix hashing (`SHA256(seed‖message)` used as a MAC) is length-extension-vulnerable. *(Severity nuanced — see §5.)* Canonical: `HMAC-SHA256(server_seed, client_seed:nonce[:cursor])`.
- **Commit-reveal ordering:** publish `SHA-256(server_seed)` (64-hex) BEFORE the player submits client seed; double-commit `nextServerSeedHash` before it's used; reveal plaintext only AFTER rotation. Block rotation while `unfinishedGames > 0`. Reset nonce to 0 on rotation.
- **Rejection sampling for hash→range** mapping; never naive modulo for discrete outcomes. *(Bias magnitude is conditional — §5.)*
- **CSPRNG seed generation** (`crypto.getRandomValues`, `/dev/urandom`, `secrets`), ≥128 bits.
- **Cursor logic** for >~8 outcomes per hash: advance a byte cursor through the 32-byte digest; re-hash with incrementing counter when exhausted.
- **Player-initiated client-seed changes with clear UI disclosure**; verification tools as inspectable client-side JS.
- **Provably fair ≠ RTP.** Fairness proves outcomes weren't manipulated post-bet; it says nothing about house edge. Audit RTP separately.

#### Real-project patterns to port (with file refs)

- **PORT VERBATIM — the one true verifier:** `ChaseServerProxy.computeU()` — Web Crypto `crypto.subtle.importKey` (HMAC/SHA-256) → `sign(`${clientSeed}:${nonce}`)` → first 13 hex chars (52 bits) → `parseInt/2**52` → u in [0,1). `/Users/chaowang/Documents/Developments/Mini games/mini-game-chase/src/game/chase/server/ChaseServerProxy.ts:34`. Generalize the 13-hex/2^52 slice to configurable bit-width + byte cursor.
- **Two distinct proof modes:**
  1. **per-round HMAC** (commit-reveal, reseeding) — `{clientSeed, serverSeedHash, nextServerSeedHash, nonce}`;
  2. **hash-chain** (crash/Aviator-family `crash0/aviator/crash1`) — commit terminal hash; outcome_i = f(hash_i, sharedSeed); verify hash_i → sha256 → hash_{i−1}. Routed via `gateway.verifyHashFairness(game, hash, seed, hashIndex)` at `/Users/chaowang/Documents/Developments/Mini games/mini-game-mines/src/gdk/components/result/ResultLoader.tsx:186`. The Fairness UI swaps labels to seed/hash for these.
- **`randomizations[]` as seed→outcome bridge:** `{limit, extractions:[{cursor,hashIndex,offset,integer}], randomNumber, gameEvent}` — one element per independent draw. Per-game Result components are pure presenters. `mini-game-plinko-100k/src/gdk/components/result/plinko/PlinkoResult.tsx:12` (randomizations[0]=bucket, [1]=ball).
- **Reference decoders** for common shapes: uniform inverse-CDF (limbo/crash), Fisher-Yates (mines/cards/keno), binomial-bucket (plinko). Card-int codec: `card 0..51, suit=floor(card/13), rank=card%13`.
- **Reference UI flow:** `Fairness.tsx` seed-rotation handlers (`rotateSeedPair`, change client seed, unfinished-games guard). `mini-game-mines/src/gdk/components/popup/popupContent/Fairness.tsx:126`.
- **Server-side verifier hook:** `proveFairness(addRandomization, data)` re-derives the public outcome using the SAME production formula and declared range (2^32 for float, 2^N for N binary events). `/Users/chaowang/Documents/Developments/Deployment/metawin-slot-server/BEST_PRACTICES.md:821-840`.

#### Scripts wagerforge should ship

- `fair-rng-core` — `hmacSha256ToFloat(serverSeed, clientSeed, nonce, {bits=52, cursor=0})`, configurable bit-width + byte cursor + re-hash counter. **Ship Known-Answer Tests** (the repos have NO test vectors — close this gap against published Stake-style KATs).
- `rejection-sampler` / `hash-to-range` — bias-free reduction with a statistical bias report.
- `fair-commit-reveal` — seed lifecycle repository (`getActiveSeeds`, `rotate`, `getRoundState`); double-commit; reveal-on-rotation; nonce reset; rotation-blocked-by-open-rounds.
- `fair-verify` — re-derive floats locally, decode to gameEvent, diff against settled result; supports both per-round-HMAC and hash-chain modes; **must re-implement the integer reduction itself**, not trust server gameEvent.
- `fair-outcome-mappers` — uniform inverse-CDF, Fisher-Yates, binomial-bucket; one-randomization-per-draw.
- `csprng-seed-generator` — replaces `Math.random()` client seeds.
- `seed-commitment-logger` — immutable hash-timestamp audit log, commitment-before-submission.

#### Pitfalls / red-flags (the highest-risk pillar)

- **Verification is delegated, not independent** for every game except chase — trust-the-house, not provably-fair. This is the #1 gap.
- **Modulo bias** reduction is server-side-only and unverifiable client-side → circular verification.
- **Non-CSPRNG client seed** (`Math.random()`, ~48 bits).
- **Stubbed dummy hashes** (`'0'.repeat(64)`, `verifyFairness:{randomizations:[]}`); Sling (HEXSHOT) uses `Math.random` and ships `provablyFair:'false'` — **never use as a fairness reference**.
- **No test vectors** for the HMAC derivation.
- **Message-format ambiguity:** chase uses `${clientSeed}:${nonce}`; multi-float byte-cursor/endian/hashIndex semantics are implied but never executed client-side — must be specified before generic verification is sound.
- **Fairness provider routing** (tequity-default vs hardcoded metawin) duplicated per-game and silently breaks `/proveFairness` when wrong — centralize in one table.

#### Feeds skills
`fair-rng-core`, `fair-commit-reveal`, `fair-verify`, `fair-outcome-mappers`, `fair-economy-config`, `comp-provably-fair`.

---

### 3.3 BUILD Pillar (`build-*`)

#### Verified best practices

- **Server-authoritative, result-driven animation:** server commits the result (final reel/stop positions) before animation; client receives result + motion parameters and animates deterministically. Animation is 100% cosmetic; the settled outcome is always the server field. *(Note: "cryptographically committed" is the provably-fair model; certified RNG slots require server-determined + audit-logged, not necessarily commitment — §5.)*
- **Visual-sim-must-not-decide-outcome:** Plinko runs real Matter.js physics but **overwrites** the physics-derived bucket with the server's `multiplierIndex`. Determinism = fixed dt + static pegs. Ship a dev-only assert flagging drift between simulated landing and server index. (No CI guard exists — `physicsPattern.ts` regression is uncaught.)
- **Mobile performance (heuristics, not hard laws — §5):** draw-call batching/atlasing; Basis Universal/KTX2 texture compression (4–10× over RGBA8); ~16ms frame budget; budget ~50–100MB assets on mid-range phones; profile on **real 2–3-year-old Android** (Snapdragon 6/7), not flagships/emulators. The desktop↔low-end gap is 5–10×.
- **Spine skeletal animation** over spritesheets for animated symbols (30–50% smaller); spritesheets+atlas for static UI.
- **PixiJS** (pure renderer, batching up to 16 textures/batch) preferred for deterministic slots over Phaser.
- **Decimal-safe money math:** all bet/win/balance arithmetic through a decimal.js wrapper. Native is truth, fiat is display-only; precision read from auth (`currencyDecimals`), never hardcoded; FX pushed by host; freebet/campaign bets never fiat-converted; floor-round so players are never over-credited.
- **Idempotency + ACID double-entry ledger** for wallet ops (server-side): derive balance from journal entries, append-only, idempotency keys with TTL, SERIALIZABLE isolation / atomic guarded debit. *(Stored-balance-with-daily-reconcile claim is refuted — §5.)*

#### Real-project patterns to port (with file refs)

- **Two-tier engine/skin separation** (reskin-friendly). Family A `framework/src` vs `game/src`; Family B `src/framework` vs `src/client`. `CLAUDE.md` states "framework reusable, game/client title-specific". `/Users/chaowang/Documents/Developments/Slots/piggy-bank/CLAUDE.md`; medusa is a literal reskin of tartarus (`timings.json` byte-identical).
- **Sequence/Step coroutine engine** (pool-backed, skippable) vs **Gamestate FSM + Timeline**. Port `piggy-bank/src/framework/sequences/{Sequence,Step,AwaitConcurrentStep,RaceConcurrentStep,SkipGroupStep}.ts` (`Sequence.ts:27-311`). Recommend Sequence/Step as modern default; also offer the FSM template (start/loop/stop-spinning, process-cascade, evaluate-result, idle).
- **SymbolMatrix object pooling:** sprites at rest, swap to Spine only mid-animation, return to sprite after; pool by generic `MatrixSymbol`; shared-reference cells for stacked/oversized symbols. `piggy-bank/src/client/gameObjects/symbolMatrix/SymbolMatrix.ts:1-60` + `PixiObjectPool`/`SpinePool`.
- **Bezier reel-spin physics + perspective filter:** named cubic-bezier control arrays (startCurve/stopCurve/hotreelStopCurve/quickStopCurve) + turbo/normal timing tables; 3D trapezoid GLSL filter recomputing uniforms only on size/orientation change. `medusa/game/config/config-desktop.json:148-186`; `medusa/game/src/Reel3D.js:36-119`.
- **Data-driven responsive scene graph:** JSON `{tree, objects:{type,anchors,boundary,portrait{},landscape{}}}` built by SceneManager. `piggy-bank/src/client/scene/BonusConfirmMenuContent.json:1-50`; `medusa config zIndex:188-216`.
- **Win-presentation tiering + count-up:** tier→action map (PRESENT_WIN/BIG_WIN/MAX_WIN/ADD_FREESPIN), win-line lifecycle, GSAP currency count-up via injected TextFormatter. `medusa/game/src/layers/win-presentation-layer.js:13-90`; `piggy-bank/.../wins/{BigWinSequence,CountUpStep}.ts`.
- **Win-threshold band config** (presentational): `winThresholds[{name, threshold(xBet), isBigWin/Mega/Epic, loopDur, loopFrames}]`; selector picks highest tier where totalWin ≥ threshold·bet. `zeus/game/config/config-desktop.json:47-54` + `zeus/game/src/win-parser.js:7-22`.
- **Operator/RGS connector ('slotify'):** brokers balance/bet/spin lifecycle via `window.postMessage`; `Utils.PostMessageToParent('spinStart',{bet})`. Present in 12/13 titles. `medusa/slotify/connector/connector.js`.
- **Inline host bridge (mini-games):** mount into `<div id="mw-mini-game">` via `createRoot` (no iframe/postMessage), global `window.mwgame` installed once + private EventTarget; session bracketing (always `endGameSession()` on error); config URL-query-first then data-attr. `GAME-ANALYSIS/00-MASTER-SYNTHESIS.md:330-390`; `apps/_mini-game-template/src/main.tsx:82-107`. WebSocket outlier for Aviator/Snake.
- **Round lifecycle:** studio `usePlayMutation` FSM (onMutate startGameSession → onSuccess animate/complete → onError endGameSession FIRST). GDK Signals+singletons+Redux variant. `apps/bars/src/hooks/use-play.ts:84-256`.
- **Multi-device/operator build matrix:** device × env × money-mode from one source via env-cmd + npm-run-all; parallel asset trees + per-variant manifests. Family A Browserify+Babel+Terser; Family B Webpack+TS — offer both, prefer TS/Webpack. `medusa/package.json:6-29`.
- **Asset pipeline:** Spine triad per anim folder (json+atlas+webp); free-tex-packer + Jimp + cwebp; mtime incremental skip + bounded concurrency. Port `medusa/scripts/build-sprites.js:9-75` + `extract-spine-static.js`, `recolor-spine-anim.js`, `scale-mobile-spine.js`, `shrink-mobile-spine-atlas.js`.
- **Money + autobet:** port `math-operations.ts` (fix inverted `roundUp`/`roundDown`) and `strategy-manager.ts` (strip ~20 console.logs).
- **AI-asset pipeline (ludo.ai):** swappable `SpriteAnimationProvider` interface + registry/catalog + secure in-memory key + mock-first; pure packing → PixiJS/TexturePacker JSON-Hash atlas (`<anim>/000` frame naming). `ludo.ai/src/providers/*`, `ludo.ai/src/packing/buildPixiAtlasJson.ts`.

#### RGS/server build patterns (with file refs)

- **`IGame`/GameModule contract:** `{id, bets:Record<action,{stakes,default,coinCost,maxWin,validate}>, play(ctx, rng)→{win,data,state?,next?}, config(variant), stats}`. RNG injected as 2nd arg, never imported. Feature-buy normalization (bet/coinCost). `/Users/chaowang/Documents/Developments/Deployment/metawin-slot-server/games/allaboutthefish/index.ts:615-660`.
- **Deferred-settlement state machine:** settle when `win>0 || state empty`; hidden state via `_underscore` key prefix (never serialized); pre-generated outcome arrays; `next[]` client-action whitelist. `BEST_PRACTICES.md:770-819`.
- **Round-lock multi-step protocol:** bet only on first action (no roundId), roundId locks subsequent calls; `wager.next` drives buttons; idempotent `recover()` MUST return null/204 (truthy `{}` triggers a spurious round); win-cap by `finalWin !== wager.win`. `GAME-ANALYSIS/games/mines.md:62-141`; `00-MASTER-SYNTHESIS.md:425-430`.
- **Bet→settle lifecycle:** RGS(outcome) → adapter(debit stake / credit win, async win) → operator wallet; correlation/session/round IDs on every hop. Reliability lesson: measure END-TO-END, not just the outbound HTTP call (the 40s-queue incident). `inf-games-tequity/docs/bugs/adapter-connection-pool-exhaustion.md:22-95`.
- **Edge security / config / CI:** route-allowlist 404, OWASP/Cloud Armor, geo-block, rate-limit exempting wallet/settlement paths (`infrastructure.tf:567-653`); version-map deploys + version-gated migration Jobs (`infrastructure.tf:667-805`); keyless WIF CI/CD, dev-gates-prod (`.github/workflows/terraform-apply.yml:80-135`); config-map vs secret vs per-service env merge (`app.tf:176-245`).
- **RTP-variant pipeline:** one bundle → N RTP SKUs via env; backend keys RTP off reported gameCode; client only displays advertised %. `apps/aviator/rtp.config.json`; `02-framework-monorepo-studio.md:266-301`. GDK equivalent: runtime alternate game codes (`limbo0`, `dragon-tower0` rtp=1).
- **Numeric integrity rules:** `fixValue = round(x*100)/100` on accumulate; max-win caps use `>=` never `==`; half-open `[lo,hi)` buckets with Infinity terminator; validate-before-RNG/before-debit; refund-on-error. `BEST_PRACTICES.md:1059-1103`, `747-768`.

#### Scripts wagerforge should ship
Port: `build-sprites.js` + spine utilities; `Sequence/Step` library; `SymbolMatrix`+pools; `Reel3D` filter; `SceneManager` + scene JSON schema; `CountUpStep`; `math-operations` (fixed); `strategy-manager` (cleaned); `slotify`/`mwgame` connector abstraction; ludo.ai provider + atlas builder; `TrackedRNG` (also qa-); the templated k8s deploy module, `metrics.tf`/`monitoring.tf` dashboards, WIF workflows; `script/deploy.sh` build-and-push-if-absent.

#### Pitfalls / red-flags
Treating animation as logic. `Math.random()` for RNG. Hardcoding animation durations (must be server-parameterizable). 60fps on startup ≠ sustained. Testing only on Chrome desktop/flagships. UTF-16/BOM-encoded cheats file (`sweetyClusterCheats.json`) — handle encoding detection at the boundary. GDK copy-paste drift. Global mutable `gameRNG` (concurrency risk; no request-scoped RNG isolation in open code). **`/deploy/` long-lived SA keys — do not port.**

#### Feeds skills
`build-reels`, `build-symbols`, `build-win-presentation`, `build-game-flow`/`build-sequences`, `build-ui`/`build-scene`, `build-assets`/`asset-pipeline`, `build-pipeline`/`scaffolding`, `build-platform-integration`/`build-host-bridge`, `build-rgs-game-server`, `build-instant-crash-games`, `build-wallet-integration`, `build-money-engine`, `build-deploy-pipeline`, `build-config-management`, `build-rtp-variant-pipeline`. Installed: `setup-engine`, `game-art`, `core-components`, `design-system`.

---

### 3.4 ECON Pillar (`econ-*`)

#### Verified best practices

- **RTP cost accounting:** published RTP is a single aggregate over base + bonus + free spins + multipliers + jackpots; validated by simulation pre-launch. Bonus cost reduces LTV margin.
- **Progressive jackpot funding:** 1–5% per wager into the pool; base game runs at lower RTP since part of each bet feeds the progressive; seed funded by casino capital, recoverable within ~2–3% of wagering; needs sufficient player base.
- **Sink/faucet balance:** faucets = wins/bonuses/loyalty; primary sink = wagering (house edge permanently exits). Health = total faucet value vs total sink volume; imbalance compresses margins or drives churn.
- **Volatility vs hit frequency are orthogonal** to RTP. Isolate volatility changes from RTP changes in A/B tests.
- **A/B testing game parameters:** pre-validate via 1M+ Monte-Carlo (RTP stable within 0.5% by ~100k); predetermined sample size (α=0.05, power=0.80); no peeking; Bonferroni/FDR for multiple tests; account for time-of-week/seasonal/channel confounds.
- **LTV:CAC ≈ 3:1.** iGaming CAC $280–$1,400/FTD. Optimize LTV upfront via ML segmentation; deliver dynamic bonus offers; freebet/campaign bets never fiat-converted.

#### Real-project patterns to port (with file refs)

- **Per-mode math-parameter table:** `{action, betMultiplier, targetRTP, buyPrice, maxWinCap, maxFreeSpins}` from `config.buyFeatures` + server `config.rtpValues`/`cap`. Spin actions named (`main/boosted/fg/superfg`) each with its own RTP. `zeus/game/config/config-desktop.json:85-145`; `sweety-treaty-cluster-pay/docs/technical-reference/09-server-protocol.md:31-40`.
- **RTP-variant build system** (econ deployment lever): `rtp.config.json {gameCode, rtpPercentage, urlPath}`; backend selects RTP table from gameCode. `mini-games-monorepo/apps/aviator/rtp.config.json`; `RTP_CONFIGURATION.md`.
- **Boost mode** raising trigger odds + bet 25–50% (`scatterMachine.md`) — a configurable economy lever.
- **`math-operations.ts` + `number.ts`** as the float-safe money path (`packages/studio/src/utils/`).

#### Scripts wagerforge should ship
- `monte-carlo-rtp-simulator` — 1M+ spins; RTP point estimate, 95%/99% CIs, volatility, hit-freq, convergence plot.
- `bonus-cost-calculator` — **must use the CORRECTED formula** (cost = bonus − houseEdge×wagering, plus completion-rate/sticky-vs-cashable modeling — see §5). Output break-even WR, LTV:CAC needed.
- `progressive-jackpot-equilibrium-solver` — optimal contribution rate vs seed attractiveness and base-game protection.
- `ab-test-power-calculator` — required N, runtime, FP/FN with/without Bonferroni.
- `ltv-cohort-forecaster` — segment by channel/geo/device; predicted LTV; recommended bonus to maximize true ROI.
- `rtp-compliance-validator` — flag empirical drift outside certified range or unrecertified bonus-ratio changes.
- `sink-faucet-balance-dashboard` — rolling faucet vs sink per cohort; alert on margin compression.
- `dark-pattern-detector` — flag turbo/slam stops, losses-disguised-as-wins, withdrawal friction (also comp-).

#### Pitfalls / red-flags
- **Bonus-cost mis-modeling is the headline econ trap** but in the OPPOSITE direction the source claimed — see §5. Real drivers: completion rate (only ~10–40% clear WR), sticky-vs-cashable, game-weighting, max-bet/abuse rules.
- A/B without pre-validation; confusing volatility with RTP; dark patterns (license risk + lower long-run LTV); jackpot seed/contribution mis-tuning starving base RTP; underpowered/peeked tests; skipping responsible-gambling tools (UK RTS pre-deposit limit prompts, 2025).
- **RTP reported inconsistently within single games** (Limbo UI 0.97 vs proveFairness 0.98; Dragon Tower 0.97/0.99/0.98). Treat server `/game/info config.rtp` as truth, client fallbacks as illustrative.

#### Feeds skills
`econ-rtp-cost`, `econ-jackpot-funding`, `econ-sink-faucet`, `econ-ab-testing`, `econ-ltv-cac`, `econ-bonus-design`, `econ-rtp-variant`, `balance-check` (installed).

---

### 3.5 QA Pillar (`qa-*`)

#### Verified best practices

- **Large-N Monte-Carlo for RTP validation** run through the actual game code; run theoretical (every paytable combination) AND simulation in parallel to catch design-vs-implementation mismatch. **Convergence proof at stated confidence, not raw spin count** (see §5: 1M is a sanity check, not sufficiency).
- **Seeded deterministic RNG regression** with a golden-result database; re-run same seeds; log seeds/entropy; rotate test seeds quarterly.
- **Multi-suite statistical RNG testing:** NIST SP 800-22 + Diehard + TestU01; all must pass; p-value α=0.05 (consider α=0.01 for high-stakes; **apply Bonferroni when running 15+ tests**).
- **CSPRNG mandatory** (ChaCha20/Fortuna/`/dev/urandom`). **Mersenne Twister is cryptographically broken** for real money (§5).
- **Load/concurrency** (JMeter/Locust/Gatling): 10k+ concurrent, burst spikes (10×), p99 latency, error-rate <0.1%.
- **ISO/IEC 17025-accredited labs** (GLI/eCOGRA/iTech) for certification; source-code review, seeding audit, field RTP vs theoretical. *(ISO 17025 accredits the lab, not the RNG — §5.)*
- **CI/CD math validation:** unit (payout fns) + integration + regression (golden results) + E2E; fail builds on RTP drift >0.5% or any seeded deviation.
- **Field RTP monitoring** with 95% CI accounting for volatility; sequential failure detection; track base vs feature RTP separately.

#### Real-project patterns to port (with file refs)

- **PORT VERBATIM — gold-standard QA template:** `plinkoMath.test.ts` — asserts binomial sums to 1 & symmetry, table shape (length===rows+1, symmetric), EV in [0.979,0.981] per (rows,tier), E[ball]===3.0 exact, combined EV in [0.975,0.985], 100k/200k-sample Monte-Carlo distribution check. `/Users/chaowang/Documents/Developments/Mini games/mini-game-plinko-100k/src/game/data/__tests__/plinkoMath.test.ts`.
- **`TrackedRNG.ts`** record/replay decorator (sequence+purpose capture, load/reset/mark) for deterministic certification runs. `/Users/chaowang/Documents/Developments/Deployment/metawin-slot-server/common/rng/TrackedRNG.ts:34-85`. Pairs with `IntegerRng.ts` + `FloatSourcedIntegerRng.ts` (the latter does rejection-sampling to power-of-two — correct modulo-bias handling).
- **`common/stats/index.ts`** — RTP/variance/hit-frequency/top-wins/payout-distribution/cascade Stats with multi-core map/reduce. `/Users/chaowang/Documents/Developments/Deployment/metawin-slot-server/common/stats/index.ts`.
- **Cheats/scenario harness:** `cheats.json {categories:[{cheats:[{cheat:'rng: <uint32 csv>'}]}]}` replayed via `connector.play(action,bet,null,rng)`. The only QA mechanism in the slot repos — deterministic seeds, NOT statistical sim. `zeus/game/config/cheats.json:1-60`. (UTF-16 variant: `sweetyClusterCheats.json`.)
- **Observability/SLO:** log-based metrics (finished/failed transactions, response-time distributions by wallet/operator/brand/game/env), per-wallet latency dashboards, end-to-end round-latency SLO (5s warn / 40s timeout), restart-count, uptime check on `/health/all`. `inf-games-tequity/metrics.tf:63-200`.
- **Studio e2e harness:** Playwright per-game projects, mocked/real fixture pairs, WS mocks, reusable network-failure & recovery scenario mocks (`error-500`, `network-timeout`, `slow-network`, `recovery-active`). `mini-games-monorepo/e2e/mocks/scenarios/`.

#### Scripts wagerforge should ship
`monte_carlo_rtp_validator` (accept only on convergence to tolerance at 95% CI), `golden_result_regression_checker` (byte-for-byte, pre-commit hook), `nist_sp800_22_test_suite`, `load_test_burst_simulator`, `field_rtp_confidence_monitor`, `seed_entropy_audit`, `state_recovery_attack_test`, `chi_square_fairness_test` (with Bonferroni), `rtp_variance_calculator` (estimate min-N for convergence given volatility), `test_coverage_report` (≥80% for math code).

#### Pitfalls / red-flags
- **"1M spins = sufficient" is refuted** (§5): sufficiency is a CI-width property dependent on volatility; high-vol needs 5M–10^9.
- **MT19937 is unfit** (§5).
- α=0.05 is not a "pass" threshold; Bonferroni for 15+ tests; minimum 10k spins for trend detection. State-recovery/backward-prediction attacks. Log seeds/entropy or certification fails. Theoretical ≠ implementation (off-by-one, float precision). Test burst spikes, not just average load. Single Diehard/chi-square failure → investigate.
- **Test coverage is thin/uneven** across all repos; only Plinko-100k (math), Blitz, HEXSHOT, Chase, Snake have real tests. High-value math models (Mines parser, Dragon-Tower formula, Diamonds/Keno paytables) are UNTESTED. wagerforge qa- skills fill these.
- `physicsPattern.ts` has no CI guard. Keno gateway doesn't call `updateGameSession` (session-tracking gap) — make session bracketing mandatory.

#### Feeds skills
`qa-rtp-simulation`, `qa-math-invariants`, `qa-fairness-verification`, `qa-integrity-checks`, `qa-observability-slo`, `qa-rng-statistical`, `qa-load-testing`, `qa-e2e-harness`.

---

### 3.6 COMP Pillar (`comp-*`)

#### Verified best practices

- **Server-level RG controls** (not client-side): deposit/loss/session limits enforced server-side against an **authoritative, time-synchronized server clock** (UKGC RTS adopts ISO/IEC 27001:2022 incl. 8.17 Clock Synchronisation). Reality checks; configurable break intervals. *(Client-side enforcement is bypassable; the "many platforms trust client timestamps" prevalence claim is an overgeneralization for licensed operators — §5.)*
- **UKGC gross deposit limits** (enforcement to 30 Sept 2026); pre-deposit limit prompt + 6-month reminders (RTS 2025); affordability checks Stage 1 (Q3 2026, ~£150 net-loss-pm, frictionless CRA) and Stage 2 (Q1 2027, income docs, 90% within 24h). UK RTS bans turbo/slam (Oct 2025).
- **GamStop self-exclusion** integration with **static IP whitelisting** (proxy/NAT for cloud); real-time + 24h periodic scans; TLS.
- **Independent math + RNG certification** (GLI/iTech/BMM/eCOGRA): theoretical RTP vs field data at 95%/99% CIs; CSPRNG seeded from high-entropy sources (NIST SP 800-90A DRBG / 800-90B entropy source / 800-90C assembly).
- **Immutable audit trails + ISO 27001**; both MGA and UKGC accept a current ISO 27001 cert. Queryable by regulators.
- **GDPR** pseudonymization, encryption at rest/in transit, RBAC, deletion timelines (fines up to 4% turnover / €20M).
- **Avoid dark patterns**; RG controls equally prominent as promotions.
- **Optional blockchain/provably-fair commitments** for immutable, player-verifiable audit trails.

#### Real-project patterns to port (with file refs)

- **Edge security pattern:** route allowlist (unknown path → 404), OWASP/Cloud Armor preconfigured rules, country/state geo-block via region_code header injection, IP rate-limit that **exempts money/critical paths** (`/graphql`,`/feed`,`/wallet`,`/rgs`). `inf-games-tequity/infrastructure.tf:567-653`.
- **`proveFairness` verifier hook** + deterministic RNG replay (`TrackedRNG`) as the transparency primitive. `metawin-slot-server/BEST_PRACTICES.md:821-840`.
- **Per-action RTP/cap config** as the documented, certifiable math surface (`config.rtpValues`, `config.cap.maxWin/freeGameMaxRound`).
- **Cross-game comparison tables** (RTP%, house edge, max multiplier, fairness model, bet limits, decimals, provider routing) in `GAME-ANALYSIS` — a ready-made compliance-documentation template.

#### Scripts wagerforge should ship
`rng-entropy-validator` (NIST SP 800-22 on 1M samples), `rtp-drift-detector` (theoretical vs live at 95/99% CI), `session-limit-enforcer` (audit no over-wager at boundary, server-clock), `clock-sync-monitor` (server monotonic clock, not device time), `gamstop-integration-tester` (IP whitelist + no false-negatives), `gdpr-data-audit`, `volatility-calculator`, `dark-pattern-audit`, `afford-check-simulator` (Stage 1/2 decision logic), `audit-trail-integrity-checker`.

#### Pitfalls / red-flags
- Confusing RNG (outcome randomness) with RTP (return %). Client-side limit enforcement / trusting client timestamps. Weak seed entropy (NIST SP 800-90B). No post-launch RTP-vs-theoretical monitoring. Mislabeling gross vs net deposit limits (UKGC requires "gross"). GamStop in cloud without static IP proxy. Treating audit logs as optional. Dark patterns. Self-certification (tier-1 regulators require third-party labs, ~$5–20k/game). Allowing limit override without cool-off/reauth.
- **GAP:** RTP/fairness certification artifacts (lab sign-off, RNG cert) are entirely absent from the repos — only self-run sims + a proveFairness hook exist. Compliance-grade evidence generation is a build-from-scratch area.

#### Feeds skills
`comp-geo-and-edge-security`, `comp-provably-fair`, `comp-rng-certification`, `comp-responsible-gaming`, `comp-affordability`, `comp-self-exclusion`, `comp-data-privacy`, `comp-audit-trails`, `comp-rtp-certification`.

---

## 4. Cross-Cutting "House Standard" Conventions

Observed consistently across the real repos:

1. **Server-authoritative everything.** Client never computes payouts, RTP, or outcomes; it renders server-resolved results. The strict client/server JSON contract is the seam between math and presentation.
2. **Two-tier engine/skin separation.** Reusable engine/framework vs thin per-title skin (config JSON + symbol map + scene JSON + assets). New title = copy skin, swap assets/config, never touch engine. Enforced in CLAUDE.md files.
3. **Config-as-math.** Reel strips (`int[][]`), paytables (RLE `int[]`, value/10), symbol tables, win-threshold bands, per-action RTP/caps all live in JSON, not code.
4. **Two code generations, abstract over both.** Legacy CommonJS/GDK (mutable singletons — *intentional, do not "fix"*) vs modern TS (immutable, pure-logic-DOM-free, boundary asserts, exhaustiveness never-guards). The immutable house style matches the user's global coding rules; the GDK mutation is a documented exception.
5. **Decimal-safe, native-is-truth money.** decimal.js for all bet/win/balance; native settlement + fiat display overlay; precision from auth; floor-rounding; freebet never fiat-converted. (Fix inverted `roundUp`/`roundDown` on port.)
6. **Deterministic replay for QA.** RNG-seed cheat scenarios + `TrackedRNG` record/replay; injectable RNG as the boundary for reproducible certification.
7. **Input validation at boundaries.** JSON.parse stringified view arrays; validate-before-RNG/before-debit; refund-on-error; ServerContractError + `-0` normalization. Matches the user's input-validation-at-boundaries rule.
8. **Monorepo discipline (Gen-2):** thin apps over one versioned `@studio`/`@platform` core; shared config packages (eslint/tsconfig/tailwind/vitest); `_game-template` scaffold; conditional change-detection CI; tag-driven deploy; one-bundle-N-RTP variants.
9. **Inline host embed, session bracketing.** `window.mwgame` (no iframe), install-once guard, URL-query>data-attr config, always `endGameSession()` on error.
10. **Keyless infra posture** (WIF/OIDC, dev-gates-prod, version-gated migration Jobs, Secret-Manager-create-empty-then-populate) — except the `/deploy/` legacy SA-key directory, which violates it and must be cleaned.
11. **Asset convention:** Spine triad per anim folder + packed WebP atlas + bitmap fonts for static; naming `lp-/hp-` (Family A) and `L0-L4/H5-H9` (Family B).
12. **`*.unit.spec` naming + Playwright e2e package** with reusable network-failure/recovery scenario mocks — the convention is the source of truth even though coverage is thin.

---

## 5. Corrections & Cautions (MUST shape the skills)

These came back **refuted** or **nuanced** from adversarial review. Skills must encode the **corrected** statement, never the original.

### REFUTED (hard errors — do not encode original)

**C1. Reel-weight proportional RTP scaling — REFUTED.**
Original: "changing a symbol's frequency 2%→4% scales RTP by the same proportion."
Corrected: RTP is a **multilinear** function of per-reel probabilities: `RTP = Σ_combos[∏_reels P(symbol) × pay]`. Changing one symbol's weight changes only combinations using it, *linearly per combination*, and reel **normalization simultaneously lowers** every other symbol's contribution on that reel. Net total-RTP move is small and can even be **opposite-signed**. Estimate via full weighted recomputation (or the multilinear partial weighted by paytable magnitude), weighted by **EV/contribution share — NOT fraction of wins**. (Verified: doubling a top symbol's reel-3 weight moved total RTP 1.337× while that symbol's own component doubled; another model moved RTP *down* 0.982×.) → `math-config`, `symbol-weight-impact-analyzer`.

**C2. Stored balance + daily reconcile — REFUTED.**
Original: "storing a computed balance alongside a ledger is acceptable as long as you reconcile daily."
Corrected: Daily reconciliation is a **detection/audit** control, not prevention. A cached balance is acceptable **only** if updated **atomically in the same ACID transaction** as the append-only ledger insert, AND every debit is an **atomic, overdraft-safe, idempotent guarded write under serializable isolation** (`UPDATE wallet SET balance=balance-:amt WHERE balance>=:amt` co-committed with the ledger row, `CHECK(balance>=0)`, idempotency key). **Never authorize spend from a cache or read replica.** The real invariant is atomic check-and-apply; SUM-the-ledger is the correctness ideal but not the only valid pattern, and reconciliation never disappears. → `build-wallet-integration`, `build-money-engine`.

**C3. Bonus-cost formula — REFUTED (sign inverted).**
Original: "bonus cost = bonus + (house edge × wagering); $100 @ 30× @ 96% RTP = $220."
Corrected: house-edge × wagering is operator **revenue** (player expected loss), which **offsets** the give-away. Expected cost = **bonus − (houseEdge × wagering)** = $100 − $120 = **−$20** (an expected profit; break-even WR = 1/edge = 25×, so 30× is EV-positive). Real net cost is dominated by **completion rate (~10–40% clear WR), sticky-vs-cashable mechanics, game-weighting, and abuse controls**, not an additive playthrough term. → `econ-bonus-design`, `bonus-cost-calculator`.

**C4. "1M spins is sufficient" — REFUTED.**
Corrected: 1M is a quick sanity check, not sufficiency. CI half-width = `1.96·SD_perSpin/√N`, volatility-driven: ~±1pp (low-vol) to ±3–6pp (high-vol) at 1M. Required N is whatever drives CI half-width below the RTP tolerance at the stated confidence — typically 5M–100M+, up to 10^9 for very-high-volatility/0.1pp precision. Acceptance = "declared RTP within the simulated CI at required confidence," assuming an unbiased independent RNG. → `qa-rtp-simulation`, `qa-math-invariants`.

**C5. Mersenne-Twister adequacy — REFUTED.**
Corrected: MT19937 is non-cryptographic; observing ~624 consecutive 32-bit outputs recovers full state and predicts all future/past outputs, regardless of seed entropy. Real-money RNG must be a CSPRNG (ChaCha20/AES-CTR-DRBG/HMAC-DRBG/Fortuna) seeded from a high-entropy OS/hardware source. ISO/IEC 17025 accredits the **lab**, not the RNG; RNG requirements come from GLI-19/WLA-SCS, and regulators mandate **properties** (unpredictability/non-determinism), not a named algorithm. → `qa-rng-statistical`, `comp-rng-certification`.

### NUANCED (encode the corrected, qualified statement)

**C6. Retriggering-bonus variance — NUANCED.**
Closed form is exact **only** for subcritical (p·R<1), i.i.d., non-path-dependent retriggers (Galton-Watson / absorbing-Markov; `Var = E[T]Var(X)+Var(T)E[X]²`, and a naive "fix spins at the mean" form **underestimates** by dropping the `Var(T)` term). For realistic features (growing/compounding multipliers, sticky symbols, state-dependent reels, win caps, variable awards), closed form breaks and **validated Monte-Carlo with CIs is required** (and adequate N near criticality, since `Var(T)∝(1−pR)^-3`). Method depends on structure, not on the mere presence of retriggers. → `math-engine`, `qa-math-invariants`.

**C7. Length-extension on SHA-256 — NUANCED.**
True only when SHA-256 is misused as a **secret-prefix MAC** over attacker-controllable trailing data; it forges an *appended* message, does not invert the hash, recover the seed, or two-open a commitment. A plain commitment `SHA256(serverSeed)` is **not** threatened. HMAC-SHA256 is the correct primitive for keyed derivation; truncated SHA-2 (SHA-512/256) and SHA-3 aren't length-extendable. Impact is conditional, not a general compromise of commitment/RNG integrity. → `fair-commit-reveal`, `fair-rng-core`.

**C8. Modulo bias — NUANCED.**
Bias occurs **only** when the source space size isn't a multiple of `range_max`; over-represented values are the smallest residues. Negligible (~1e-8 or less) when reducing a full 32-bit+ value (and exactly zero for power-of-2 ranges, e.g., coin flips); meaningful only when `range_max` is large relative to the source or a narrow/truncated value is reduced. The "~11% coin / ~0.02% dice" figures correspond to tiny windows, not real HMAC pipelines. Fix = make the source a multiple of `range_max` **or** rejection-sample (canonical, not the only remedy). The ECDSA-nonce key-recovery analogy is a different threat model and doesn't transfer. → `fair-outcome-mappers`, `rejection-sampler`.

**C9. Server-determined-BEFORE-animation "cryptographically committed" — NUANCED.**
The mandatory property is that the outcome is **server-determined, finalized, and audit-logged before animation**, never client-influenced (RNG/timing/frame-rate/input). UKGC/MGA/GLI require server-authoritative + certified-RNG + replayable logs — **not** necessarily a cryptographic commit-reveal. Commit-reveal is the "provably fair" model (mostly crypto casinos) and is optional/transparency-enhancing for certified slots. Relax "cryptographically committed" to "server-determined and audit-logged" in the build/comp skills. → `build-reels`, `comp-provably-fair`.

**C10. Mobile WebGL hard thresholds — NUANCED.**
">500 draw calls or >256MB VRAM will stutter regardless of CPU optimization" is wrong as a hard law: thresholds are **soft and workload-dependent** (batched 800 calls can be fine; 150 heavy-shader/high-overdraw calls can stutter). Android uses **unified memory**, not discrete VRAM; the constraint is bandwidth + browser-tab budget. "Regardless of CPU optimization" is self-contradictory because draw-call reduction (batching/instancing/atlasing) **is** CPU/driver optimization. Encode as heuristics + per-tier budgeting + profiling on real low/mid Android, with a graceful 30fps floor. → `build-reels`, `build-assets`, `asset-audit`.

**C11. Plain-vs-HMAC and modulo on the backend — NUANCED** (same corrections as C7/C8). The 7-outcomes-over-32-bit example is also miscounted (`2^32 mod 7 = 4`, so outcomes 0–3 favored, ~1.6e-9 bias — undetectable). → `build-rgs-game-server`, `fair-*`.

**C12. Stateless/per-bet RNG predictability — NUANCED.**
The real fault is a **non-cryptographic or under-seeded generator / recoverable seed**, not "lack of reseeding between bets." A stateless per-bet design is correct and secure when it is `HMAC(serverSeed, clientSeed‖nonce)` with a high-entropy secret server seed; deliberately reusing that seed across bets without reseeding is fine. NIST mapping: 800-90A (DRBG), 800-90B (entropy source), 800-90C (assembly) — original cited 800-90B for reseeding (wrong sub-standard). Also handle modulo bias in output→range mapping. → `comp-rng-certification`, `fair-rng-core`.

**C13. Client-side limit enforcement — NUANCED.**
Principle (enforce server-side against an authoritative time-synced clock; hard-block at the transaction/DB layer; never trust device time) is correct. But clock manipulation, losing-bet modification, and interception are **one root cause** (trusting client values), inherently neutralized by server authority; the fix for elapsed-time limits is a **server monotonic clock** (NTP precision matters only for absolute cut-offs, not "NTP is the mandate"). The "many licensed platforms trust client timestamps" prevalence framing is unsupported for certified operators. → `comp-responsible-gaming`, `session-limit-enforcer`.

**C14. RTP "locked at certification, cannot adjust mid-deployment" — NUANCED.**
Advertised RTP includes all **in-game** payout sources and the underlying math model is certified/versioned. But suppliers routinely certify **multiple RTP variants/bands**, and operators may switch among **pre-certified** variants at deploy time **without** re-cert (UKGC requires the active RTP be displayed). What requires re-cert is changing the math model (weights/paytable/feature logic) or shipping an uncertified value. **Operator-funded promotions outside the game RNG do NOT change certified RTP** — they change effective margin, governed by RG/AML/T&Cs. Jackpot/mystery contributions are often certified/published separately. The genuine trap is editing in-game math without re-cert, not running generous promos. → `econ-rtp-cost`, `comp-rtp-certification`, `rtp-compliance-validator`.

---

## 6. Suggested Updates / Additions to the 25-Skill Taxonomy

The real projects reveal mechanics and concerns the current taxonomy under-covers. Flagged additions/changes per pillar:

### Missing math mechanics the repos actually ship
- **`math-crash-family`** (crash/limbo/dice/aviator): constant-edge curve, inverse-CDF `rollCrashPoint`, instabust atom, EV-invariance proof, **parallel-streaks ladder** (Chase). *Not currently a named skill; the slot-centric taxonomy omits the entire continuous-target family.*
- **`math-cluster-pays`** (7×7 flood-fill + **persistent doubling multiplier grid**). A distinct mechanic from lines/ways, with its own grid-persistence rules across free spins.
- **`math-progression-trigger`** (scatter "machine"): deterministic level meter replacing probabilistic free-spin triggers, with weighted per-level transition tables and reward-by-count. A genuinely novel mechanic worth its own skill.
- **`math-ladder-games`** (Dragon Tower / Mines / frog-crossing): per-row multiplier + survival with EV-cancellation proof and a columns/eggs volatility dial.
- **`math-two-axis-economy`** (Plinko 100k): `E[bucket]×E[ball]` decomposition for jackpot-branded games that hold RTP.
- **`math-lottery-paytable`** (keno hypergeometric / diamonds partition / blitz birthday-paradox).
- **`math-cascade-tumble`**: wave pipeline, gravity/intermediate views, diff-based removal/addition. (Flagged as an under-read area in the mining — worth a dedicated pass.)

### Jackpot networks (currently absent)
- **`econ-progressive-jackpot`** / **`math-jackpot-network`**: pooled/network/mystery progressive funding (1–5% contribution), seed economics, network-effect viability, and **separate certification/publication** of jackpot RTP contribution. Neither math- nor econ- currently names jackpot networks.

### Tournament math (currently absent)
- **`econ-tournament`** / **`math-tournament`**: leaderboard/parimutuel/prediction-market structures. Evidenced by `snakes-client` (parimutuel prediction market). No existing skill covers tournament/leaderboard EV, prize-pool distribution, or rake.

### Fair pillar — the critical missing capability
- **`fair-verify` (independent re-derivation)** is the single most important *new* skill: the repos prove that "verification" today is trust-the-house for all but one game. Elevate this to a flagship skill, not a sub-feature.
- **`fair-hash-chain`** as a distinct mode from `fair-commit-reveal` (crash/aviator family routes through `verifyHashFairness`).

### QA / certification gaps to formalize
- **`qa-monte-carlo-cert`** (build-from-scratch): the entire statistical-simulation/certification layer is absent client-side. Make explicit that wagerforge owns this, using `plinkoMath.test.ts` as the template and `common/stats/index.ts` + `TrackedRNG` as the engine.
- **`qa-cosmetic-sim-guard`**: a CI regression guard for physics/visual sims (`physicsPattern.ts` has none) asserting simulated landing == server index.

### Build / infra gaps worth naming
- **`build-instant-crash-games`** (deferred-settlement state machine, `next[]` whitelist, hidden `_state`) — distinct from slot build skills.
- **`build-rtp-variant-pipeline`** as its own skill (one-bundle-N-RTP), unifying the studio `rtp.config.json` and GDK runtime-alternate-game-code approaches.
- **`build-reliability-slo`** seeded by the adapter connection-pool incident (measure end-to-end, bound pools/queues, orphaned-round risk).

### Cross-cutting taxonomy notes
- **Abstract over two generations** in every build/fair skill (legacy mutable-singleton GDK vs modern immutable TS) — neither is canonical.
- **Encoding/boundary robustness** (UTF-16/BOM cheats files, stringified view arrays) deserves a shared utility, not per-skill handling.
- **Security cleanup item (not a skill):** flag `/Users/chaowang/Documents/Developments/Deployment/deploy/` long-lived SA keys for rotation; never reference in any skill/example.

### Items that should NOT become skills (per `writing-skills` criteria)
- One-off encoding fixes, the inverted `roundUp/roundDown` naming bug (fix on port, note in CLAUDE.md), and project-specific game-code lists — these are conventions/fixes, not reusable non-obvious techniques.

---

*End of dossier. All file paths are absolute and drawn from the mining results; no facts beyond the payload were introduced. The §5 corrections supersede any conflicting wording elsewhere in this document and must be the basis for the corresponding skills.*