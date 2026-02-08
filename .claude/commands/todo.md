# TODO Management

View or update the project TODO list stored in Serena memory.

## Usage
- `/todo` — show current TODO list
- `/todo add <item>` — add a new TODO item
- `/todo done <item>` — mark an item as completed

## Instructions

Based on the argument `$ARGUMENTS`:

### No argument (view):
1. Read the TODO.md memory file via Serena's `read_memory` tool
2. Display it formatted to the user

### "add <item>":
1. Read current TODO.md
2. Add the new item under the appropriate section (or "Misc" if unclear)
3. Write back via `edit_memory`
4. Confirm what was added

### "done <item>":
1. Read current TODO.md
2. Find the matching item (fuzzy match on keywords)
3. Change `- [ ]` to `- [x] ✅`
4. Write back via `edit_memory`
5. Confirm what was completed

## Rules
- Keep items concise (1 line each)
- Group by category when possible
- Always show the updated list after changes
