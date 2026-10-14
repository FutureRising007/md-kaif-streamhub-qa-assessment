import type { APIRequestContext, APIResponse } from '@playwright/test';

// keeps the last response around so the Then steps can check it
export class ApiClient {
  private request: APIRequestContext;
  private lastRes?: APIResponse;
  private lastBody?: unknown;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async get(path: string) {
    this.lastRes = await this.request.get(path);
    const text = await this.lastRes.text();
    try {
      this.lastBody = JSON.parse(text);
    } catch {
      this.lastBody = text;
    }
  }

  get response() {
    if (!this.lastRes) throw new Error('no request sent yet');
    return this.lastRes;
  }

  get body() {
    return this.lastBody;
  }
}
