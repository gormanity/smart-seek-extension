import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  closePage,
  launchExtensionContext,
  startFixtureServer,
  type FixtureServer,
} from './extension-fixture';

let server: FixtureServer;
let contexts: BrowserContext[] = [];

test.beforeAll(async () => {
  server = await startFixtureServer();
});

test.afterAll(async () => {
  await Promise.all(contexts.map((context) => context.close()));
  contexts = [];
  await server?.close();
});

test('dev build marks production disabled without an open YouTube TV tab', async () => {
  const { context, extensionIds } = await launchExtensionContext('prod-and-dev');
  contexts.push(context);

  const popupPage = await openProductionPopup(context, extensionIds);

  await expect(popupPage.locator('#duplicate-banner')).toBeVisible();
  await expectProductionBadgeText(context, extensionIds, 'OFF');
  await closePage(popupPage);
  await context.close();
});

test('production build seeks on the YouTube TV fixture', async () => {
  const { context, page } = await openFixturePage('prod');

  await pressForwardSeek(page);

  await expectVideoTime(page, 15);
  await expect(page.locator('.smart-seek-osd')).toHaveCount(1);
  await closePage(page);
  await context.close();
});

test('dev build wins when production and dev are installed together', async () => {
  const { context, extensionIds, page } = await openFixturePage('prod-and-dev');

  await pressForwardSeek(page);

  await expectVideoTime(page, 15);
  await expect(page.locator('.smart-seek-osd')).toHaveCount(1);

  const popupPage = await openProductionPopup(context, extensionIds);
  await expect(popupPage.locator('#duplicate-banner')).toBeVisible();
  await expectProductionBadgeText(context, extensionIds, 'OFF');
  await closePage(popupPage);
  await closePage(page);
  await context.close();
});

test('production resumes on YouTube TV after dev heartbeat staleness', async () => {
  const { context, page } = await openFixturePage('prod');

  await emitDevHeartbeat(page);
  await page.waitForTimeout(600);
  await pressForwardSeek(page);
  await expectVideoTime(page, 10);

  await page.waitForTimeout(3500);
  await pressForwardSeek(page);
  await expectVideoTime(page, 15);
  await closePage(page);
  await context.close();
});

async function openFixturePage(mode: 'prod' | 'prod-and-dev'): Promise<{
  context: BrowserContext;
  extensionIds: string[];
  page: Page;
}> {
  const { context, extensionIds } = await launchExtensionContext(mode);
  contexts.push(context);
  const page = await context.newPage();
  await page.goto(`${server.youtubeTvOrigin}/`);
  await expectVideoTime(page, 10);
  await page.waitForTimeout(700);
  return { context, extensionIds, page };
}

async function openProductionPopup(
  context: BrowserContext,
  extensionIds: string[],
): Promise<Page> {
  for (const extensionId of extensionIds) {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    const isDevPopup = await popupPage.locator('#dev-badge').evaluate((badge) => {
      return !(badge as HTMLElement).hidden;
    });
    if (!isDevPopup) {
      return popupPage;
    }

    await closePage(popupPage);
  }

  throw new Error('Unable to find production popup');
}

async function expectProductionBadgeText(
  context: BrowserContext,
  extensionIds: string[],
  expectedText: string,
): Promise<void> {
  const productionExtensionId = await findProductionExtensionId(context, extensionIds);
  const worker = context
    .serviceWorkers()
    .find((candidate) => candidate.url().startsWith(`chrome-extension://${productionExtensionId}/`));
  if (!worker) {
    throw new Error('Unable to find production service worker');
  }

  await expect
    .poll(() =>
      worker.evaluate(() => {
        return chrome.action.getBadgeText({});
      }),
    )
    .toBe(expectedText);
}

async function findProductionExtensionId(
  context: BrowserContext,
  extensionIds: string[],
): Promise<string> {
  for (const extensionId of extensionIds) {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    const isDevPopup = await popupPage.locator('#dev-badge').evaluate((badge) => {
      return !(badge as HTMLElement).hidden;
    });
    await closePage(popupPage);

    if (!isDevPopup) {
      return extensionId;
    }
  }

  throw new Error('Unable to find production extension ID');
}

async function pressForwardSeek(page: Page): Promise<void> {
  await page.locator('#primary-video').focus();
  await page.keyboard.press('Shift+L');
}

async function emitDevHeartbeat(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.postMessage(
      { source: 'smart-seek-extension', type: 'dev-heartbeat' },
      '*',
    );
  });
}

async function expectVideoTime(page: Page, expectedTime: number): Promise<void> {
  await expect
    .poll(() =>
      page.locator('#primary-video').evaluate((video) => {
        return (video as HTMLVideoElement).currentTime;
      }),
    )
    .toBe(expectedTime);
}
