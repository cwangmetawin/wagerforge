---
type: llm
weight: 1
arm: both
---

Grade correctness, not wording. Pass only if every MUST-HAVE is satisfied and no disqualifying claim is endorsed. Rejecting a folk claim is not endorsement. Sensibly rounded numerical answers are acceptable; a refusal or warning without the isolated calculations fails.

MUST-HAVE:
- Explicitly scope the numerical results to independent replays from a pristine snapshot, with the supplied conditional means unchanged. Normal expected payout is 0.04 x 120 + 0.96 x 40 = 43.2x; 43.2 / 45 = 96%. No-cap forcing has gold-conditioned mean 120x, RTP 120 / 45 = 266.666666667% (about 266.7%), mean attempts 1 / 0.04 = 25, failure probability zero in the almost-sure limit, and price 120 / 0.96 = 125x. Termination is almost sure because acceptance is positive; there is no finite worst-case attempt count.
- With 25 total attempts and last-attempt fallback, failure probability is q^25 = 0.96^25 = 0.360396716858018... = 36.0396716858% (about 36.0%). Expected payout is 120 x (1 - q^25) + 40 x q^25 = 120 - 80 x q^25 = 91.1682626514x (about 91.17x). Mean attempts are (1 - q^25) / 0.04 = 15.9900820785 (about 16.0). RTP at 45x is 202.596139225% (about 202.6%); restoring 96% requires 91.1682626514 / 0.96 = 94.9669402618x (about 94.97x). A finite budget with nongold fallback cannot guarantee gold.
- The shared-state implementation's actual failure rate, mean payout, attempt count, RTP and restoring price cannot be inferred from those pristine-snapshot statistics. Mutations can alter subsequent probabilities or payouts and can inflate payouts; inflation is not proved by the supplied data. Require a state-transition/reward model or separate measured/calibrated results. Faithfully reproducing aliases is appropriate for a legacy RTP audit, with results distinguished from the independent design.
- For the recommended independent production design, sample entry values once, retain an immutable snapshot, deep-clone symbol/multiplier grids and counters per attempt, restore rejected state, and charge no additional stake. Production retries consume fresh RNG draws, continuing the stream/cursor rather than resetting the same tape. Test frozen/deep-compared entry state after rejection and identical results/consumption for the same snapshot plus the same explicit RNG tape; include a rejecting multiplier path to expose contamination. Verify positive acceptance, failure frequency and conditioned RTP by enumeration or simulation.

DISQUALIFYING:
FAIL if the answer endorses a finite-budget guarantee, 96% RTP at 45x, unforced 43.2x as the Golden payout, extra charges per attempt, certainty because 25 equals 1 / 0.04, applying independent figures to the unspecified mutation implementation, claiming mutation necessarily increases RTP, sharing mutated production entries as an independent retry design, or resetting every production attempt to the same RNG tape. Faithful legacy-audit alias reproduction is not disqualifying.
