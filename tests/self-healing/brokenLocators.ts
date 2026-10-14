import { expect, type Locator, type Page } from '@playwright/test';

// What the element looked like the last time the locator worked. In a real setup this
// would be recorded automatically on a green run; here it's written down from the live site.
export interface Fingerprint {
  tag: string;
  role?: string; // implicit or explicit aria role
  name?: string; // accessible name (label text, link text...)
  id?: string;
  classes?: string[];
  parentId?: string;
}

export interface BrokenLocator {
  key: string;
  kind: string; // what sort of brittle it is
  intent: string; // plain english - what the locator is supposed to find
  source: string; // the locator as it's written in LegacyEmiCalculatorPage
  locate: (page: Page) => Locator;
  fingerprint: Fingerprint;
  // quick behaviour check used to validate a healed locator (not just "it found something")
  probe: (loc: Locator, page: Page) => Promise<void>;
}

// !!! These are broken ON PURPOSE for the self-healing exercise. Don't fix them here -
// see docs/ai-self-healing.md and `npm run heal`.
export const brokenLocators: BrokenLocator[] = [
  {
    key: 'loanAmountInput',
    kind: 'positional CSS',
    intent: 'Text input where the user types the loan amount on the Home Loan tab',
    source: `page.locator('#emicalculatorform > div:nth-child(1) > div.col-6 > div > input')`,
    locate: (page) => page.locator('#emicalculatorform > div:nth-child(1) > div.col-6 > div > input'),
    fingerprint: { tag: 'input', role: 'textbox', name: 'Home Loan Amount', id: 'loanamount' },
    probe: async (loc) => expect(loc).toBeEditable(),
  },
  {
    key: 'interestRateInput',
    kind: 'absolute XPath',
    intent: 'Text input for the yearly interest rate',
    source: `page.locator('xpath=/html/body/div[1]/div[2]/div/div[1]/form/div[2]/div[1]/div/input')`,
    locate: (page) => page.locator('xpath=/html/body/div[1]/div[2]/div/div[1]/form/div[2]/div[1]/div/input'),
    fingerprint: { tag: 'input', role: 'textbox', name: 'Interest Rate', id: 'loaninterest' },
    probe: async (loc) => expect(loc).toBeEditable(),
  },
  {
    key: 'loanTenureInput',
    kind: 'renamed id',
    intent: 'Text input for the loan tenure (years)',
    source: `page.locator('#loan-tenure')`,
    locate: (page) => page.locator('#loan-tenure'),
    fingerprint: { tag: 'input', role: 'textbox', name: 'Loan Tenure', id: 'loanterm' },
    probe: async (loc) => expect(loc).toBeEditable(),
  },
  {
    key: 'personalLoanTab',
    kind: 'stale text',
    intent: 'The "Personal Loan" tab link at the top of the calculator',
    source: `page.getByRole('link', { name: 'Personal Loans' })`,
    locate: (page) => page.getByRole('link', { name: 'Personal Loans' }),
    fingerprint: { tag: 'a', role: 'link', name: 'Personal Loan', parentId: 'personal-loan' },
    probe: async (loc, page) => {
      await loc.click();
      await expect(page.getByLabel('Personal Loan Amount', { exact: true })).toBeVisible();
    },
  },
  {
    key: 'pieChartContainer',
    kind: 'auto-generated id',
    intent: 'The container the EMI breakdown pie chart is drawn in',
    // highcharts makes a new random id on every page load
    source: `page.locator('#highcharts-n4re2cs-0')`,
    locate: (page) => page.locator('#highcharts-n4re2cs-0'),
    fingerprint: { tag: 'div', classes: ['highcharts-container'], parentId: 'emipiechart' },
    probe: async (loc) => expect(loc.locator('svg').first()).toBeVisible(),
  },
];
