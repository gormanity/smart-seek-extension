import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import {
  createServer as createHttpsServer,
  type Server as HttpsServer,
  type RequestListener,
} from 'node:https';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { chromium, type BrowserContext, type Page } from '@playwright/test';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export interface FixtureServer {
  youtubeTvOrigin: string;
  close: () => Promise<void>;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const root = resolve('fixtures/e2e');
  const handler: RequestListener = async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'https://tv.youtube.com');
      const pathname = url.pathname === '/' ? '/yttv-fixture.html' : url.pathname;
      const filePath = resolve(root, `.${pathname}`);

      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      await stat(filePath);
      response.writeHead(200, {
        'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
      });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  };
  const server = createHttpsServer(createSelfSignedCertificate(), handler);

  await listen(server);

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fixture server did not start with a TCP address');
  }

  return {
    youtubeTvOrigin: `https://tv.youtube.com:${address.port}`,
    close: async () => {
      await closeServer(server);
    },
  };
}

export async function launchExtensionContext(
  mode: 'prod' | 'prod-and-dev',
): Promise<{
  context: BrowserContext;
  extensionIds: string[];
}> {
  const extensionPaths = [resolve('dist/chrome')];
  if (mode === 'prod-and-dev') {
    extensionPaths.push(resolve('dist-dev/chrome'));
  }

  const extensionArg = extensionPaths.join(',');
  const userDataDir = mkdtempSync(join(tmpdir(), 'smart-seek-e2e-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: process.env.HEADED !== '1',
    ignoreHTTPSErrors: true,
    args: [
      `--disable-extensions-except=${extensionArg}`,
      `--load-extension=${extensionArg}`,
      '--host-resolver-rules=MAP tv.youtube.com 127.0.0.1',
      '--ignore-certificate-errors',
    ],
  });

  return {
    context,
    extensionIds: await waitForExtensionIds(context, extensionPaths.length),
  };
}

export async function closePage(page: Page | undefined): Promise<void> {
  if (page && !page.isClosed()) await page.close();
}

async function listen(server: HttpsServer): Promise<void> {
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
}

async function closeServer(server: HttpsServer): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}

async function waitForExtensionIds(
  context: BrowserContext,
  expectedCount: number,
): Promise<string[]> {
  while (context.serviceWorkers().length < expectedCount) {
    await context.waitForEvent('serviceworker');
  }

  return context
    .serviceWorkers()
    .map((worker) => worker.url().split('/')[2])
    .filter((id): id is string => Boolean(id));
}

function createSelfSignedCertificate(): { key: Buffer; cert: Buffer } {
  const dir = mkdtempSync(join(tmpdir(), 'smart-seek-cert-'));
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  const result = spawnSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certPath,
      '-days',
      '1',
      '-subj',
      '/CN=tv.youtube.com',
      '-addext',
      'subjectAltName=DNS:tv.youtube.com',
    ],
    { stdio: 'ignore' },
  );

  if (result.status !== 0) {
    throw new Error('Unable to create self-signed HTTPS fixture certificate');
  }

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}
