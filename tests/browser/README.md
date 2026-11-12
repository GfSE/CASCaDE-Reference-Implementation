# Playwright Browser Tests

This directory contains Playwright test suites that exercise the real, production-built
Vue application (`packages/vue`) in an actual Chromium browser - as opposed to the Jest
unit tests under `packages/common/tests` and `packages/vue/tests`, which run in Node/jsdom
against isolated modules/components.

## Why these tests live here (not inside `packages/vue`)

These suites are cross-package integration tests: they drive the real Vite production build
of `packages/vue`, which embeds fixtures from `packages/common/data` and assets (Saxon-JS
runtime, compiled `.sef.json` stylesheets) from `packages/vue/public`. The root-level
`playwright.config.ts` and `npm` scripts build/serve the whole workspace, so the tests are
kept at the workspace root alongside that configuration (the same place the Cypress E2E
tests under `/tests/e2e` already live), rather than under a single package.

## What is covered

- `saxon-js-reqif.spec.ts` - validates the Saxon-JS **browser** runtime
  (`packages/vue/public/SaxonJS2.rt.js`, loaded as a classic script and exposed as the
  global `SaxonJS`). Confirms `SaxonJS.getProcessorInfo()` works and that a real ReqIF
  document is transformed to CAS/PIG XML via the production `ReqIF-to-CAS.sef.json`
  stylesheet, served from `/assets/xslt/`.
- `item-cache-pinia-store.spec.ts` - validates the `ItemCache` Pinia store end-to-end
  through the actual import UI (`/interfaces`): uploads a real `.reqif` fixture, checks
  navigation to the Document page (in-memory store state), verifies the imported data was
  actually persisted to IndexedDB (`cascara-db` / `itemCache` store), and confirms it is
  rehydrated correctly after a page reload (`loadFromStorage()` on app bootstrap).
- `page-graph.spec.ts` - validates the Graph page (`/graph`) end-to-end: imports real
  `.cas.jsonld` fixtures through the import UI and checks what Mermaid finally draws for the item
  selected in the outline (round and hexagonal nodes, the colours of types and instances, solid,
  dashed and dotted arrows, labels which are not cut off), the popup shown while hovering a node,
  the navigation by clicking a node or by keyboard, the choice of the radius and the limitation
  of a large graph. Mermaid needs the layout engine of a real browser, so none of this can be
  covered by the Jest suites; these only cover the composition of the graph definition
  (`packages/common/tests/pig-package-getmermaid.spec.ts`) and the handling of failures
  (`packages/vue/tests/mermaid-render.spec.ts`).

## How the app is launched

`playwright.config.ts` (at the workspace root) defines a `webServer` that:
1. Builds the real app: `npm run build -w @cascara/vue` (includes the Saxon-JS runtime and
   compiled XSLT/SEF assets under `public/`).
2. Serves the production build: `npm run preview -w @cascara/vue -- --host 127.0.0.1 --port 4173 --strictPort`.

Playwright waits for `http://127.0.0.1:4173` to respond before running any test, and all
tests use that URL as `baseURL`. This means tests always run against the same artifact a
user (or CI) would actually get - not a dev-only shortcut.

## Running locally

```powershell
# All browser suites
npx playwright test

# A single suite
npx playwright test tests/browser/saxon-js-reqif.spec.ts
npx playwright test tests/browser/item-cache-pinia-store.spec.ts
npx playwright test tests/browser/page-graph.spec.ts
```

The first run (or any run without a cached build) will build and start the preview server
automatically; set `reuseExistingServer: true` behavior is already handled - locally,
Playwright reuses an already-running server on port 4173 if present (see `playwright.config.ts`).

If browsers aren't installed yet:

```powershell
npx playwright install --with-deps chromium
```

## Integration with `test:all` / CI

The root `package.json` wires this suite into the overall test entry points:

- `npm run test:xslt` -> `playwright test` (runs everything in this directory).
- `npm run test:all` -> `npm run test:unit && npm run test:xslt`, i.e. Jest unit tests for
  `@cascara/common` and `@cascara/vue` first, then these Playwright browser suites.

The GitHub Actions workflow (`.github/workflows/node.js.yml`) runs `npm run build`, installs
the Playwright Chromium browser (`npx playwright install --with-deps chromium`), and then
runs `npm run test:all`, so both unit and real-browser suites execute on every CI run.
