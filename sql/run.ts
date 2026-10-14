// Runs both SQL scenarios on a fresh in-memory SQLite db (node:sqlite, nothing to install),
// checks the output against the expected rows, and saves results + screenshots.
//
//   npm run sql

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, unknown>;

interface Scenario {
  dir: string;
  title: string;
  expected: Row[];
}

const scenarios: Scenario[] = [
  {
    dir: '01_round_trip_transfers',
    title: 'Scenario 1 - Round-trip transfers (within 10%, within 24h)',
    // one row per pair from data.sql marked MATCH
    expected: [
      { account_a: 'ACC-A', account_b: 'ACC-B', sent_txn: 1, returned_txn: 2 },
      { account_a: 'ACC-E', account_b: 'ACC-F', sent_txn: 5, returned_txn: 6 },
      { account_a: 'ACC-I', account_b: 'ACC-J', sent_txn: 9, returned_txn: 10 },
      { account_a: 'ACC-P', account_b: 'ACC-Q', sent_txn: 15, returned_txn: 16 },
      { account_a: 'ACC-R', account_b: 'ACC-S', sent_txn: 17, returned_txn: 18 },
      { account_a: 'ACC-R', account_b: 'ACC-S', sent_txn: 17, returned_txn: 19 },
      { account_a: 'ACC-V', account_b: 'ACC-U', sent_txn: 21, returned_txn: 20 },
    ],
  },
  {
    dir: '02_ipl_streaks',
    title: 'Scenario 2 - IPL 2024: 30+ runs in 3+ consecutive matches',
    expected: [
      { player_name: 'Mohammad Kaif Ahmed', streak_start_date: '2024-03-22', matches_in_streak: 3 },
      { player_name: 'Rohan Kale', streak_start_date: '2024-03-22', matches_in_streak: 3 },
      { player_name: 'Dev Malhotra', streak_start_date: '2024-03-24', matches_in_streak: 3 },
      { player_name: 'Nikhil Bose', streak_start_date: '2024-03-24', matches_in_streak: 5 },
      { player_name: 'Rohan Kale', streak_start_date: '2024-04-07', matches_in_streak: 4 },
    ],
  },
];

const read = (dir: string, file: string) => fs.readFileSync(path.join('sql', dir, file), 'utf8');

function run(s: Scenario) {
  const db = new DatabaseSync(':memory:');
  db.exec(read(s.dir, 'schema.sql'));
  db.exec(read(s.dir, 'data.sql'));
  const query = read(s.dir, 'query.sql');
  const rows = db.prepare(query).all() as Row[];
  db.close();

  // compare only the columns listed in expected, in order
  const problems: string[] = [];
  if (rows.length !== s.expected.length) problems.push(`expected ${s.expected.length} rows, got ${rows.length}`);
  s.expected.forEach((exp, i) => {
    for (const [k, v] of Object.entries(exp)) {
      if (rows[i]?.[k] !== v) problems.push(`row ${i + 1}: ${k} expected ${JSON.stringify(v)}, got ${JSON.stringify(rows[i]?.[k])}`);
    }
  });
  return { rows, query, problems };
}

const esc = (v: unknown) => String(v ?? 'NULL').replace(/&/g, '&amp;').replace(/</g, '&lt;');

function toMarkdown(rows: Row[]) {
  if (!rows.length) return '_no rows_';
  const cols = Object.keys(rows[0]!);
  return [`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${cols.map((c) => r[c]).join(' | ')} |`)].join('\n');
}

function toHtml(s: Scenario, rows: Row[], query: string, ok: boolean) {
  const cols = Object.keys(rows[0] ?? {});
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font: 14px/1.4 Segoe UI, Arial, sans-serif; margin: 24px; color: #1f2328; background: #fff; }
    h2 { margin: 0 0 4px; font-size: 18px; }
    .meta { color: #57606a; margin-bottom: 12px; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 12px; font: 12px/1.45 Consolas, monospace; white-space: pre-wrap; }
    table { border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #d0d7de; padding: 5px 10px; text-align: left; font-size: 13px; }
    th { background: #f6f8fa; }
    .ok { color: #1a7f37; font-weight: 600; } .bad { color: #cf222e; font-weight: 600; }
  </style></head><body>
    <h2>${esc(s.title)}</h2>
    <div class="meta">SQLite ${esc(new DatabaseSync(':memory:').prepare('select sqlite_version() v').get()!.v)} &middot; ${rows.length} rows &middot;
      <span class="${ok ? 'ok' : 'bad'}">${ok ? 'matches expected result' : 'DOES NOT match expected result'}</span></div>
    <pre>${esc(query.trim())}</pre>
    <table><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('\n')}</table>
  </body></html>`;
}

async function main() {
  fs.mkdirSync('sql/results', { recursive: true });
  fs.mkdirSync('sql/screenshots', { recursive: true });
  const browser = await chromium.launch();
  let allOk = true;

  try {
    for (const s of scenarios) {
      const { rows, query, problems } = run(s);
      const ok = problems.length === 0;
      allOk &&= ok;

      console.log(`\n${s.title}`);
      console.table(rows);
      console.log(ok ? '  -> matches expected result' : `  -> MISMATCH:\n     ${problems.join('\n     ')}`);

      fs.writeFileSync(path.join('sql/results', `${s.dir}.md`), `# ${s.title}\n\n${toMarkdown(rows)}\n`);

      const page = await browser.newPage({ viewport: { width: 1150, height: 600 } });
      await page.setContent(toHtml(s, rows, query, ok));
      await page.screenshot({ path: path.join('sql/screenshots', `${s.dir}.png`), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(allOk ? '\nAll SQL scenarios match the expected results.' : '\nSome SQL results did not match!');
  if (!allOk) process.exit(1);
}

main();
