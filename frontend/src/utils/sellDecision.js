export function getSellDecision(current, average) {
  if (!current || !average) return "HOLD";

  if (current > average * 1.1) return "SELL";
  if (current < average * 0.9) return "WAIT";

  return "HOLD";
}
