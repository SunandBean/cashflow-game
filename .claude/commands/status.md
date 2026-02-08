# Project Status

Show a quick overview of the project's current state.

## Instructions

Run the following in parallel and compile a compact report:

1. **Git status**: `git status --short`, current branch, remote tracking
2. **Recent commits**: `git log --oneline -5`
3. **Test counts**: `pnpm test` (or read from cached output) — show per-package pass/fail
4. **Build status**: Check if `pnpm build` succeeds
5. **Uncommitted work**: List any unstaged/untracked files

## Output Format

```
Branch: <branch> → <remote>
Last commit: <hash> <message>

Tests: <total> passing
  shared: <N> ✅  server: <N> ✅  client: <N> ✅

Build: ✅ passing / ❌ failing
Uncommitted: <count> files (or "clean")

Recent commits:
  <hash> <message>
  <hash> <message>
  ...
```

Keep it compact — no more than 15 lines total.
