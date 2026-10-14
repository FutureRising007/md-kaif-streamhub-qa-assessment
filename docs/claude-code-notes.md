# Claude Code notes

My running notes while building this with Claude Code - I'll turn these into the reflection
section of the README at the end.

## Scaffolding

- Described the framework I wanted (playwright + cucumber, POM, env config, own API for B1) and
  had Claude scaffold the folders, page object, steps, config and API.
- The installed packages were newer than what Claude knew (playwright-bdd 9, TypeScript 7, Zod 4,
  Express 5) so I had it check the real type definitions in node_modules before writing config.
- Asked it to look at the real emicalculator.net DOM before writing any locators. Site has proper
  `<label for>`s, so getByLabel instead of CSS.
- Its first locator for the results did an exact match on the heading text - would have broken on
  "Total Payment" because there's a `<br>` inside that heading. Caught it by checking the DOM.
- Site computes totals from the unrounded EMI, multiplying the rounded EMI is off by a few rupees.
- First version of the code was way too "textbook" (doc comments on everything), told it to write
  plainer code.
- First run 9/9.

## Test Case 2 (bar chart)

- Had it inspect the slider ranges first: personal loan amount 0-30L step 10k, rate 5-25 step 0.25,
  tenure 0-5y step 0.25. Sliders are jQuery UI.
- Slider approach I went with: drag the handle to the approximate spot, then correct with arrow keys
  while reading the input value. Pure drag can be one step off from pixel rounding.
- Calendar is bootstrap-datepicker in month mode - step clicks next/prev year then the month.
- Bars are stacked (principal + interest per year), so "count the bars" is ambiguous. I check both:
  bars = calendar years the loan spans (6 for 60 months from Mar 2027), segments = 2x.
- Tooltip is validated against my own amortisation schedule (yearlySchedule in utils/emi.ts),
  not just "is there a number".
- Things Claude got wrong that I had to correct / debug:
  - it assumed the highcharts series had aria-labels to locate them by name - they don't (site doesn't
    load the accessibility module). Went with series index + check the tooltip shows the right series.
  - used `innerText` on SVG text - that's undefined on SVG, all years came back as undefined.
    Switched to textContent.
  - bar count came back 14 not 12 - the legend icons use the same classes as the bars. Scoped the
    locator to `.highcharts-series-group`.
  - hovering the interest bar got blocked by the Balance line's invisible 22px hover area.
  - then it was flaky: the previous tooltip was sitting on top of the next bar I wanted to hover
    (found it from the failure screenshot). Fix: move the mouse away and wait for the tooltip to
    hide before hovering.
- After fixes: 30/30 on `--repeat-each=3`.

## B2 (API tests)

- Had Claude turn the API steps into generic reusable ones ("every item should have X equal to Y",
  "items should be sorted by X", "the error should mention the X parameter") so new scenarios are mostly
  just Gherkin + Examples rows.
- Coverage: every filter, search, all 8 sort combos, pagination maths, page past the end, combined
  filters with an exact expected result, by-id lookups, 404s, ~30 invalid param cases, unknown routes.
- 75/75 passed first time - which made me suspicious, so I asked for a check that the tests can fail:
  planted 3 bugs in the API one at a time.
  - unknown params accepted -> 2 tests failed (good)
  - pagination off by one page -> 32 failed (good)
  - minRating `>` instead of `>=` -> only 1 failed, and only because one video happens to be rated
    exactly 4.5. The minRating=4.6 test still passed (it only checks every item is >= 4.6, and missing
    items don't break that). Added a "minimum rating is inclusive" boundary test -> now caught properly.
- Full suite 79/79 (76 api, 3 ui).

## AI self-healing

- Picked 5 broken locators that each break for a different real reason: positional CSS, absolute
  XPath, renamed id, stale link text, and a Highcharts auto-generated id (checked on the live site -
  it really is different on every load: `highcharts-3tcdaut-0` vs `highcharts-n4re2cs-...`).
- Kept them in a separate `self-healing` Playwright project so `npm test` stays green but they're
  still "left broken" as the brief asks. Confirmed all 5 fail for the right reason (timeout waiting
  for the locator), not something else.
- POC design decisions I made:
  - fingerprints (what the element looked like when it worked) - without these the AI is guessing
  - the AI returns JSON (strategy/role/name/css), never code - nothing gets eval'd
  - prompt sends a pruned candidate list, not raw HTML (svg internals stripped, ~270 elements)
  - validator checks on two fresh page loads + a behaviour probe, and nothing is auto-applied
  - heuristic engine as default so it runs without an API key (I didn't have one set up)
- Had Claude read the current Anthropic SDK docs first instead of writing the API call from memory -
  structured outputs + the refusal fallback option are newer than what it would have guessed.
- Issue hit: `page.evaluate` failed with `__name is not defined` when run through tsx. esbuild
  wraps named functions in a `__name()` helper that doesn't exist in the browser. Fixed with a stub.
- 5/5 healed. Then asked for proof the validator can say no: `--selftest` feeds it 3 wrong
  suggestions (wrong field, matches many, generated id) - all rejected for the right reasons.

## SQL (B4)

- Went with SQLite through Node's built-in `node:sqlite` - reviewers can run `npm run sql` with
  nothing to install. Queries are standard SQL apart from the time maths (Postgres version in a comment).
- Designed the test data around the edge cases first, then wrote the queries:
  - round trips: exactly 10%, 11%, exactly 24h, 25h, return goes to a third account, same direction
    twice, return bigger than original, one transfer with two returns, "B" sends first
  - IPL: exactly 30, a 29 breaking a run, two streaks for one player, did-not-bat mid-streak, a
    streak that only exists if 2023 is included
- Decisions I made and documented: 10% measured against the original amount, both limits inclusive,
  "consecutive" = consecutive matches the player batted in (not team matches).
- Used `* 10 <= amount` instead of `/ amount <= 0.1` to avoid floating point issues at exactly 10%,
  and `unixepoch()` seconds instead of julianday fractions for the exact-24h check.
- IPL query uses the gaps-and-islands trick (ROW_NUMBER over all innings minus ROW_NUMBER over 30+
  innings). Had Claude explain it step by step so I can explain it myself.
- runner checks results against expected rows, then I broke each boundary rule in the queries one at
  a time - all 6 caught by the data. Screenshots generated from the real output.

## Self-healing - Claude run

- Later got an API key and ran `npm run heal -- --claude` - worked first time, 5/5 healed and
  validated. Claude picked getByRole('textbox', {name}) where the heuristic picked getByLabel - both
  fine. For the chart it explicitly said it found the element but avoided its auto-generated id.
- The Claude run overwrote the heuristic report, so each engine now writes its own report file.
