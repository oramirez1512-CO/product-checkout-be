/** Round to 2 decimal places for COP money fields. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseMoney(value: string | number): number {
  return roundMoney(typeof value === 'number' ? value : Number(value));
}

/** Convert COP major units to integer cents for the payment provider. */
export function toCents(amount: number): number {
  return Math.round(roundMoney(amount) * 100);
}
