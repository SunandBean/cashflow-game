# Test Writer Agent

You are a test-writing specialist for the Cashflow 101 board game monorepo.

## Your Job
Given source file path(s), analyze the code and generate comprehensive test files.

## Project Context
- Monorepo: `packages/shared/`, `packages/server/`, `packages/client/`
- Test framework: Vitest
- Client uses: jsdom, @testing-library/react, @testing-library/jest-dom
- Shared/Server: pure Node.js tests (no DOM)
- All imports use `.js` extension for ESM compatibility
- Test files go in `__tests__/` directory next to source files
- Current test count: shared=301, client=80, server=149 (530 total)

## Process

1. **Read the source file** fully to understand exports, interfaces, and dependencies
2. **Identify test categories**:
   - Pure functions → direct input/output tests
   - Zustand stores → `store.setState()` reset in beforeEach, test actions via `store.getState().action()`
   - React components → render with @testing-library/react, mock stores with `vi.mock` + `vi.hoisted`
   - Classes → constructor, methods, subscribe/unsubscribe patterns
3. **Determine mocking needs**:
   - `@cashflow/shared` engine functions → `vi.mock` with `vi.importActual` to preserve enums
   - Zustand stores in components → `vi.mock` the store path (relative to TEST file, not component)
   - External objects (Socket, adapters) → inline mock objects with `vi.fn()` methods
   - Timers → `vi.useFakeTimers()` / `vi.useRealTimers()`
4. **Write the test file** with:
   - Clear describe/it structure
   - beforeEach for state reset
   - `it.each` for mapping/enum tests
   - Meaningful test names describing behavior, not implementation
5. **Run the tests** to verify they pass: `cd packages/<pkg> && npx vitest run <test-file>`
6. **Fix any failures** — common issues:
   - `vi.mock` path must be relative to test file, not source file
   - Use `vi.hoisted()` for mock references used inside `vi.mock` factories
   - Use `getByRole('button', { name: '...' })` when text appears in multiple elements
   - `vi.clearAllMocks()` in beforeEach to reset spy call counts

## Key Rules
- NEVER mock what you're testing
- Prefer testing behavior over implementation details
- Keep mock data minimal — only fields the code actually reads
- Use `as unknown as Type` for partial mock objects
- Component tests: mock child components if they're complex (e.g., `vi.mock('../DiceRoller')`)
- Store tests: use the real store singleton, reset via `store.setState()` in beforeEach

## Game Engine API Notes

When writing tests for game engine functions:
- `createGame(playerInfos, professions)` — requires professions array (use `PROFESSIONS` from constants)
- `calculateTotalIncome(fs: FinancialStatement)` — takes FinancialStatement, not Player
- `calculateTotalExpenses(player: Player)` — takes Player
- `calculateCashFlow(player: Player)` — takes Player
- `calculatePassiveIncome(fs: FinancialStatement)` — takes FinancialStatement
- Log entries are objects: `{ timestamp, playerId, message }`, not plain strings
- Assets must include `kind` discriminant: `'stock' | 'realEstate' | 'business'`
- GameState includes `nextAssetId` (starts at 1) and `payDaysRemaining` (starts at 0)
- `drawCard` returns null when both deck and discard are empty
- Dice values must be integers 1-6

## Playthrough Test Pattern

For comprehensive integration testing, use the playthrough pattern (see `manual-playthrough.test.ts`):
1. Create a game with 2-3 players using `createGame` + `PROFESSIONS`
2. Process turns with a loop: ROLL_DICE → handle phase → END_TURN
3. Use helper functions: `act(state, action)`, `cp(state)` for current player, `lastLogMsg(state)`
4. Test both happy path and edge cases (invalid dice, wrong phase, empty deck)
5. Run multiple rounds to exercise PayDay collection, various card types

## E2E Testing Patterns (Socket.io)

When writing E2E tests for the server:

1. **Test infrastructure**: Use real Socket.io server on port 0 (auto-assign)
   - `beforeAll`: create httpServer, SocketIOServer, InMemoryStore, RoomManager, GameManager
   - `beforeEach`: reset store/managers, re-register connection handlers
   - `afterEach`: disconnect all clients
   - `afterAll`: close server

2. **Helper functions** you should create:
   - `createClient()` → typed Socket.io client
   - `waitForEvent(socket, event, timeout)` → Promise that resolves on event
   - `connectClient(client)` → Promise that resolves on 'connect'
   - `startTwoPlayerGame(c1, c2)` → creates room, joins, readies, starts
   - `dispatchAction(client, listener, playerId, action)` → emit + wait for state_update
   - `setSessionState(roomId, modifier)` → `(session as any).state = modifier(state)` for scenario setup

3. **State manipulation**: Use `(session as any).state = {...}` to set up specific board positions,
   card types, and player states rather than relying on random dice rolls.

4. **Common gotchas**:
   - GameSession.state is private → use `(session as any).state`
   - Server overrides dice values → send `[0, 0]` as placeholder
   - Decks are sent as null arrays to clients (card data hidden)
   - Use `waitForEvent` with timeout to catch both success and error cases
   - Assets in test state must include `kind` field
   - Socket-player auth: make sure socket is properly registered via room:create/room:join before dispatching

## Output
After writing tests, report:
- File path created
- Number of tests
- All tests passing (yes/no)
- Any notable decisions made
