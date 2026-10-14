import { createBdd, test as base } from 'playwright-bdd';
import { ApiClient } from '../api-clients/ApiClient';
import { EmiCalculatorPage } from '../pages/EmiCalculatorPage';
import { LegacyEmiCalculatorPage } from '../pages/LegacyEmiCalculatorPage';
import { blockAds } from '../support/adBlocker';

// loan inputs from the When step, used later to calculate the expected EMI
export interface LoanContext {
  principal?: number;
  ratePercent?: number;
  tenureMonths?: number;
  startMonth?: number; // 1-12
  startYear?: number;
}

type Fixtures = {
  apiClient: ApiClient;
  emiCalculatorPage: EmiCalculatorPage;
  legacyPage: LegacyEmiCalculatorPage;
  loanContext: LoanContext;
};

export const test = base.extend<Fixtures>({
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
  emiCalculatorPage: async ({ page }, use) => {
    await blockAds(page);
    await use(new EmiCalculatorPage(page));
  },
  legacyPage: async ({ page }, use) => {
    await blockAds(page);
    await use(new LegacyEmiCalculatorPage(page));
  },
  loanContext: async ({}, use) => {
    await use({});
  },
});

export const { Given, When, Then } = createBdd(test);
