import { defineConfig } from '@playwright/test';

const PREVIEW_PORT = 4173;
const PREVIEW_BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

export default defineConfig({
    testDir: './tests/browser',
    testMatch: '**/*.spec.ts',
    timeout: 30000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'list',

    use: {
        baseURL: PREVIEW_BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    // Builds the real Vite app once and serves the production bundle (including
    // the Saxon-JS browser runtime and SEF stylesheets under public/assets/xslt),
    // so Playwright tests exercise the actual app a user/CI would get, not a dev-only shortcut.
    webServer: {
        command: `npm run build -w @cascara/vue && npm run preview -w @cascara/vue -- --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
        url: PREVIEW_BASE_URL,
        reuseExistingServer: !process.env.CI,
        // The build takes its time, in particular since Mermaid is bundled for the Graph page:
        timeout: 600000,
    },

    projects: [
        {
            name: 'chromium',
            use: { 
                browserName: 'chromium',
                launchOptions: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            },
        },
    ],
});
