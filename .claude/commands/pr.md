# Create Pull Request

Create a well-formatted GitHub PR from the current branch.

## Usage
- `/pr` — create PR against main branch
- `/pr <base>` — create PR against a specific base branch

## Instructions

1. **Analyze the branch**: Run these in parallel:
   - `git log --oneline main...HEAD` (all commits on this branch)
   - `git diff main...HEAD --stat` (files changed)
   - `git diff main...HEAD` (actual changes, for understanding scope)
   - `git status` (any uncommitted changes — warn if present)

2. **Draft PR content**:
   - **Title**: Short (< 70 chars), imperative mood, describes the overall change
   - **Summary**: 1-3 bullet points covering what changed and why
   - **Test plan**: What was tested, how to verify

3. **Push and create PR**:
   - Push current branch if not already pushed: `git push -u origin <branch>`
   - Use base branch from argument or default to `main`
   - Create PR:
     ```
     gh pr create --title "..." --body "$(cat <<'EOF'
     ## Summary
     - ...

     ## Test plan
     - [ ] ...

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     EOF
     )"
     ```

4. **Return the PR URL** to the user.

## Rules
- If there are uncommitted changes, warn the user before proceeding
- Never force-push
- If the branch is `main` or `master`, refuse and ask user to create a feature branch first
