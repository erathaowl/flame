# Testing and continuous integration

Flame runs unit tests, SQLite integration tests and Chromium browser tests.
The GitHub [Verify workflow](../.github/workflows/verify.yml) runs on every
branch push and pull request targeting `master`. Docker builds are handled
by the separate [Docker Build workflow](../.github/workflows/docker.yml).

## Local commands

Prerequisites: Node.js 20, npm, a compiler toolchain for the SQLite native
dependency, and a writable temporary directory.

```sh
npm ci
node --test tests/*.test.js
node --test tests/integration/*.test.js

npm ci --legacy-peer-deps --prefix client
npm test --prefix client -- --watchAll=false --runInBand
CI=false npm run build --prefix client
```

To run Chromium UI tests, install Playwright and its browser, then build and
serve the production frontend through Flame:

```sh
npm install --no-save --package-lock=false @playwright/test@1.56.1
sh scripts/install-open-clock-fonts.sh client/public/clock-fonts
CI=false npm run build --prefix client
npx playwright install --with-deps chromium
mkdir -p public
cp -a client/build/. public/
npx playwright test --config=playwright.config.js
```

The browser test runner starts an isolated Flame server on port 5005.
Use a disposable `data` directory when running the browser tests locally;
the test server creates and changes application records. CI runs in a fresh
workspace.

## Coverage matrix

| Area | Unit tests | SQLite/HTTP E2E | Chromium browser |
| --- | --- | --- | --- |
| Startup, migrations, typed settings | Yes | Yes | Indirect |
| Authentication and public/private access | Yes | Yes | Yes |
| Application create, edit, visibility and delete | Yes | Yes | Yes |
| Category and bookmark management | Yes | Yes | Yes |
| Custom ordering, invalid payloads | Yes | Yes | Application keyboard drag |
| YAML export, import, validation, rollback | Yes | Yes | Yes |
| Random quotes, empty/invalid lists | No | Yes | Yes |
| Endpoint quotes, authentication, JSONPath and fallback | No | Yes | Indirect |
| Individual clock colors | No | Indirect | Yes |
| Gatus status colors, cache and privacy | Yes | Yes | Indirect |
| Header layout, mobile weather, clock font selection and LCD glyphs | No | Indirect | Yes |
| Docker/Kubernetes synchronization | Yes (mocked) | No | No |

The HTTP suite uses the real Express routes, SQLite migrations and
Sequelize models. It performs requests through a bound local HTTP server,
uses a local fake Gatus service and simulates an error mid-import to
verify full SQLite rollback. No production credentials or external
services are needed.

The Chromium test exercises login, application and bookmark forms,
visibility actions, YAML download/upload, guest filtering, keyboard
reordering of application rows, separate Clock and Quotes settings, all four
quote styles, individual clock colors, mobile clock layout and weather alignment, font selection,
the bundled JetBrainsMono, DSEG7 Classic and Matrix Mono Screen assets,
and the removal of the retired Doto font.

## Remaining limitations

- Full drag-and-drop pointer movement and mobile touch interactions are
  harder to reproduce deterministically with the current
  `react-beautiful-dnd` dependency. Backend reorder endpoints are covered
  through HTTP; the drag-and-drop UI still benefits from manual checks.
- Live Docker Engine and Kubernetes cluster discovery are covered through
  mock-based tests, not real cluster E2E environments.
- Third-party weather providers, production TLS termination, Docker
  upgrades with real persistent volumes, and cross-browser compatibility
  need environment-specific validation.

When adding a feature, extend its smallest appropriate test layer first,
then add an HTTP or browser case when it changes a user-visible workflow.
