# CI Workflows

## `node.js.yml`

Runs on every push/pull request (see the workflow's `on:` triggers). Steps:

1. Checkout, set up Node.js (see `matrix.node-version`), `npm ci`.
2. `npm run build` - builds XSLT/SEF stylesheets and the production Vite bundle for
   `packages/vue`.
3. Installs the Playwright Chromium browser (`npx playwright install --with-deps chromium`),
   required for the real-browser suites under `/tests/browser`.
4. `npm run test:all` - runs the Jest unit tests for `@cascara/common` and `@cascara/vue`,
   followed by the Playwright browser suites (see `/tests/browser/README.md` for details on
   what those cover and how they're wired into `test:all`).
5. Uploads `packages/vue/dist` as a Pages artifact (deployment step is currently commented out).

## Saxon-JS browser runtime

`packages/vue` uses the **official Saxonica browser runtime** (`SaxonJS2.rt.js`), not the
`saxon-js` npm package's Node build:

- The npm package's ESM/Node entry (`SaxonJS2N.js`) assigns to an undeclared global
  (`abstractNode`), which fails under strict-mode ESM in the browser (`abstractNode is not
  defined`) when bundled by Vite. The npm build is designed for Node/CommonJS, not for
  running directly in a browser via Vite.
- Saxonica officially publishes a separate browser build (`SaxonJS2.rt.js`) meant to be
  loaded as a plain `<script>` tag, exposing a global `SaxonJS` object. This avoids the
  bundler/strict-mode incompatibility entirely and is the supported way to run Saxon-JS
  client-side.

Integration points:

- The file is stored as a static asset at `packages/vue/public/SaxonJS2.rt.js` and loaded in
  `packages/vue/index.html` via `<script src="/SaxonJS2.rt.js"></script>`, **before** the
  module script that boots the Vue app, so `window.SaxonJS` is guaranteed to exist by the
  time the app (and the CI browser tests) run.
- `packages/common/src/lib/platform-independence.ts` (`PLI.getSaxonJS()`) resolves the
  Saxon-JS API differently per environment: in the browser it reads `globalThis.SaxonJS`
  (the classic script above); in Node (Jest, run in this same CI job) it `require()`s the
  `saxon-js` npm package. All callers (`PLI.transformXSL()`, `PLI.getSaxonInfo()`) go through
  this single accessor.

### Checking for an update

1. Compare the currently vendored version against the latest release:
   - Local: open the app and run `SaxonJS.getProcessorInfo()` in the browser console (or see
     the `saxon-js-reqif.spec.ts` test output in CI), which reports the `productVersion`.
   - Latest: check the version/date noted at
     https://www.saxonica.com/saxon-js/documentation2/index.html#!starting/installation.
2. If a newer version is available and you want to pick it up, update the file (see below).

### How to update

1. Download the latest browser runtime from Saxonica:
   `https://www.saxonica.com/saxon-js/documentation2/SaxonJS/SaxonJS2.rt.js`
2. Overwrite `packages/vue/public/SaxonJS2.rt.js` with the downloaded file (same filename,
   no build changes needed - it is served as-is from `public/`).
3. Re-check the Saxonica license terms for browser-runtime redistribution still apply (see
   the license header inside the downloaded file).
4. Run `npx playwright test tests/browser/saxon-js-reqif.spec.ts` to confirm the new runtime
   still loads correctly and can transform a real ReqIF document via the production
   `ReqIF-to-CAS.sef.json` stylesheet.
5. Also run `npm run test:unit` (Jest, Node build via `saxon-js` npm package) to make sure
   both environments remain consistent/compatible after the update.
6. Push/open a PR so this same CI workflow re-validates the update end-to-end.
