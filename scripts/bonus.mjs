// Bonus economics. The headline correction (C3): house-edge × wagering is operator REVENUE
// that OFFSETS the give-away — NOT an additive playthrough cost. Real net cost is further
// driven by completion rate and sticky-vs-cashable mechanics (modeled by the caller).

export function bonusBreakEvenWR(houseEdge) {
  if (!(houseEdge > 0)) throw new Error('houseEdge must be > 0')
  return 1 / houseEdge
}

export function bonusExpectedCost({ bonus, wageringMultiple, houseEdge }) {
  if (!(bonus >= 0) || !(wageringMultiple >= 0) || !(houseEdge >= 0)) throw new Error('bad args')
  return bonus - houseEdge * (wageringMultiple * bonus)
}

// EV-positive for the operator means expected cost < 0, i.e. wagering STRICTLY above
// break-even. At exactly break-even the offer is EV-neutral (cost 0), not positive.
export function isEvPositive({ wageringMultiple, houseEdge }) {
  return wageringMultiple > bonusBreakEvenWR(houseEdge)
}
