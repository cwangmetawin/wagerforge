---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Use this case's declared mode-specific caps of 15. Spin 5 starts at min(9 + 4, 15) = rung index 13 and the two subsequent wave climbs use indices 14 and 15: 300x, 500x and 1000x on 1 coin of base win each. The spin pays 300 + 500 + 1000 = 1800 coins (absolute rungs, not compounded). Do not import an MSS start cap of 11 into this custom configuration.
- Separate the stored floor, sampled head start and current wave index; reject persisting their combined final index as the floor. The 3 final scatters level the persistent floor once, effective from the next spin through feature end, from index 9 to 10 (100x), without repricing spin 5. The head start of 4 and the two subsequent wave climbs are temporary and discarded at spin end. Spin 6 starts at min(10 + 1, 15) = rung index 11 (150x).
- Spin 6's 0 terminal scatters leave the persistent floor at index 10. Spin 7 restores floor index 10, starts at min(10 + 1, 15) = index 11 (150x), and pays 150 coins; spin 6's head start and wave climbs are discarded.
- Injection: reel 1's surviving wild fills its one special slot and reel 2 has no new vacancy; reels 3-5 have no retained special, so only reels 3, 4 and 5 are eligible. Given independent rolls, the chance of at least one new wild is 1 - 0.8^3 = 0.488 (48.8%). Each successful reel places one wild uniformly among its new vacancies.
- Fixtures cover next-spin floor restoration, several terminal scatters producing one level, cap boundaries, and no persistent-floor upgrade from wave count alone in the declared mode. Include retained specials surviving gravity and blocking injection, no-vacancy reels, eligible-cell selection and the injection cutoff. A separate qualifying-wild-mode fixture pays before its persistent upgrade, upgrades once per winning wave with a qualifying wild (twice when two such waves win in one spin), and does not upgrade from wave count or terminal scatters; never combine the two modes' upgrade events.

DISQUALIFYING:
FAIL if the answer endorses carrying the head start or wave climbs into the stored floor, raising the floor once per scatter (floor index 12, spin 6 index 13), repricing spin 5 with the leveled floor, compounding the rungs, pricing this case with an imported start cap of 11 (650 coins), treating all five reels (0.67232) or four reels (0.5904) as eligible for injection, ignoring the declared independent rolls, or injecting into a reel with a retained wild/scatter or into cells that are not new vacancies. FAIL if the answer resets the floor after spin 6, gives spin 7 floor index 9, starting index 10 or a 100-coin payout, or limits qualifying-wild upgrades to once per spin. Discussing 650 as a comparison with a different MSS configuration is acceptable if this case still pays 1800.
