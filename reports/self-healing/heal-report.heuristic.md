# Self-healing report

- Generated: 2026-10-14T13:37:48.482Z
- Engine: **heuristic**
- Site: https://emicalculator.net
- Nothing in the code was changed. Review each suggestion and apply it by hand.

| Locator | Kind | Suggested | Confidence | Checks | Status |
| --- | --- | --- | --- | --- | --- |
| loanAmountInput | positional CSS | `page.getByLabel('Home Loan Amount', { exact: true })` | 1 | 6/6 | healed - ready for review |
| interestRateInput | absolute XPath | `page.getByLabel('Interest Rate', { exact: true })` | 1 | 6/6 | healed - ready for review |
| loanTenureInput | renamed id | `page.getByLabel('Loan Tenure', { exact: true })` | 1 | 6/6 | healed - ready for review |
| personalLoanTab | stale text | `page.getByRole('link', { name: 'Personal Loan', exact: true })` | 1 | 6/6 | healed - ready for review |
| pieChartContainer | auto-generated id | `page.locator('#emipiechart .highcharts-container')` | 1 | 6/6 | healed - ready for review |

## loanAmountInput

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (heuristic):** closest match to the fingerprint: <input> id="loanamount" name="Home Loan Amount" (score 16.0/16, runner-up 10.4)

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <input> id="loanamount" name="Home Loan Amount"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('#emicalculatorform > div:nth-child(1) > div.col-6 > div > input')
+ page.getByLabel('Home Loan Amount', { exact: true })
```

## interestRateInput

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (heuristic):** closest match to the fingerprint: <input> id="loaninterest" name="Interest Rate" (score 16.0/16, runner-up 9.7)

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <input> id="loaninterest" name="Interest Rate"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('xpath=/html/body/div[1]/div[2]/div/div[1]/form/div[2]/div[1]/div/input')
+ page.getByLabel('Interest Rate', { exact: true })
```

## loanTenureInput

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (heuristic):** closest match to the fingerprint: <input> id="loanterm" name="Loan Tenure" (score 16.0/16, runner-up 10.4)

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <input> id="loanterm" name="Loan Tenure"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('#loan-tenure')
+ page.getByLabel('Loan Tenure', { exact: true })
```

## personalLoanTab

**Detected:** locator resolved to 0 elements (expected 1)

**Why this element (heuristic):** closest match to the fingerprint: <a> id="" name="Personal Loan" (score 16.0/16, runner-up 9.8)

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

**Why this element (heuristic):** closest match to the fingerprint: <div> id="highcharts-yeriy5w-0" name="" (score 9.0/9, runner-up 6.0)

- [x] suggestion is not brittle itself
- [x] load 1: matches exactly 1 element - 1 found
- [x] element is visible
- [x] same element as the fingerprint - <div> id="highcharts-unvckx8-0" name="" parent="#emipiechart"
- [x] behaviour probe passes
- [x] load 2: matches exactly 1 element - 1 found

```diff
- page.locator('#highcharts-n4re2cs-0')
+ page.locator('#emipiechart .highcharts-container')
```
