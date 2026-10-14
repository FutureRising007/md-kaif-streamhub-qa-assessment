import type { Locator, Page } from '@playwright/test';

// One element from the page, boiled down to the stuff that's useful for finding it again.
export interface Candidate {
  idx: number;
  tag: string;
  id: string;
  role: string; // explicit role, or the implicit one for common tags
  name: string; // label / aria-label / visible text
  classes: string[];
  parentId: string;
  visible: boolean;
}

// What a healed locator looks like. Kept as data (not code) on purpose - we never eval
// anything the AI sends back, we build the Locator ourselves from these fields.
export interface LocatorSpec {
  strategy: 'role' | 'label' | 'text' | 'testid' | 'css' | 'none';
  role: string | null;
  name: string | null;
  css: string | null;
}

// Collects interactive/identifiable elements. Skips anything inside <svg> (chart internals
// would flood the list) and caps the size so the AI prompt stays small.
export async function collectCandidates(page: Page): Promise<Candidate[]> {
  // tsx/esbuild wraps named functions in a __name() helper that doesn't exist in the
  // browser, so page.evaluate blows up with "__name is not defined". Stub it out.
  await page.evaluate('globalThis.__name = globalThis.__name || ((f) => f)');
  return page.evaluate(() => {
    const implicitRole = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (tag === 'a' && el.hasAttribute('href')) return 'link';
      if (tag === 'button') return 'button';
      if (tag === 'select') return 'combobox';
      if (tag === 'textarea') return 'textbox';
      if (tag === 'input') return ({ checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button' } as Record<string, string>)[type] ?? 'textbox';
      if (/^h[1-6]$/.test(tag)) return 'heading';
      return '';
    };
    const nameOf = (el: Element) => {
      const aria = el.getAttribute('aria-label');
      if (aria) return aria.trim();
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`) as HTMLElement | null;
        if (label) return label.innerText.trim();
      }
      if (['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tagName.toLowerCase())) {
        return ((el as HTMLElement).innerText || '').trim().slice(0, 80);
      }
      return '';
    };

    const els = document.querySelectorAll('input, select, textarea, button, a, h1, h2, h3, h4, h5, h6, [role], [id]');
    const out = [];
    for (const el of Array.from(els)) {
      if (el.closest('svg') || ['SCRIPT', 'STYLE', 'LINK', 'META'].includes(el.tagName)) continue;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      out.push({
        idx: out.length,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        role: el.getAttribute('role') || implicitRole(el),
        name: nameOf(el),
        classes: Array.from(el.classList).slice(0, 4),
        parentId: el.parentElement?.id || '',
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      });
      if (out.length >= 400) break;
    }
    return out;
  });
}

// same shape as a Candidate, for the element a locator actually resolved to
export async function describeElement(loc: Locator) {
  return loc.evaluate((el) => {
    const tag = el.tagName.toLowerCase();
    let name = el.getAttribute('aria-label') || '';
    if (!name && el.id) name = (document.querySelector(`label[for="${el.id}"]`) as HTMLElement | null)?.innerText.trim() || '';
    if (!name && ['a', 'button'].includes(tag)) name = ((el as HTMLElement).innerText || '').trim();
    return { tag, id: el.id, name, classes: Array.from(el.classList), parentId: el.parentElement?.id || '' };
  });
}

export function toLocator(page: Page, spec: LocatorSpec): Locator {
  switch (spec.strategy) {
    case 'role':
      return page.getByRole(spec.role as Parameters<Page['getByRole']>[0], { name: spec.name ?? undefined, exact: true });
    case 'label':
      return page.getByLabel(spec.name!, { exact: true });
    case 'text':
      return page.getByText(spec.name!, { exact: true });
    case 'testid':
      return page.getByTestId(spec.name!);
    case 'css':
      return page.locator(spec.css!);
    default:
      throw new Error('no locator suggested');
  }
}

// the code you'd paste into the page object
export function toCode(spec: LocatorSpec): string {
  const q = (s: string | null) => `'${(s ?? '').replace(/'/g, "\\'")}'`;
  switch (spec.strategy) {
    case 'role':
      return `page.getByRole(${q(spec.role)}, { name: ${q(spec.name)}, exact: true })`;
    case 'label':
      return `page.getByLabel(${q(spec.name)}, { exact: true })`;
    case 'text':
      return `page.getByText(${q(spec.name)}, { exact: true })`;
    case 'testid':
      return `page.getByTestId(${q(spec.name)})`;
    case 'css':
      return `page.locator(${q(spec.css)})`;
    default:
      return '(none)';
  }
}

// ids like "highcharts-3tcdaut-0" change on every load - never use them in a locator
export function looksGenerated(id: string) {
  return /^highcharts-/.test(id) || /^[a-z]+-[a-z0-9]{6,}-\d+$/i.test(id) || /^(ember|react|mui|css)-?\d+/i.test(id);
}

// returns the reasons a suggested locator is itself brittle (empty = fine)
export function brittleness(spec: LocatorSpec): string[] {
  if (spec.strategy !== 'css') return [];
  const css = spec.css ?? '';
  const problems: string[] = [];
  if (/xpath=|^\/|^\(/.test(css)) problems.push('xpath');
  if (/:nth-(child|of-type)|:first-child|:last-child|:eq\(/.test(css)) problems.push('positional pseudo-class');
  if ((css.match(/>|\s+(?=[#.\w[])/g) ?? []).length > 2) problems.push('long selector chain');
  for (const m of css.matchAll(/#([\w-]+)/g)) if (looksGenerated(m[1]!)) problems.push(`generated id #${m[1]}`);
  return problems;
}

// 0..1, case/space-insensitive Levenshtein similarity
export function similarity(a = '', b = '') {
  a = a.toLowerCase().replace(/\s+/g, ' ').trim();
  b = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return 1 - dp[a.length]![b.length]! / Math.max(a.length, b.length);
}
