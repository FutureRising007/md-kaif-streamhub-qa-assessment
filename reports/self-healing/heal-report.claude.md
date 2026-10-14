# Self-healing report

- Generated: 2026-10-14T13:35:37.989Z
- Engine: **claude (claude-opus-5-5)**
- Site: https://emicalculator.net
- Nothing in the code was changed. Review each suggestion and apply it by hand.

| Locator | Kind | Suggested | Confidence | Checks | Status |
| --- | --- | --- | --- | --- | --- |
| loanAmountInput | positional CSS | `page.getByRole('textbox', { name: 'Home Loan Amount', exact: true })` | 0.95 | 6/6 | healed - ready for review |
| interestRateInput | absolute XPath | `page.getByRole('textbox', { name: 'Interest Rate', exact: true })` | 0.95 | 6/6 | healed - ready for review |
| loanTenureInput | renamed id | `page.getByRole('textbox', { name: 'Loan Tenure', exact: true })` | 0.96 | 6/6 | healed - ready for review |
| personalLoanTab | stale text | `page.getByRole('link', { name: 'Personal Loan', exact: true })` | 0.95 | 6/6 | healed - ready for review |
| pieChartContainer | auto-generated id | `page.locator('#emipiechart .highcharts-container')` | 0.93 | 6/6 | healed - ready for review |

## loanAmountInput

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (claude):** Candidate 39 matches the fingerprint exactly (input, textbox, 'Home Loan Amount', id loanamount). Role plus accessible name is the preferred stable locator.

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <input> id="loanamount" name="Home Loan Amount"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('#emicalculatorform > div:nth-child(1) > div.col-6 > div > input')
+ page.getByRole('textbox', { name: 'Home Loan Amount', exact: true })
```

## interestRateInput

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (claude):** Candidate idx 42 matches the fingerprint exactly: an input with role textbox, name 'Interest Rate' and id 'loaninterest'. Role plus accessible name is the preferred strategy. No other textbox has this name.

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <input> id="loaninterest" name="Interest Rate"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('xpath=/html/body/div[1]/div[2]/div/div[1]/form/div[2]/div[1]/div/input')
+ page.getByRole('textbox', { name: 'Interest Rate', exact: true })
```

## loanTenureInput

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (claude):** Candidate idx 45 is an input with role textbox, name 'Loan Tenure' and id 'loanterm', matching the last known fingerprint exactly. Role plus accessible name is the preferred strategy.

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <input> id="loanterm" name="Loan Tenure"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('#loan-tenure')
+ page.getByRole('textbox', { name: 'Loan Tenure', exact: true })
```

## personalLoanTab

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (claude):** Candidate 33 is an anchor with role link, name 'Personal Loan', and parentId 'personal-loan', which matches the fingerprint exactly. The broken locator used the plural 'Personal Loans'.

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <a> id="" name="Personal Loan" parent="#personal-loan"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.getByRole('link', { name: 'Personal Loans' })
+ page.getByRole('link', { name: 'Personal Loan', exact: true })
```

## pieChartContainer

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (claude):** The fingerprint is a div.highcharts-container whose parent is #emipiechart. Candidate 66 matches exactly, but its id (highcharts-cjrdczo-0) is auto-generated, so I avoid it. I use the stable parent id plus the class instead.

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <div> id="highcharts-7ozazs1-0" name="" parent="#emipiechart"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('#highcharts-n4re2cs-0')
+ page.locator('#emipiechart .highcharts-container')
```
