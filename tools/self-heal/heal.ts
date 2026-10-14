// Self-healing locator POC.
//
//   npm run heal                 heuristic engine (no API key needed)
//   npm run heal -- --claude     ask Claude for the fix (needs ANTHROPIC_API_KEY or `ant auth login`)
//
// 1. detect   - check every registered locator against the live page
// 2. suggest  - for broken ones, propose a new locator (heuristic or Claude)
// 3. validate - try the suggestion on fresh page loads: not brittle, exactly 1 element, visible,
//               same element as the fingerprint, behaviour probe passes
// 4. report   - write reports/self-healing/heal-report.<engine>.md + .json
//
// It never edits the code. A person reviews the report and applies the patch.

import Anthropic from '@anthropic-ai/sdk';
import { chromium, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { brokenLocators, type BrokenLocator } from '../../tests/self-healing/brokenLocators';
import { blockAds } from '../../tests/support/adBlocker';
import { env } from '../../tests/support/env';
import { brittleness, collectCandidates, describeElement, similarity, toCode, toLocator } from './dom';
import { claudeSuggest, heuristicSuggest, type Suggestion } from './suggest';

const args = process.argv.slice(2);
const useClaude = args.includes('--claude');
const OUT_DIR = 'reports/self-healing';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface Result {
  key: string;
  kind: string;
  broken: string;
  error: string | null;
  suggestion?: Suggestion;
  checks: Check[];
  status: 'healthy' | 'healed - ready for review' | 'needs a human';
}

async function freshPage(browser: Browser) {
  const page = await browser.newPage();
  await blockAds(page);
  await page.goto(env.UI_BASE_URL);
  await page.getByLabel('Interest Rate', { exact: true }).waitFor();
  await page.locator('#emipiechart svg').first().waitFor(); // charts render a bit after load
  return page;
}

const firstLine = (e: unknown) => String(e instanceof Error ? e.message : e).split('\n')[0]!.slice(0, 160);

async function detect(b: BrokenLocator, browser: Browser): Promise<string | null> {
  const page = await freshPage(browser);
  try {
    const loc = b.locate(page);
    const n = await loc.count();
    if (n !== 1) return `locator resolved to ${n} elements (expected 1)`;
    if (!(await loc.isVisible())) return 'element found but not visible';
    return null;
  } finally {
    await page.close();
  }
}

async function validate(b: BrokenLocator, s: Suggestion, browser: Browser): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail = '') => checks.push({ name, ok, detail });

  if (s.spec.strategy === 'none') {
    add('a locator was suggested', false, s.reasoning);
    return checks;
  }
  const problems = brittleness(s.spec);
  add('suggestion is not brittle itself', problems.length === 0, problems.join(', ') || 'ok');

  // two separate page loads - catches things like generated ids that only work once
  for (const load of [1, 2]) {
    const page = await freshPage(browser);
    try {
      const loc = toLocator(page, s.spec);
      const n = await loc.count();
      add(`load ${load}: matches exactly 1 element`, n === 1, `${n} found`);
      if (n !== 1 || load === 2) continue;

      add('element is visible', await loc.isVisible());

      const el = await describeElement(loc);
      const fp = b.fingerprint;
      const same =
        el.tag === fp.tag &&
        (!fp.name || similarity(fp.name, el.name) >= 0.8) &&
        (!fp.parentId || el.parentId === fp.parentId) &&
        (fp.classes ?? []).every((c) => el.classes.includes(c));
      add('same element as the fingerprint', same, `<${el.tag}> id="${el.id}" name="${el.name}"${el.parentId ? ` parent="#${el.parentId}"` : ''}`);

      try {
        await b.probe(loc, page);
        add('behaviour probe passes', true, 'ok');
      } catch (e) {
        add('behaviour probe passes', false, firstLine(e));
      }
    } finally {
      await page.close();
    }
  }
  return checks;
}

// one report per engine so a claude run doesn't overwrite the heuristic one
function writeReport(results: Result[], engine: string) {
  const name = `heal-report.${useClaude ? 'claude' : 'heuristic'}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify({ engine, site: env.UI_BASE_URL, results }, null, 2));

  const lines = [
    '# Self-healing report',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Engine: **${engine}**`,
    `- Site: ${env.UI_BASE_URL}`,
    '- Nothing in the code was changed. Review each suggestion and apply it by hand.',
    '',
    '| Locator | Kind | Suggested | Confidence | Checks | Status |',
    '| --- | --- | --- | --- | --- | --- |',
    ...results.map((r) => {
      const passed = r.checks.filter((c) => c.ok).length;
      const sug = r.suggestion ? `\`${toCode(r.suggestion.spec)}\`` : '-';
      return `| ${r.key} | ${r.kind} | ${sug} | ${r.suggestion?.confidence ?? '-'} | ${r.checks.length ? `${passed}/${r.checks.length}` : '-'} | ${r.status} |`;
    }),
    '',
  ];

  for (const r of results.filter((x) => x.suggestion)) {
    lines.push(
      `## ${r.key}`,
      '',
      `**Detected:** ${r.error}`,
      '',
      `**Why this element (${r.suggestion!.engine}):** ${r.suggestion!.reasoning}`,
      '',
      ...r.checks.map((c) => `- [${c.ok ? 'x' : ' '}] ${c.name}${c.detail && c.detail !== 'ok' ? ` - ${c.detail}` : ''}`),
      '',
      '```diff',
      `- ${r.broken}`,
      `+ ${toCode(r.suggestion!.spec)}`,
      '```',
      '',
    );
  }
  fs.writeFileSync(path.join(OUT_DIR, `${name}.md`), lines.join('\n'));
}

// Feeds the validator suggestions that are wrong on purpose - each one must be rejected,
// otherwise the "healed" results above don't mean much.
async function selftest() {
  const none = { role: null, name: null, css: null };
  const bad: { key: string; why: string; s: Suggestion }[] = [
    { key: 'loanTenureInput', why: 'right kind of element, wrong field', s: { spec: { ...none, strategy: 'label', name: 'Interest Rate' }, reasoning: '', confidence: 1, engine: 'heuristic' } },
    { key: 'personalLoanTab', why: 'matches several elements', s: { spec: { ...none, strategy: 'css', css: 'a' }, reasoning: '', confidence: 1, engine: 'heuristic' } },
    { key: 'pieChartContainer', why: 'brittle: generated id from this page load', s: { spec: { ...none, strategy: 'css', css: '#highcharts-3tcdaut-0' }, reasoning: '', confidence: 1, engine: 'heuristic' } },
  ];
  const browser = await chromium.launch();
  let ok = true;
  try {
    for (const t of bad) {
      const b = brokenLocators.find((x) => x.key === t.key)!;
      const failed = (await validate(b, t.s, browser)).filter((c) => !c.ok).map((c) => c.name);
      const rejected = failed.length > 0;
      ok &&= rejected;
      console.log(`  ${rejected ? 'rejected' : 'ACCEPTED (bad!)'}  ${t.key}: ${toCode(t.s.spec)} - ${t.why}${rejected ? ` [failed: ${failed.join('; ')}]` : ''}`);
    }
  } finally {
    await browser.close();
  }
  console.log(ok ? '\nvalidator rejected every bad suggestion' : '\nvalidator let a bad suggestion through!');
  if (!ok) process.exit(1);
}

async function main() {
  if (args.includes('--selftest')) return selftest();
  const engine = useClaude ? 'claude (claude-opus-5-5)' : 'heuristic';
  console.log(`self-heal: engine=${engine}, site=${env.UI_BASE_URL}\n`);

  const client = useClaude ? new Anthropic() : null;
  const browser = await chromium.launch();
  const results: Result[] = [];

  try {
    // candidates are collected once from a clean page
    const page = await freshPage(browser);
    const candidates = await collectCandidates(page);
    await page.close();
    console.log(`collected ${candidates.length} candidate elements from the page`);

    for (const b of brokenLocators) {
      const error = await detect(b, browser);
      if (!error) {
        console.log(`  ok      ${b.key}`);
        results.push({ key: b.key, kind: b.kind, broken: b.source, error: null, checks: [], status: 'healthy' });
        continue;
      }

      const suggestion = client ? await claudeSuggest(client, b, error, candidates) : heuristicSuggest(b, candidates);
      const checks = await validate(b, suggestion, browser);
      const status = checks.every((c) => c.ok) ? 'healed - ready for review' : 'needs a human';
      console.log(`  BROKEN  ${b.key} (${b.kind}) -> ${toCode(suggestion.spec)}  [${status}]`);
      results.push({ key: b.key, kind: b.kind, broken: b.source, error, suggestion, checks, status });
    }
  } finally {
    await browser.close();
  }

  writeReport(results, engine);
  const healed = results.filter((r) => r.status.startsWith('healed')).length;
  const broken = results.filter((r) => r.status !== 'healthy').length;
  console.log(`\n${healed}/${broken} broken locators healed and validated. Report: ${OUT_DIR}/heal-report.${useClaude ? 'claude' : 'heuristic'}.md`);
}

main().catch((e) => {
  if (e instanceof Anthropic.AuthenticationError) {
    console.error('Claude auth failed - set ANTHROPIC_API_KEY (or run `ant auth login`), or run without --claude.');
  } else if (e instanceof Anthropic.RateLimitError) {
    console.error('Rate limited by the Claude API - try again in a bit.');
  } else if (e instanceof Anthropic.APIError) {
    console.error(`Claude API error ${e.status}: ${e.message}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
