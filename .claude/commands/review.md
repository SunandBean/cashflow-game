# Code Review

Review recent code changes for bugs, security issues, and quality.

## Usage
- `/review` — review all uncommitted changes
- `/review HEAD~3` — review last 3 commits
- `/review <branch>` — review diff against a branch
- `/review <file>` — review a specific file

## Instructions

Based on the argument `$ARGUMENTS`:

1. **Determine what to review**:
   - No argument: `git diff` + `git diff --staged` (uncommitted changes)
   - Commit ref (HEAD~N, hash): `git diff <ref>..HEAD`
   - Branch name: `git diff <branch>...HEAD`
   - File path: read the file and review it holistically

2. **Read the changes** carefully. For each changed file:
   - Understand the purpose of the change
   - Check for bugs, edge cases, type errors
   - Look for security issues (see checklist below)
   - Verify consistency with the project's patterns

3. **Security checklist** (check all that apply):
   - [ ] No secrets/credentials in code
   - [ ] Client input validated on server
   - [ ] No state mutation (immutable patterns used)
   - [ ] Dice values generated server-side
   - [ ] Deck contents not leaked to clients
   - [ ] Player actions validated for correct turn/phase

4. **Report findings** concisely:
   - 🔴 Bugs / security issues (must fix)
   - 🟡 Potential problems (should fix)
   - 🔵 Style / quality suggestions (optional)
   - If clean: "LGTM — no issues found"

Keep the review focused and actionable. Don't nitpick formatting.
