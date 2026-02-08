# Fix All Issues

Create a team of agents to fix multiple issues in parallel across the codebase.

## Usage
- `/fix-all` — fix all issues from a recent code review
- `/fix-all <issue-list>` — fix specific listed issues

## Instructions

1. **Gather issues**: If no argument, look at the most recent code review output in the conversation. Otherwise, parse the provided issue list.

2. **Create task list**: For each issue, create a task with:
   - Clear subject (imperative form)
   - Detailed description with file paths and line references
   - Active form for progress tracking

3. **Assign to teams**: Group tasks by package:
   - `engine-agent` → `packages/shared/` issues (game engine, types, validators, constants)
   - `server-agent` → `packages/server/` issues (handlers, rooms, storage, security)
   - `client-agent` → `packages/client/` issues (components, stores, adapters, pages)

4. **Create team**: Use TeamCreate with name `code-improvement`

5. **Spawn agents**: Launch 3 parallel agents (one per package) with:
   - Full task descriptions
   - Project context and patterns
   - `mode: bypassPermissions` for autonomous work
   - Instructions to work through tasks in ID order

6. **Monitor progress**: Track agent completion via TaskList

7. **Verify**: After all agents complete:
   - Run `pnpm build` to verify compilation
   - Run `pnpm test` to verify all tests pass
   - Fix any test failures caused by engine changes (update test expectations, not engine)

8. **Cleanup**: Shutdown agents and delete team

## Agent Instructions Template

Each agent should:
- Use TaskGet to read full task description
- Mark task as in_progress before starting
- Read relevant source files before making changes
- Make minimal, focused changes
- Mark task as completed when done
- Move to next task in ID order

## Rules
- Keep changes minimal — don't refactor unrelated code
- Maintain existing patterns (immutability, ESM imports with .js)
- If a shared type changes, update all usages across packages
- Run tests within each package as you go
- Report summary of all changes when complete
