import { expect } from '@playwright/test';
import { When, Then } from '../../fixtures';
import { responseSchemas, type ResponseSchemaName, type ErrorBody } from '../../schemas/catalogue.schemas';

type Item = Record<string, unknown>;
type ListBody = { data: Item[]; meta: { page: number; limit: number; total: number; totalPages: number } };

// small helpers so the steps below stay short
const list = (body: unknown) => body as ListBody;
const items = (body: unknown) => list(body).data;
const ids = (arr: Item[]) => arr.map((i) => i.id);

When('I send a GET request to {string}', async ({ apiClient }, path: string) => {
  await apiClient.get(path);
});

// ---- status / shape ----

Then('the response status should be {int}', async ({ apiClient }, status: number) => {
  expect(apiClient.response.status(), JSON.stringify(apiClient.body)).toBe(status);
});

Then('the response should be JSON', async ({ apiClient }) => {
  expect(apiClient.response.headers()['content-type']).toContain('application/json');
});

Then('the response body should match the {string} schema', async ({ apiClient }, name: string) => {
  const schema = responseSchemas[name as ResponseSchemaName];
  expect(schema, `no schema called "${name}"`).toBeDefined();

  const res = schema.safeParse(apiClient.body);
  expect(res.success, res.success ? '' : JSON.stringify(res.error.issues, null, 2)).toBe(true);
});

// ---- lists ----

Then('the response should contain {int} item(s)', async ({ apiClient }, count: number) => {
  expect(items(apiClient.body)).toHaveLength(count);
});

Then('the pagination should be page {int} with limit {int}', async ({ apiClient }, page: number, limit: number) => {
  const body = list(apiClient.body);
  expect(body.meta.page).toBe(page);
  expect(body.meta.limit).toBe(limit);
  expect(body.data.length).toBeLessThanOrEqual(limit);
});

Then('the total should be {int} with {int} page(s)', async ({ apiClient }, total: number, pages: number) => {
  const { meta } = list(apiClient.body);
  expect(meta.total).toBe(total);
  expect(meta.totalPages).toBe(pages);
});

Then('every item should have {string} equal to {string}', async ({ apiClient }, field: string, value: string) => {
  const data = items(apiClient.body);
  expect(data.length, 'expected at least one item').toBeGreaterThan(0);
  for (const item of data) expect(String(item[field]), `item ${item.id}`).toBe(value);
});

Then('every item should have {string} of at least {float}', async ({ apiClient }, field: string, min: number) => {
  const data = items(apiClient.body);
  expect(data.length).toBeGreaterThan(0);
  for (const item of data) expect(Number(item[field]), `item ${item.id}`).toBeGreaterThanOrEqual(min);
});

Then('every item {string} should contain {string} ignoring case', async ({ apiClient }, field: string, text: string) => {
  const data = items(apiClient.body);
  expect(data.length).toBeGreaterThan(0);
  for (const item of data) expect(String(item[field]).toLowerCase()).toContain(text.toLowerCase());
});

Then('the items should be sorted by {string} in {word} order', async ({ apiClient }, field: string, order: string) => {
  const values = items(apiClient.body).map((i) => i[field]);
  expect(values.length).toBeGreaterThan(1);

  const sorted = [...values].sort((a, b) =>
    typeof a === 'string' ? a.localeCompare(String(b)) : Number(a) - Number(b),
  );
  if (order === 'descending') sorted.reverse();
  expect(values).toEqual(sorted);
});

Then('the item ids should be {string}', async ({ apiClient }, expected: string) => {
  expect(ids(items(apiClient.body))).toEqual(expected.split(',').map((s) => Number(s.trim())));
});

// fetches the full list separately and checks the current page is the right slice of it
Then('the items should be items {int} to {int} of {string}', async ({ apiClient, request }, from: number, to: number, fullPath: string) => {
  const full = await request.get(fullPath);
  expect(full.status()).toBe(200);
  const all = items(await full.json());
  expect(ids(items(apiClient.body))).toEqual(ids(all.slice(from - 1, to)));
});

// ---- single item ----

Then('the returned item should have id {int}', async ({ apiClient }, id: number) => {
  expect((apiClient.body as { data: Item }).data.id).toBe(id);
});

// ---- errors ----

Then('the error code should be {string}', async ({ apiClient }, code: string) => {
  expect((apiClient.body as ErrorBody).error.code).toBe(code);
});

Then('the error should mention the {string} parameter', async ({ apiClient }, param: string) => {
  const err = (apiClient.body as ErrorBody).error;
  expect(err.details.map((d) => d.field)).toContain(param);
});
