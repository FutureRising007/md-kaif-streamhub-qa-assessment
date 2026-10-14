import type { Locator, Page } from '@playwright/test';
import { brokenLocators } from '../self-healing/brokenLocators';

// "Old" version of the page object with brittle locators - kept broken on purpose for the
// AI self-healing exercise. The real tests use EmiCalculatorPage.
export class LegacyEmiCalculatorPage {
  readonly page: Page;
  readonly loanAmount: Locator;
  readonly interestRate: Locator;
  readonly loanTenure: Locator;
  readonly personalLoanTab: Locator;
  readonly pieChart: Locator;

  constructor(page: Page) {
    this.page = page;
    const get = (key: string) => brokenLocators.find((b) => b.key === key)!.locate(page);
    this.loanAmount = get('loanAmountInput');
    this.interestRate = get('interestRateInput');
    this.loanTenure = get('loanTenureInput');
    this.personalLoanTab = get('personalLoanTab');
    this.pieChart = get('pieChartContainer');
  }

  async open() {
    await this.page.goto('/');
  }
}
