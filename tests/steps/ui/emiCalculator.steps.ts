import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures';
import type { LoanType } from '../../pages/EmiCalculatorPage';
import { parseIndianAmount } from '../../utils/amount';
import { calculateEmi } from '../../utils/emi';

Given('I open the EMI calculator', async ({ emiCalculatorPage }) => {
  await emiCalculatorPage.open();
});

When('I select the {string} tab', async ({ emiCalculatorPage }, tab: string) => {
  await emiCalculatorPage.selectLoanType(tab as LoanType);
});

When(
  'I enter loan amount {string}, interest rate {float}% and tenure {int} years',
  async ({ emiCalculatorPage, loanContext }, amount: string, rate: number, years: number) => {
    loanContext.principal = parseIndianAmount(amount);
    loanContext.ratePercent = rate;
    loanContext.tenureMonths = years * 12;
    await emiCalculatorPage.enterLoanDetails(loanContext.principal, rate, years);
  },
);

Then('the displayed EMI should match my calculated EMI', async ({ emiCalculatorPage, loanContext }) => {
  const { principal, ratePercent, tenureMonths } = loanContext;
  const expected = calculateEmi(principal!, ratePercent!, tenureMonths!);

  // poll because the page recalculates async after the inputs change
  await expect.poll(() => emiCalculatorPage.getEmi()).toBe(expected.emi);
  expect(await emiCalculatorPage.getTotalInterest()).toBe(expected.totalInterest);
  expect(await emiCalculatorPage.getTotalPayment()).toBe(expected.totalPayment);
});

Then('the pie chart should be visible', async ({ emiCalculatorPage }) => {
  await expect(emiCalculatorPage.pieChart).toBeVisible();
});

Then('both pie chart sections should have values greater than zero', async ({ emiCalculatorPage }) => {
  const slices = await emiCalculatorPage.getPieChartValues();
  console.log('pie chart values:', slices);

  expect(slices).toHaveLength(2);
  for (const s of slices) {
    expect(s.value, `${s.name} should be > 0`).toBeGreaterThan(0);
  }
});
