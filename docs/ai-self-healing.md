# AI self-healing locators

How I'd detect broken locators, get an AI to suggest a fix, and validate that fix before anyone
applies it - plus a working POC (`npm run heal`).

## The broken locators

5 locators are broken on purpose, each a different kind of brittle that I've actually seen break
real suites. They live in [`tests/self-healing/brokenLocators.ts`](../tests/self-healing/brokenLocators.ts),
are used by [`LegacyEmiCalculatorPage`](../tests/pages/LegacyEmiCalculatorPage.ts), and exercised by
[`legacy-locators.feature`](../tests/features/self-healing/legacy-locators.feature).

| Key | Kind | Broken locator | Why it's brittle |
| --- | --- | --- | --- |
| loanAmountInput | positional CSS | `#emicalculatorform > div:nth-child(1) > div.col-6 > div > input` | Depends on exact nesting/order - one wrapper div added and it's gone |
| interestRateInput | absolute XPath | `/html/body/div[1]/div[2]/div/div[1]/form/div[2]/div[1]/div/input` | Breaks on any layout change anywhere above the element |
| loanTenureInput | renamed id | `#loan-tenure` (real id is `loanterm`) | Ids get renamed in refactors |
| personalLoanTab | stale text | `getByRole('link', { name: 'Personal Loans' })` | Copy changes ("Loans" -> "Loan") |
| pieChartContainer | auto-generated id | `#highcharts-n4re2cs-0` | Highcharts makes a new random id on **every page load** (seen `highcharts-3tcdaut-0`, `highcharts-n4re2cs-…`) |

They're kept out of the main run - `npm test` only runs the `api` and `ui` projects. The broken
ones run in their own `self-healing` project and fail by design:

```bash
npm run test:self-healing      # 5 failed - each times out waiting for its locator
npm run heal                   # detect -> suggest -> validate -> report (heuristic engine)
npm run heal -- --claude       # same, but Claude suggests the fix (needs ANTHROPIC_API_KEY in .env)
npm run heal -- --selftest     # proves the validator rejects bad suggestions
```

## The overall flow

```
test fails ──> is it a locator problem? ──no──> normal failure, a human looks at it
                     │ yes
                     v
        collect context (intent, fingerprint, error, page candidates)
                     v
        AI suggests a locator (as data, not code)
                     v
        validate on fresh page loads ──fail──> "needs a human"
                     │ pass
                     v
        report + suggested diff ──> human reviews ──> PR
```

The key rule: **the AI suggests, it never applies.** Healing can hide real bugs - if "Personal Loan"
was renamed by mistake, auto-healing the test would cover that up. So a person always decides.

## 1. Detection

**In CI (how I'd do it for real):** run the suite with the JSON reporter and look at failures. Only
some failures are locator problems - the healer should only pick up:

- `TimeoutError ... waiting for locator(...)` / `waiting for getByRole(...)` - element never showed up
- `strict mode violation: ... resolved to N elements` - locator now matches more than one thing
- `expect(locator).toBeVisible()` failing with the locator resolving to 0 elements

Assertion failures on values (EMI is ₹33,039 instead of ₹33,038), HTTP errors, or the site being
down are **not** locator problems and must not be "healed". The locator string in the error is mapped
back to the registry entry it came from.

**In the POC:** a health check. For each registered locator it opens a fresh page and checks the
locator resolves to exactly 1 visible element. Simpler and doesn't need a failed run first.

**Fingerprints.** Each locator has a fingerprint - what the element looked like the last time it
worked (tag, role, accessible name, id, classes, parent id). This is what makes healing possible:
without it, the AI only has a broken string and has to guess the intent. In the POC they're written
down by hand from the live site; in a real setup I'd record them automatically on every green run
(store the resolved element's attributes next to the locator) so they never go stale.

## 2. Prompt approach

**What gets sent** (see `claudeSuggest()` in [`tools/self-heal/suggest.ts`](../tools/self-heal/suggest.ts)):

- the **intent** in plain English ("Text input for the loan tenure (years)")
- the **broken locator** and the **error**
- the **fingerprint** from the last passing run
- a **pruned list of candidate elements** on the page: tag, id, role, accessible name, classes,
  parent id. Only visible elements, nothing inside `<svg>` (chart internals are hundreds of nodes
  of noise), capped at 400.

Not the raw HTML. The page HTML is huge, mostly ads/scripts/layout, and costs a lot of tokens for
no benefit. The candidate list is ~270 small objects for this page and has everything needed.

**System prompt rules** (the important parts):

- Prefer, in order: role + accessible name, label (form fields), test id, exact text, then CSS from
  a stable id or stable parent id + class.
- Never return XPath, positional selectors (`nth-child`), long chains, or generated-looking ids -
  "those are the reason locators break". Otherwise the AI happily "heals" a locator into another
  brittle one.
- Only use names/ids/classes that appear in the candidate list (stops it inventing selectors).
- If nothing clearly matches, return `"none"` instead of guessing.

**Output is structured data, not code.** The response is forced into a JSON schema
(`strategy`, `role`, `name`, `css`, `reasoning`, `confidence`) using structured outputs. The code
builds the Playwright locator from those fields itself - nothing the model returns is ever `eval`'d.

**Model settings:** `claude-opus-5-5` with `effort: 'low'` (it's a matching task, not deep
reasoning, and a suite can have many broken locators). Server-side `fallbacks: 'default'` is on, so
if a request is ever declined it's retried on a fallback model instead of just failing.

## 3. Validation before applying

A suggestion only gets "healed - ready for review" if **every** check passes
(`validate()` in [`tools/self-heal/heal.ts`](../tools/self-heal/heal.ts)):

1. **Not brittle itself** - no XPath, positional pseudo-classes, long chains or generated ids.
2. **Exactly 1 element** - on a fresh page load.
3. **Visible.**
4. **Same element as the fingerprint** - same tag, accessible name ≥ 80% similar, same parent id
   and classes if the fingerprint has them. This is what catches "right kind of element, wrong
   one" (e.g. healing the tenure field to the interest rate field - both are text inputs).
5. **Behaviour probe** - does it act like the right element? Inputs must be editable; clicking the
   Personal Loan tab must actually switch the form to "Personal Loan Amount"; the chart container
   must contain a rendered `<svg>`.
6. **Still exactly 1 element on a second fresh page load** - catches locators that only work for
   one load (generated ids).

Then it's still only a suggestion: the report has a diff per locator and a person applies it. In a
team I'd have the healer open a PR instead of a report, and re-run the affected scenarios on that
branch as the final check.

**Is the validator any good?** `npm run heal -- --selftest` feeds it 3 wrong suggestions on purpose:

| Bad suggestion | Why it's wrong | Rejected by |
| --- | --- | --- |
| tenure -> `getByLabel('Interest Rate')` | right kind of element, wrong field | fingerprint check |
| tab -> `locator('a')` | matches dozens of links | "exactly 1 element" |
| chart -> `#highcharts-3tcdaut-0` | generated id copied from one page load | brittleness check, and it finds 0 elements on the next loads |

All 3 rejected.

## POC results

Both engines healed all 5 on the live site, and every suggestion passed all 6 checks:

| Locator | Heuristic (`npm run heal`) | Claude (`npm run heal -- --claude`) |
| --- | --- | --- |
| loanAmountInput | `getByLabel('Home Loan Amount')` | `getByRole('textbox', { name: 'Home Loan Amount' })` |
| interestRateInput | `getByLabel('Interest Rate')` | `getByRole('textbox', { name: 'Interest Rate' })` |
| loanTenureInput | `getByLabel('Loan Tenure')` | `getByRole('textbox', { name: 'Loan Tenure' })` |
| personalLoanTab | `getByRole('link', { name: 'Personal Loan' })` | same |
| pieChartContainer | `locator('#emipiechart .highcharts-container')` | same |

Claude's reasoning for the chart is a good example of the prompt rules working - it found the element
but refused its id:

> The fingerprint is a div.highcharts-container whose parent is #emipiechart. Candidate 66 matches
> exactly, but its id (highcharts-cjrdczo-0) is auto-generated, so I avoid it. I use the stable
> parent id plus the class instead.

Full reports: [heuristic](../reports/self-healing/heal-report.heuristic.md) ·
[Claude](../reports/self-healing/heal-report.claude.md).

## Heuristic vs Claude - honest notes

- **Heuristic** (default, no API key): scores every candidate against the fingerprint (tag, role,
  name similarity, id similarity, parent, classes) and picks the best. It does well here because the
  fingerprints contain stable attributes (labels, parent ids). It gets less confident when two
  candidates score about the same.
- **Claude** (`--claude`): worth it when the fingerprint is weak or the page changed in a way plain
  string matching can't follow - e.g. the label text **and** the id both changed, or the element
  moved into a different section. It can use the intent ("loan tenure in years") and the
  surrounding context, which the heuristic can't. The validation step is the same either way, so a
  wrong AI answer still gets caught.
- On this page both engines land on equivalent answers (label vs role + name for the inputs - both
  resilient). That's expected: the fingerprints here are strong. The difference would show on a
  page that changed more than these 5 locators did.
- The Claude run needs an API key in `.env` (`ANTHROPIC_API_KEY=...`, see `.env.example`). `.env`
  is git-ignored so the key never gets committed.

## What I'd add next

- Record fingerprints automatically on green runs instead of by hand.
- Run detection from the Playwright JSON report in CI, and open a PR with the healed locators.
- Keep a healing history - a locator that needs healing every week means the page is unstable and
  should get a `data-testid` from the developers rather than another heal.
