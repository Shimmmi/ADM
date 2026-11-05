import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Если браузер нужной ревизии не скачан — берём любой закэшированный Chromium. */
function cachedChromium(): string | undefined {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  const dir = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(dir)) return undefined;
  for (const d of readdirSync(dir).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
    const p = join(dir, d, 'chrome-linux64', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined;
}

const PORT = 4179;

export default defineConfig({
  testDir: 'tests',
  timeout: 180_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      executablePath: cachedChromium(),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    // Отдельная сборка с отладочным токеном: dev-сервер перезагружает страницу при любой правке файлов.
    command: `npx vite build --outDir .e2e-dist --emptyOutDir --logLevel warn && npx vite preview --outDir .e2e-dist --host 127.0.0.1 --port ${PORT} --strictPort`,
    env: { VITE_DEBUG_TOKEN: 'e2e' },
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
