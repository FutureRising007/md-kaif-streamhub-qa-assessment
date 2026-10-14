import { expect } from '@playwright/test';
import { When, Then } from '../../fixtures';
import type { LoanContext } from '../../fixtures';
import { parseIndianAmount, parseRupees } from '../../utils/amount';
import { yearlySchedule } from '../../utils/emi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function scheduleFor(ctx: LoanContext) {
  const { principal, ratePercent, tenureMonths, startMonth, startYear } = ctx;
  if (!principal || !ratePercent || !tenureMonths || !startMonth || !startYear) {
    throw new Error('loan details / start month not set by an earlier step: ' + JSON.stringify(ctx));
  }
  return yearlySchedule(principal, ratePercent, tenureMonths, startMonth, startYear);
}

When(
  'I use the sliders to set loan amount {string}, interest rate {float}% and tenure {int} years',
  async ({ emiCalculatorPage, loanContext }, amount: string, rate: number, years: number) => {
    loanContext.principal = parseIndianAmount(amount);
    loanContext.ratePercent = rate;
    loanContext.tenureMonths = years * 12;

    await emiCalculatorPage.moveSlider('amount', loanContext.principal);
    await emiCalculatorPage.moveSlider('rate', rate);
    await emiCalculatorPage.moveSlider('tenure', years);
  },
);

When('I change the schedule start month to {string}', async ({ emiCalculatorPage, loanContext }, value: string) => {
  const [mon, yr] = value.split(' ');
  const monthNo = MONTHS.indexOf(mon!) + 1;
  if (!monthNo || !yr) throw new Error(`expected something like "Mar 2027", got "${value}"`);

  await emiCalculatorPage.pickStartMonth(mon!, Number(yr));
  loanContext.startMonth = monthNo;
  loanContext.startYear = Number(yr);
});

Then('the bar chart should be visible', async ({ emiCalculatorPage }) => {
  await emiCalculatorPage.barChart.scrollIntoViewIfNeeded();
  await expect(emiCalculatorPage.barChart).toBeVisible();
  await expect(emiCalculatorPage.barSegments().first()).toBeVisible();
});

// Bars are stacked - one bar per calendar year made of 2 segments (principal + interest).
// So we check both: number of bars = years the loan spans, segments = 2x that.
Then('the bar chart should have one bar for each calendar year of the loan', async ({ emiCalculatorPage, loanContext }) => {
  const expectedYears = scheduleFor(loanContext).map((r) => String(r.year));

  await expect.poll(() => emiCalculatorPage.getBarChartYears()).toEqual(expectedYears);
  await expect(emiCalculatorPage.barSegments()).toHaveCount(expectedYears.length * 2);

  console.log(`bar chart: ${expectedYears.length} bars (${expectedYears.join(', ')}), ${expectedYears.length * 2} segments`);
});

Then(
  'the tooltip for the {string} bar of {int} should match my payment schedule',
  async ({ emiCalculatorPage, loanContext }, series: string, year: number) => {
    const row = scheduleFor(loanContext).find((r) => r.year === year);
    expect(row, `loan doesn't cover ${year}`).toBeDefined();

    const text = await emiCalculatorPage.hoverBar(series as 'Principal' | 'Interest', year);
    console.log('tooltip:', text);

    const valueMatch = text.match(new RegExp(`${series} : ₹\\s*([\\d,.]+)`));
    const totalMatch = text.match(/Total Payment : ₹\s*([\d,.]+)/);
    expect(valueMatch, `couldn't find ${series} value in tooltip "${text}"`).not.toBeNull();
    expect(totalMatch, `couldn't find Total Payment in tooltip "${text}"`).not.toBeNull();

    const shownValue = parseRupees(valueMatch![1]!);
    const shownTotal = parseRupees(totalMatch![1]!);
    const expectedValue = series === 'Principal' ? row!.principal : row!.interest;

    // site rounds for display, allow 1 rupee either way
    expect(Math.abs(shownValue - expectedValue)).toBeLessThanOrEqual(1);
    expect(Math.abs(shownTotal - (row!.principal + row!.interest))).toBeLessThanOrEqual(1);
    expect(shownValue).toBeGreaterThan(0);
  },
);
