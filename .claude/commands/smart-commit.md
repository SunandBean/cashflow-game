# Smart Commit

Analyze all uncommitted changes, group them by feature/concern, and create separate commits for each group.

## Instructions

1. Run `git status` and `git diff --stat` to see all changes
2. Run `git diff` to understand what each file's changes are about
3. Read `git log --oneline -5` for commit message style reference
4. **Group changes** into logical commits by:
   - Feature/concern (e.g., "add bankruptcy mechanic", "add server tests")
   - Layer (shared engine changes vs client UI vs server)
   - Related files that must go together (types + engine + tests for same feature)
5. **Present the grouping** to the user for approval before committing:
   ```
   Commit 1: <title>
     - file1.ts
     - file2.ts

   Commit 2: <title>
     - file3.ts
   ```
6. After user approval, create each commit:
   - Stage only the files for that group
   - Write a concise commit message: summary line + bullet details
   - Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
7. After all commits, show `git log --oneline` to confirm

## Grouping Rules
- Types + engine + tests for the same feature → one commit
- Card data / constants rebalancing → can group with the feature that needs it
- Test-only additions (new test files, test setup) → separate commit
- Config changes (package.json, vite.config.ts) → group with whatever needs them
- Unrelated small fixes → separate commit each, or group as "misc fixes"
- NEVER commit temp files, .env, credentials, or editor artifacts
