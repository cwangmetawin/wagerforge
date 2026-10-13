# Changelog

## 0.3.0 — unreleased

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
