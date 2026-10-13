# Changelog

## 0.3.2 — unreleased

Coverage of MetaWin's production server (MSS) against a fixed denominator. Each item merges on its own.

### Added (coverage)
- `docs/coverage/mss-mechanisms.json`: the 398 MSS mechanisms classed teach 196, fingerprint 187 and drop 15. The
  teach entries fall under 72 patterns that name no game, each with its MSS evidence. Approved 2026-10-13; fixed.

### Added (skills)
- `math-blackjack-rules`: scoring and naturals, settlement precedence, soft 17 and the dealer draw gate, peek
  liability, natural and insurance returns on the wallet grid, burns and reshuffle timing.
- `math-blackjack-actions`: insurance, Double, Split, split aces and re-splits, strategy charts with fallbacks, 21+3.
- Eval cases `blackjack-split-21-grid-peek` and `blackjack-insurance-double-funding`.
- `math-table-bet-rules`: the baccarat tableau, Banker commission rounding per chip with a minimum on every chip,
  pair bets on the original two ranks, roulette inside and announced bets, la partage and en prison, Sic Bo bets.
- `math-betting-progressions`: stop-line denominators and precedence, table-limit stop or reset, Martingale,
  Paroli, D'Alembert, Fibonacci, 1-3-2-6, Labouchère, Oscar's Grind and fixed-ratio spreads.
- Eval cases `baccarat-chip-floor-pair-rank` and `martingale-push-cap-stop-lines`.
- `build-live-table-operations`: chip undo and clear-table refunds, empty rounds, side bets that depend on a main
  bet, command windows and deadlines, seat queues and idle release, withdrawal and restake before risk.
- `build-wager-limit-admission`: currency and precision locks, worst-case liability against maximum exposure,
  per-chip versus per-spot limits, minimum and maximum bets, wallet-grid admission before the RNG, auto cash-out.
- Eval cases `live-table-undo-side-empty-round` and `shared-room-stake-admission`.

### Changed (validator)
- A `build-*` skill without a `## Default stack` section outside code fences is an error (law 3).
- An unquoted frontmatter `name` or `description` containing `: ` or ` #` is an error: strict YAML loaders reject
  or truncate it (law 8).

## 0.3.1 — 2026-10-13

### Changed (reference scripts)
- **Exact RTP statistics.** `scripts/dyadic.mjs` does exact arithmetic on finite doubles.
  `rtpFromOutcomes` computes RTP, house edge, hit frequency, variance and SD exactly and rounds each
  once to the nearest double, so row order cannot change a digit. The probability tolerance is
  checked exactly. `requiredN` returns at least 1.
- **Exact cascade money.** `cascadeTotalAtoms` / `cascadeTotalAbsoluteAtoms` take BigInt atom wins
  and decimal multipliers, round `floor`, `half-up` (default) or `half-even` per wave (default) or
  on the total, and refuse unknown options.
- **Epoch verification** (`verifyEpoch`). Every check runs once its own evidence is there: order,
  count, nonce and client-seed checks; outcomes once the server seed is revealed; before that,
  history against receipts and payouts against the recorded outcome. A voided receipt with a payout
  must refund exactly its stake. A payout must use the stake's amount type. A given stake must be a
  valid amount. `copyOutcome` copies a shared sub-array once and `sameOutcome` compares each pair of
  sub-arrays once, so shared structure cannot make them exponential.
- The validator requires each constraint's key spec phrases (C5 "624", C10 "unified memory",
  C12 "800-90").

### Changed (skills)
- `math-cascade-tumble` C6: the simple retrigger shortcut's variance also needs finite offspring and
  reward second moments, and `p·R<1` alone does not make multiplier-weighted reward moments finite.
  An exact recursion needs sufficient Markov state, exact joint transitions and rewards, and
  justified termination and moments; its second moment keeps the cross term. The depth-bounded
  recursion holds only under one state-independent law below the depth limit.
- `math-lines-ways-cluster`: a cluster pays from pre-upgrade values with server rounding. Sweety and
  Wolf start a fresh grid per base spin and per feature (superbonus at x2), and a feature never
  inherits the base grid. The column surge belongs to the Rise of the Wolf games, only when enabled.

### Added
- `math-moving-wild-collection` and `math-cascade-modifiers` (67 skills). MSS family mechanisms
  researched against MSS main were added to 27 existing skills.
- Two eval cases for the new skills (27 cases). The Codex runner records which skills each arm
  read: only a command that ran to completion and names the SKILL.md counts. `evals/summarize.mjs`
  aggregates several runs per agent, and the dashboard shows passes out of N.
- `docs/coverage/mss-gaps.json`: the untaught mechanisms per MSS family from an independent blind
  check, with MSS `file:line` evidence.
- The dashboard is served at https://wagerforge.gladiatorstudios.co.uk.

### Not met
- Coverage: under the written definition of a full family, an independent blind check finds
  1 of 34 families full. The owner chose to close this criterion as not met. The proposal for the
  next phase is `docs/plans/2026-10-12-v0.3.2-coverage-proposal.md`.

## 0.3.0 — 2026-10-13

### Removed (breaking)
- **superpowers is gone.** The 14 vendored process skills, the `using-superpowers` bootstrap injection,
  the dual-install detection (`scripts/bootstrap-mode.mjs`, `WAGERFORGE_BOOTSTRAP`), the re-vendor
  engine and `THIRD-PARTY-NOTICES.md` are removed. wagerforge is domain-only: bring your own process
  skills. References to `wagerforge:brainstorming`, `wagerforge:writing-plans` etc. no longer resolve.

### Added
- **11 skills from the production-server calibration**, each found as a gap in MSS's game families:
  `math-hold-and-win`, `math-guaranteed-payout-floor`, `math-conditional-value-games`,
  `math-fixed-odds-event-markets`, `fair-shoe-draw-ledger`, `build-live-table-games`,
  `build-bankroll-run-games`, `build-skill-wager-games`, `build-signed-realtime-settlement`,
  `qa-game-fingerprints`, `qa-game-rules-contract`. The router gained a "Route by mechanism" table.
- **Behaviour evals** (`evals/`): 25 cases run with and without the skills, for Claude
  (`claude plugin eval`) and for Codex (`evals/run-codex.mjs`).
- **Read-only dashboard** generated from the repository (`scripts/build-dashboard.mjs` →
  `docs/dashboard/index.html`), with the MSS game-family coverage matrix in
  `docs/coverage/mss-games.json`. It replaces `docs/showcase/`.
- **Codex support.** Codex CLI 0.159+ installs the plugin from the same marketplace file
  (`codex plugin marketplace add` + `codex plugin add wagerforge --marketplace wagerforge-dev`);
  `scripts/check-codex-load.mjs` and its test prove every skill loads, in a throwaway Codex home.
- Validator rules: portable frontmatter only (`constraints` moved under `metadata:`), mandatory
  `> **Core insight:**` line, router reachability for every skill, dangling `wagerforge:`/skill
  references, unknown constraint ids, whole-token constraint matching (C1 no longer matches C10),
  fenced code ignored for headings, whole-line frontmatter delimiters, symlinked skills refused,
  excluded credentials from `docs/SECURITY-NOTE.md` refused anywhere.

### Changed (breaking: reference scripts)
- `settlement.mjs`: each money leg is idempotent through the bet's own state and posts with
  `ledger.post` (audit ref `bet:<id>:<leg>`), so no `transfer` key can stand in for a leg; settle
  and refund continue only from the states they own (else `invalid_state`).
- `fair-epoch.mjs`: `verifyEpoch({serverSeed, playerLog, rounds, deriveFn, payoutFn})` checks the
  player's own log (commitment, then client seed, then receipts); reasons `seed_order`, `commitment`,
  `history_incomplete`, `client_seed`, `nonce_sequence`, `outcome`, `receipt`, `payout`,
  `voided_win`; missing evidence is `UNVERIFIABLE`; invalid evidence or history throws.
- `fair-rng.mjs`: server seeds are at most 64 UTF-8 bytes (a longer HMAC key is hashed into the
  public commitment); `generateServerSeed` takes 16..32 bytes; `copyOutcome` snapshots outcomes.
- `rtp.mjs`: `validateRtp` needs a variance bound (`modelSd` or `maxPayout`), takes
  `minEventProbability`, computes sample sizes exactly and allows for the mean's rounding
  (`meanError`).
- `bonus.mjs`: `simulateBonusCost` runs in BigInt atoms; `playRound(rng, stake)` returns the gross
  payout in atoms.
- `money.mjs`: `toAtoms` refuses a Number with more than 15 significant digits.
- `self-exclusion.mjs`: the exclusion answer must carry `asOfMs` and be fresher than `maxAgeMs`.
- `plain-data.mjs` (new): the untrusted inputs of `fair-epoch`, `copyOutcome`, `rtpFromOutcomes`,
  `tumble`, `conserved` and `self-exclusion` must be plain data. A Proxy or a getter/setter is
  refused instead of run and only own fields count, so no code from the input runs during a
  check. A record must have `Object.prototype` or a null prototype, so class instances, objects
  from another realm and vm context globals are refused. Run a verifier in a fresh process.

### Changed
- Every skill re-checked against MSS main @ 356fa2a. Corrected: Blitz pays only when every draw is
  unique; a cluster's multiplier sums only its cells at x2 or more; Blackjack Double and Split are
  new paid stakes. 27 placeholder pointers now name real skills.
- SessionStart now injects one routing sentence instead of a full bootstrap.
- The edit reminder (`hooks/domain-edit-reminder.mjs`) classifies by whole tokens of the
  project-relative path, sends wallet/settlement edits to the money skills (not the RNG ones),
  and ignores docs and ancestor folders.

## 0.2.1 — 2026-06-09

### Changed
- **Dual-install safe SessionStart bootstrap.** When the `superpowers` plugin is already enabled,
  wagerforge now DEFERS — it emits only a short routing + discipline pointer instead of re-injecting
  the full `<EXTREMELY_IMPORTANT>` bootstrap, eliminating the double injection. Standalone users
  (no superpowers) are unaffected and still get the full bootstrap. This flips the SessionStart
  payload for dual-install users — intentional de-dup, not a regression.
- SessionStart now also runs on `resume`.

### Added
- `WAGERFORGE_BOOTSTRAP` env override (since 0.2.1): `force` = always full bootstrap, `off` = always defer.
- Tri-state detection with a fail-open guarantee: any unreadable/unparseable settings → full bootstrap
  (never a silent skip), so a hand-edited (JSONC) settings file can't cause a missed double-injection fix.

### Rollback
- Downgrade to 0.2.0 restores the unconditional full bootstrap, or set `WAGERFORGE_BOOTSTRAP=force`.
