---
name: qa-game-fingerprints
description: Use when engineers record or review per-mode payout fingerprints, unbinned moments, segmented distributions, tail sample sufficiency, finalized artifacts, dependency hashes, or offline drain comparisons.
metadata:
  constraints: C4
---

# qa-game-fingerprints

> **Core insight:** A fingerprint is reusable evidence of one executed mode's round distribution; correct cost accounting, unbinned moments, sample sufficiency and complete dependency provenance determine what it can support.

## When to use / When NOT

- Use for versioned distributions, volatility/drain comparisons and math sign-off artifacts.
- Use `qa-regression-golden` for deterministic outputs; `qa-fairness-verification` for cryptographic evidence. A histogram proves neither fairness nor settlement atomicity.

## Process

1. Define the population: complete rounds through real play/tick, all payable legs and actual charged costs. Include zero payouts; declare demo, void/refund and unfinished-round treatment. Fixed-cost RTP is E[W]/B; variable-cost RTP is sum(W)/sum(B), not mean(W/B). MetaWin's production server (MSS) `common/stats/fingerprint.ts` `Fingerprint.processWagers` defaults to first bet plus side bets; later paid top-level bets need a corrected extractor. `processTicks` is empty, so multiplayer needs a tick collector.
2. Version the artifact schema and record game, mode, opening action, actual behavioral variant/config, strategy, stake/grid, cost convention, initial/carried state, collector, RNG and source revisions. Human filename labels must match executed selectors. Keep different buys, strategies and stake regimes separate.
3. Collect unbinned count, payout/cost sums, moments, zero/winning/stake-covering counts and maximum alongside histogram bins. Use stable variance accumulation/worker merges; round-trip every accumulator through map/reduce/clear. "Exact" means unbinned, not arbitrary-precision statistics. MSS `common/stats/fingerprint.ts` `Fingerprint.mapResults` and `reduceResults` preserve raw moments; its raw second-moment subtraction still needs numerical-error assessment.
4. Define explicit segment labels against actual mechanics. Reconcile segment counts/moments with overall totals; for fixed costs, `P(segment)*E[W/B|segment]` decomposes return. Record segment sample sizes separately. Generic multi-wager equals free-game heuristics can mislabel continuations; MSS `tools/fingerprint-wrapper.ts` `resolveSegmentExtractor` needs game-specific checks.
5. Predeclare confidence/tolerance for body and tail claims separately. Sparse tail hits and zero observed variance are not sufficiency proofs. Preserve legitimate rare wins; investigate recording bugs without deleting valid outcomes. State binning error, carried-round dependence and any session/drain censoring. Histogram-resampled iid sessions do not validate correlated carry-state ruin; censored paths cannot establish an uncensored mean.
6. Hash all behavioral dependencies: imported modules, data tables, resolved configs, RNG/settlement code, collector and segment logic, plus build/dependency revisions. MSS `tools/fingerprint-wrapper.ts` `computeConfigHash` hashes only direct non-test .ts files: a known gap because MSS `games/cheeseHeist/index.ts` `server` imports Deep Delve. Require freshness before finalization/use. Keep candidates separate; preserve known finals and fail closed on missing provenance. MSS `common/stats/fingerprint.ts` `Fingerprint.filePath` diverts known finals; `tools/profile.js` `cmdFinalize` freshness-gates promotion within that shallow hash's scope.

## Correctness constraints

- C4: Sufficiency requires CI half-width below tolerance at chosen confidence; there is no universally sufficient spin count. Use an appropriate dependence/tail method and require whole-CI equivalence for target tolerance claims.

## Pitfalls / red flags

- Bin-derived moments, stale imports or wrong buy cost can produce persuasive false comparisons.
- Finalized status is provenance, not certification; thin segment tails cannot inherit whole-run sample size.

## Verification

- Reconcile real-round accounting, zero counts, moments, segments and single/multi-worker results; reject malformed partials and absent tick collection.
- Change an imported engine/table: freshness and finalization must fail. Test missing metadata and attempted final overwrite.
- Retain rare-win fixtures; report actual body/tail counts, CI assumptions, bin error and censored-path counts.
