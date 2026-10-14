import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { BrokenLocator, Fingerprint } from '../../tests/self-healing/brokenLocators';
import { looksGenerated, similarity, type Candidate, type LocatorSpec } from './dom';

export interface Suggestion {
  spec: LocatorSpec;
  reasoning: string;
  confidence: number; // 0..1
  engine: 'heuristic' | 'claude';
}

// ---------- heuristic (no AI, no API key needed) ----------

function score(fp: Fingerprint, c: Candidate) {
  let s = 0;
  if (c.tag === fp.tag) s += 3;
  if (fp.role && c.role === fp.role) s += 3;
  if (fp.name) s += 6 * similarity(fp.name, c.name);
  if (fp.id && c.id) s += 3 * similarity(fp.id, c.id);
  if (fp.parentId && c.parentId === fp.parentId) s += 3;
  for (const cls of fp.classes ?? []) if (c.classes.includes(cls)) s += 2;
  if (c.visible) s += 1;
  return s;
}

// best locator for a chosen element: role/label first, then a stable id, then stable parent + class
function specFor(c: Candidate): LocatorSpec {
  const none = { role: null, name: null, css: null };
  if (c.role === 'textbox' && c.name) return { ...none, strategy: 'label', name: c.name };
  if (c.role && c.name) return { ...none, strategy: 'role', role: c.role, name: c.name };
  if (c.id && !looksGenerated(c.id)) return { ...none, strategy: 'css', css: `#${c.id}` };
  if (c.parentId && !looksGenerated(c.parentId) && c.classes[0]) {
    return { ...none, strategy: 'css', css: `#${c.parentId} .${c.classes[0]}` };
  }
  return { ...none, strategy: 'none' };
}

export function heuristicSuggest(broken: BrokenLocator, candidates: Candidate[]): Suggestion {
  const ranked = candidates
    .map((c) => ({ c, s: score(broken.fingerprint, c) }))
    .sort((a, b) => b.s - a.s);
  const [best, second] = ranked;
  if (!best) return { spec: { strategy: 'none', role: null, name: null, css: null }, reasoning: 'no candidates on page', confidence: 0, engine: 'heuristic' };

  // max possible score depends on which fingerprint fields are filled in
  const fp = broken.fingerprint;
  const max = 3 + (fp.role ? 3 : 0) + (fp.name ? 6 : 0) + (fp.id ? 3 : 0) + (fp.parentId ? 3 : 0) + 2 * (fp.classes?.length ?? 0) + 1;
  let confidence = best.s / max;
  if (second && best.s - second.s < 1) confidence *= 0.6; // two elements look about the same - be careful

  return {
    spec: specFor(best.c),
    reasoning: `closest match to the fingerprint: <${best.c.tag}> id="${best.c.id}" name="${best.c.name}" (score ${best.s.toFixed(1)}/${max}` +
      (second ? `, runner-up ${second.s.toFixed(1)})` : ')'),
    confidence: Math.round(confidence * 100) / 100,
    engine: 'heuristic',
  };
}

// ---------- Claude ----------

const SuggestionSchema = z.object({
  strategy: z.enum(['role', 'label', 'text', 'testid', 'css', 'none']),
  role: z.string().nullable(),
  name: z.string().nullable(),
  css: z.string().nullable(),
  reasoning: z.string(),
  confidence: z.number(),
});

const SYSTEM = `You repair broken Playwright locators in an end-to-end test suite.

You get: what the locator was meant to find, the broken locator and its error, a fingerprint of
the element from the last passing run, and a list of candidate elements currently on the page.

Pick the candidate that is the same element the test meant, and return a locator for it.
Prefer, in order: role + accessible name, label (for form fields), test id, exact text, and only
then a CSS selector built from a stable id or a stable parent id plus a class.
Never return XPath, positional selectors (nth-child, nth-of-type), long selector chains, or ids
that look auto-generated (random letters/digits, e.g. "highcharts-3tcdaut-0") - those are the
reason locators break.
Only use names, ids and classes that appear in the candidate list. If no candidate clearly
matches the intent, return strategy "none" rather than guessing.
confidence is 0 to 1.`;

export async function claudeSuggest(client: Anthropic, broken: BrokenLocator, error: string, candidates: Candidate[]): Promise<Suggestion> {
  // only visible candidates, minus empty noise, keeps the prompt small
  const list = candidates.filter((c) => c.visible && (c.id || c.name || c.role)).map(({ visible, ...rest }) => rest);

  const res = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // if the request is ever declined, the API retries it on a fallback model
    output_config: { effort: 'low', format: betaZodOutputFormat(SuggestionSchema) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: JSON.stringify(
          { intent: broken.intent, brokenLocator: broken.source, error, lastKnownFingerprint: broken.fingerprint, candidates: list },
          null,
          1,
        ),
      },
    ],
  });

  if (res.stop_reason === 'refusal' || !res.parsed_output) {
    return { spec: { strategy: 'none', role: null, name: null, css: null }, reasoning: `no usable answer (stop_reason=${res.stop_reason})`, confidence: 0, engine: 'claude' };
  }
  const { reasoning, confidence, ...spec } = res.parsed_output;
  return { spec, reasoning, confidence: Math.max(0, Math.min(1, confidence)), engine: 'claude' };
}
