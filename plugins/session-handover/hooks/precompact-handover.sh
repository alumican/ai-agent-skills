#!/bin/bash
# PreCompact hook (session-handover plugin): a safety net that regenerates the current
# project's HANDOVER.md right before context compaction. The PRIMARY path is the
# in-session /handover skill (richer context, higher quality); this backup exists for
# when compaction happens before a manual run.
#
# Policy:
#   - fail-open: this hook's failure must never block compaction. Every path exits 0.
#   - opt-in: only acts in projects that ALREADY have a HANDOVER.md (a project opts in by
#     running /handover once). Set HANDOVER_AUTO_CREATE=1 to generate on the first compaction too.
#
# Self-location is resolved from this script's own path, so it works whether invoked via
# ${CLAUDE_PLUGIN_ROOT} or directly. The target project comes from $CLAUDE_PROJECT_DIR.
set -u

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SELF_DIR/.." && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"

SKILL="$PLUGIN_ROOT/skills/handover/SKILL.md"
EXTRACTOR="$SELF_DIR/extract-transcript.mjs"
HANDOVER="$PROJECT_DIR/HANDOVER.md"
LOG="$PROJECT_DIR/.claude/handover.log"
LOCK="$PROJECT_DIR/.claude/.handover.lock"
MODEL="${HANDOVER_MODEL:-sonnet}"

file_mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }
log() { mkdir -p "$PROJECT_DIR/.claude" 2>/dev/null; printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >>"$LOG" 2>/dev/null; }

[ "${HANDOVER_DISABLE:-0}" = "1" ] && exit 0

# Opt-in guard: only maintain HANDOVER.md in projects that already have one,
# unless HANDOVER_AUTO_CREATE=1 explicitly requests first-time generation.
[ -f "$HANDOVER" ] || [ "${HANDOVER_AUTO_CREATE:-0}" = "1" ] || exit 0

# stdin: hook input JSON -> transcript_path, trigger
INPUT="$(cat)"
PARSED="$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", (c) => (d += c)).on("end", () => {
    try {
      const j = JSON.parse(d);
      process.stdout.write(`${j.transcript_path ?? ""}\n${j.trigger ?? "unknown"}`);
    } catch {}
  });
' 2>/dev/null)" || { log "skip: failed to parse hook input JSON"; exit 0; }
TRANSCRIPT="$(printf '%s' "$PARSED" | sed -n 1p)"
TRIGGER="$(printf '%s' "$PARSED" | sed -n 2p)"

[ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && { log "skip: transcript not found (${TRANSCRIPT})"; exit 0; }
[ ! -f "$SKILL" ] && { log "skip: SKILL.md not found (${SKILL})"; exit 0; }
[ ! -f "$EXTRACTOR" ] && { log "skip: extractor not found (${EXTRACTOR})"; exit 0; }

# Resolve the claude CLI (hook environments sometimes have a thin PATH)
CLAUDE_BIN="$(command -v claude || true)"
[ -z "$CLAUDE_BIN" ] && [ -x "$HOME/.local/bin/claude" ] && CLAUDE_BIN="$HOME/.local/bin/claude"
[ -z "$CLAUDE_BIN" ] && { log "skip: claude CLI not found"; exit 0; }

# Multi-run guard (a lock older than 600s is treated as stale)
if [ -f "$LOCK" ]; then
  LOCK_AGE=$(( $(date +%s) - $(file_mtime "$LOCK") ))
  [ "$LOCK_AGE" -lt 600 ] && { log "skip: a generation is already running (lock age ${LOCK_AGE}s)"; exit 0; }
fi
mkdir -p "$PROJECT_DIR/.claude" 2>/dev/null
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

EXTRACT="$(mktemp "${TMPDIR:-/tmp}/handover-extract.XXXXXX")" || { log "skip: mktemp failed"; exit 0; }
if ! node "$EXTRACTOR" "$TRANSCRIPT" "$EXTRACT" >>"$LOG" 2>&1; then
  log "skip: failed to build transcript excerpt"
  exit 0
fi

TIMESTAMP="$(date '+%Y-%m-%d %H:%M')"
PROMPT="You are the author of a session handover note. Do the following in order.
1. Read ${SKILL} (the template and the writing discipline)
2. Read ${EXTRACT} (this session's transcript excerpt = your only source material)
3. If ${PROJECT_DIR}/HANDOVER.md exists, read it (take stock: carry live items forward)
4. Following SKILL.md's template, write ${PROJECT_DIR}/HANDOVER.md, fully overwriting it

Constraints:
- The only write target is ${PROJECT_DIR}/HANDOVER.md. Do not modify docs or any other file.
- Write in the language used in the transcript excerpt (default English if it can't be determined). Keep the section numbers (§1-§10, §3c) as-is.
- Header 'method' field: 'PreCompact auto-generation (trigger: ${TRIGGER})'; generated timestamp ${TIMESTAMP}.
- Do not fabricate facts absent from the excerpt. Mark anything you can't determine from it as '(unknown - auto-generated)'.
- Carry the user's important instructions and corrections verbatim (follow SKILL.md's 'Writing discipline').
- Do not promote directives into docs; place promotion candidates verbatim under §3c 'Not yet promoted'."

log "start: auto-generating HANDOVER.md (trigger=${TRIGGER}, model=${MODEL})"
START_EPOCH="$(date +%s)"
# Note: the write-target constraint is enforced via the prompt (path-scoped Write perms
# don't work headless), so Read,Write are allowed broadly.
"$CLAUDE_BIN" -p "$PROMPT" \
  --model "$MODEL" \
  --allowedTools "Read,Write" \
  >>"$LOG" 2>&1

# Don't trust the exit code; judge success by the artifact's existence and mtime.
if [ "$(file_mtime "$HANDOVER")" -ge "$START_EPOCH" ]; then
  log "done: HANDOVER.md updated"
else
  log "fail: HANDOVER.md was not updated (see the claude -p output just above in this log)"
fi
rm -f "$EXTRACT"
exit 0
