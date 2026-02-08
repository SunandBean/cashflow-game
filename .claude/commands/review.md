# Code Review

Review recent code changes for bugs, security issues, and quality.

## Usage
- `/review` — review all uncommitted changes
- `/review HEAD~3` — review last 3 commits
- `/review <branch>` — review diff against a branch
- `/review <file>` — review a specific file
- `/review all` — full project review (all 3 packages in parallel)

## Instructions

Based on the argument `$ARGUMENTS`:

1. **Determine what to review**:
   - No argument: `git diff` + `git diff --staged` (uncommitted changes)
   - Commit ref (HEAD~N, hash): `git diff <ref>..HEAD`
   - Branch name: `git diff <branch>...HEAD`
   - File path: read the file and review it holistically
   - `all`: full project review — launch 3 parallel agents (shared, server, client)

2. **Read the changes** carefully. For each changed file:
   - Understand the purpose of the change
   - Check for bugs, edge cases, type errors
   - Look for security issues (see checklist below)
   - Verify consistency with the project's patterns

3. **Security checklist** (check all that apply):
   - [ ] No secrets/credentials in code
   - [ ] Socket-to-player authentication (getPlayerBySocket verification)
   - [ ] Client input validated on server (names, chat, actions)
   - [ ] No state mutation (immutable patterns used)
   - [ ] Dice values generated server-side
   - [ ] Deck contents not leaked to clients
   - [ ] Player actions validated for correct turn/phase
   - [ ] CORS restricted to configured origins
   - [ ] Session tokens used for reconnection

4. **Report findings** concisely:
   - 🔴 Bugs / security issues (must fix)
   - 🟡 Potential problems (should fix)
   - 🔵 Style / quality suggestions (optional)
   - If clean: "LGTM — no issues found"

5. **For full project review** (`/review all`):
   - Launch 3 parallel review agents (one per package)
   - Compile into unified report with priority ranking
   - Include security checklist summary table
   - Rank top 5 issues by severity

Keep the review focused and actionable. Don't nitpick formatting.
