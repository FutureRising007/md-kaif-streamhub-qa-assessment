import { expect } from '@playwright/test';
import { Given, When, Then } from '../../fixtures';

Given('I open the EMI calculator with the legacy page object', async ({ legacyPage }) => {
  await legacyPage.open();
});

When('I type {string} into the legacy {string} field', async ({ legacyPage }, value: string, field: string) => {
  const input = { 'loan amount': legacyPage.loanAmount, 'interest rate': legacyPage.interestRate, 'loan tenure': legacyPage.loanTenure }[field];
  if (!input) throw new Error(`unknown field "${field}"`);
  await input.fill(value);
});

When('I click the legacy personal loan tab', async ({ legacyPage }) => {
  await legacyPage.personalLoanTab.click();
});

Then('the legacy pie chart should be visible', async ({ legacyPage }) => {
  await expect(legacyPage.pieChart).toBeVisible();
});
