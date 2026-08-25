/** Round to 2 decimal places for COP money fields. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseMoney(value: string | number): number {
  return roundMoney(typeof value === 'number' ? value : Number(value));
}
