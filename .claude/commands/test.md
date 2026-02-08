# Run Tests

Run tests and report results concisely.

## Usage
- `/test` — run all tests across all packages
- `/test shared` — run shared package tests only
- `/test server` — run server package tests only
- `/test client` — run client package tests only
- `/test <filepath>` — run a specific test file
- `/test playthrough` — run the full game playthrough test

## Instructions

Based on the argument `$ARGUMENTS`:

1. If no argument or "all": run `pnpm test` from the project root
2. If a package name (shared/server/client): run `cd packages/<pkg> && npx vitest run`
3. If a file path: run `npx vitest run <filepath>`
4. If "playthrough": run `cd packages/shared && npx vitest run src/engine/__tests__/manual-playthrough.test.ts`

After running, provide a compact summary:
- Per-file: pass/fail status and test count
- Total: X passed, Y failed out of Z
- If failures: show the first failure's test name and error message (1-2 lines max)

Expected test counts (as of latest update):
- shared: ~301 tests (6 files including manual-playthrough)
- client: ~80 tests (9 files)
- server: ~149 tests (7 files)
- Total: ~530 tests

Do NOT show the full vitest output. Only show the summary.
