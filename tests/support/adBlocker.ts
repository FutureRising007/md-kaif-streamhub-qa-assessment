import type { Page } from '@playwright/test';

// emicalculator.net loads a bunch of ad iframes that shift the layout and sometimes
// cover the sliders, so just kill them at the network level
const adHosts = [
  /googlesyndication\.com$/,
  /doubleclick\.net$/,
  /googleadservices\.com$/,
  /adservice\.google\./,
  /fundingchoicesmessages\.google\.com$/,
  /amazon-adsystem\.com$/,
  /adnxs\.com$/,
  /taboola\.com$/,
  /outbrain\.com$/,
  /criteo\.(com|net)$/,
  /pubmatic\.com$/,
  /rubiconproject\.com$/,
  /media\.net$/,
];

export async function blockAds(page: Page) {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return adHosts.some((h) => h.test(host)) ? route.abort() : route.continue();
  });
}
