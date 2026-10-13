---
type: llm
weight: 1
arm: both
---

Grade correctness, not wording. Pass only if every MUST-HAVE is satisfied and no disqualifying claim is endorsed. Rejecting a folk claim is not endorsement. Rounded answers at the stated precision are acceptable; a refusal or warning without the requested calculations fails.

MUST-HAVE:
- Locked quote: k = ceil(0.97 / 0.2910 x 10^4) = 33334 = 3.3334x. Repair by another tick if the target inequality still fails; here 0.2910 x 33334 = 9700.194 >= 9700, so none is needed. Quote-only RTP is 0.2910 x 3.3334 = 97.00194%. Displayed 3.33x never drives payout or admission.
- Winners receive ceil(stakeAtoms x 33334 / 10000) in exact integer cents; losers explicitly settle zero. At 0.10 (10 atoms): ceil(33.334) = 34 atoms = 0.34, return 3.40x, RTP 0.2910 x 3.40 = 98.94%. At 1.00 (100 atoms): ceil(333.34) = 334 atoms = 3.34, RTP 0.2910 x 3.34 = 97.194%. Settlement is a second lattice, so nominal 97% is not the realized RTP.
- The simple rule pays 0.33 and 3.33: RTP 0.2910 x 3.30 = 96.03% and 0.2910 x 3.33 = 96.903%, both below 97%.
- Exact admission uses s=stakeAtoms, k=33334, r=970000 (target RTP in E6), a=ceil(s x k / 10000): a x r x 10000 <= s x 10^6 x (k - 1), with BigInt or equivalent exact arithmetic. Testing a x 2910 <= s x 10000 at the stated probability gives the same decisions here. Refuse 0.01, 0.02, 0.03, 0.04, 0.06, 0.09; accept 0.05, 0.07, 0.08, 0.10, 0.11, 0.12. For example, 0.01 pays 4 atoms and has RTP 116.4%; 0.09 pays 31 and has RTP 0.2910 x 31 / 9 = 100.233333333...%. Admission is nonmonotone below the continuous safe minimum: 0.05 passes while 0.06 fails. The UI minimum is last refused stake + one atom = 0.10; still test every submitted stake.
- The independent feature-cap case pays min(15020,15000) x 0.10 + 100 x 0.10 = 1500.00 + 10.00 = 1510.00. No whole-purchase cap authorizes removing the entry award. The route maximum is 15100x base bet = 151x charged purchase = 1510.00 at this stake, not the stated 150x charged purchase (1500.00). Declare this actual route maximum in both max-win disclosure and exposure limits.
- Boundary tests cover quote repair, atom rounding at one/ten/hundred atoms, the listed admission decisions and unchanged payouts/admission after a display-only odds change. Feature tests cover below/at/above the 15000x limit with the separately added entry award; max-win and exposure assertions use the full purchase total.

DISQUALIFYING:
FAIL if the answer endorses display/2-decimal payout odds, nearest/floor quoting, nearest/floor settlement under the stated lower-return requirement, nominal 97% as small-stake realized RTP, monotone admission or UI minimum 0.05, accepting all stakes as harmless one-cent error, a whole-purchase clamp to 1500.00, or keeping max-win/exposure at 150x charged purchase despite the reachable entry award.
