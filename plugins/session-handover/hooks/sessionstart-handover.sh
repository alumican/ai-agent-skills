#!/bin/bash
# SessionStart hook (session-handover plugin): inject the current project's HANDOVER.md
# into context at session start, if one exists. No HANDOVER.md -> silent no-op (natural
# opt-in: only projects that have run /session-handover:save get an injection). stdout on exit 0 is
# added to the session context.
set -u
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
HANDOVER="$PROJECT_DIR/HANDOVER.md"
[ -f "$HANDOVER" ] || exit 0

cat <<'HEADER'
The previous session's handover note (HANDOVER.md) follows. Read it before starting work.
In particular, handle "§3c Not yet promoted" first if present, and do not re-propose "§5 Rejected options".
HANDOVER.md is a session-handover document, not a progress log or a scratchpad: do not write to it during
this session. Use /session-handover:save to rewrite it, /session-handover:trash to retire it once consumed.
--- HANDOVER.md ---
HEADER
cat "$HANDOVER"
echo "--- end HANDOVER.md ---"
