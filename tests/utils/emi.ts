// EMI = P * r * (1+r)^n / ((1+r)^n - 1)   r = monthly rate, n = months
//
// NOTE: totals use the unrounded EMI. Checked on the site: 50L @ 9% for 20y shows
// EMI 44,986 but total payment 1,07,96,711 which is NOT 44,986 * 240
function exactEmi(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
}

export function calculateEmi(principal: number, annualRate: number, months: number) {
  const emi = exactEmi(principal, annualRate, months);
  const totalPayment = Math.round(emi * months);
  return {
    emi: Math.round(emi),
    totalInterest: totalPayment - principal,
    totalPayment,
  };
}

export interface YearRow {
  year: number;
  principal: number;
  interest: number;
}

// principal + interest paid in each calendar year, same as the bar chart shows.
// startMonth is 1-12. values are NOT rounded here, round when comparing
export function yearlySchedule(principal: number, annualRate: number, months: number, startMonth: number, startYear: number) {
  const r = annualRate / 12 / 100;
  const emi = exactEmi(principal, annualRate, months);
  const rows: YearRow[] = [];
  let balance = principal;

  for (let i = 0; i < months; i++) {
    const year = startYear + Math.floor((startMonth - 1 + i) / 12);
    const interest = balance * r;
    const princ = emi - interest;
    balance -= princ;

    let row = rows[rows.length - 1];
    if (!row || row.year !== year) {
      row = { year, principal: 0, interest: 0 };
      rows.push(row);
    }
    row.principal += princ;
    row.interest += interest;
  }
  return rows;
}
