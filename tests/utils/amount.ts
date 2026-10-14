const units: Record<string, number> = { K: 1000, L: 100000, CR: 10000000 };

// "25L" -> 2500000, "1.5Cr" -> 15000000
export function parseIndianAmount(val: string) {
  const m = val.trim().toUpperCase().match(/^([\d.,]+)\s*(K|L|CR)?$/);
  if (!m?.[1]) throw new Error(`can't parse amount "${val}"`);
  const num = Number(m[1].replace(/,/g, ''));
  return Math.round(num * (m[2] ? units[m[2]]! : 1));
}

// "₹1,07,96,711" -> 10796711
export function parseRupees(text: string) {
  const digits = text.replace(/[^\d.]/g, '');
  if (!digits) throw new Error(`no number in "${text}"`);
  return Number(digits);
}
