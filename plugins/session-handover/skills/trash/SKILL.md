---
name: trash
description: Retire the project's HANDOVER.md by moving it to the OS trash once its handover has been consumed — the work it describes is finished or has moved to its permanent home, and leaving it would make future sessions resume from a stale next-move. Checks for content that has nowhere else to live, confirms with the user, then trashes it (recoverable, never rm); optionally the hook's log and lock too.
---

# /session-handover:trash — retire the handover note

## Purpose

A handover note is **consumed, not archived**. Once the next session has picked the work back up and the
note's live content has reached its permanent home — the docs, the worklog, the code, or simply "done" —
the file stops helping and starts hurting: the SessionStart hook keeps injecting it, and every session
after that reads a finished task's next-move as if it were current.

This command closes the cycle: `save` → `load` → (work) → **`trash`**.

It **moves the file to the OS trash — it never `rm`s it.** `HANDOVER.md` is normally gitignored, so an
`rm` would be the one deletion in this plugin with no way back. The trash keeps the mistake recoverable,
which is what lets this command exist at all.

## When to run

- The handover was loaded, and the work it described is finished (and verified)
- Its content has been promoted — directives into the docs, history into the worklog
- The project is moving to a different task and the note describes a closed one
- The note is stale enough to mislead (git has moved well past it and nothing in it is live)

**Do not run it** while the work is still in flight. If §2's next move is still live, the right command is
`/session-handover:save` (refresh the note), not this one.

## Steps

### 1. Read before trashing

Read `HANDOVER.md` at the project root. If it doesn't exist, report "there is no handover note to retire"
and stop — that is not an error.

### 2. Residue check (the gate)

The trash is a safety net, not an archive — nobody goes looking there for a design rationale. Content that
has nowhere else to live is effectively lost the moment the file leaves the project. Walk the sections
before proposing anything:

| Check | If it doesn't hold |
|---|---|
| §3c "Not yet promoted" is empty | Promote those directives into the docs first — verbatim, with a destination — then retire the note |
| §2 in-progress / not-started is closed | Work is still live → propose `/session-handover:save` instead and stop |
| §7 "Implemented but unverified" is empty | The verification gap outlives the session: either verify, or record it in the worklog / an issue first |
| §4 rationale, §5 rejected options, §9 pitfalls are no longer needed, or already live in the docs | Offer to promote the ones still worth keeping into `CLAUDE.md` / the design docs first |

Anything you promote on the way out follows the project's own "reflect directives into docs" rule if it has
one. Where the destination is contested or the decision is structural, don't execute — report it as a
proposal and leave the file in place.

### 3. Confirm with the user

State plainly what will be moved to the trash and what the residue check found, then **ask for explicit
confirmation**. Recoverable is not the same as reversible: the SessionStart injection stops immediately, and
a note fished back out of the trash has lost its place in the project.

### 4. Move to the trash

Always the trash, never `rm`. Use the first mechanism available on the platform:

| Platform | How |
|---|---|
| macOS | `trash "$f"` if that CLI is installed; otherwise `mv "$f" "$HOME/.Trash/HANDOVER-<project>-<YYYYMMDD-HHMM>.md"` |
| Linux | `gio trash "$f"` (glib), or `trash-put "$f"` (trash-cli) |
| Windows | PowerShell: `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile("$f",'OnlyErrorDialogs','SendToRecycleBin')` |

Notes:

- The plain `mv` fallback **overwrites a same-named file already in the trash** — `HANDOVER.md` is a common
  name, so rename on the way in (project name + timestamp, as above). A real trash CLI handles this itself.
- If no trash mechanism is available, **say so and ask** whether to delete permanently instead. Never
  silently fall back to `rm`.

What to move:

- `HANDOVER.md` at the project root — always
- `.claude/handover.log` — **only if the user asks**; offer it, don't assume. It is the auto-generation's
  audit trail and is often worth keeping
- `.claude/.handover.lock` — a stale lock, if one is lying around: delete it outright, it holds nothing

### 5. Report (1–3 lines)

Where the file went (so it can be fished back out), what was promoted where on the way out, and one
consequence the user should know: **the PreCompact safety net now stands down for this project** — its
opt-in guard keys off the existence of `HANDOVER.md`, so no auto-generation happens until the next
`/session-handover:save` (unless `HANDOVER_AUTO_CREATE=1` is set).

## What this skill does NOT do

- `rm` the handover note, or trash anything without an explicit user confirmation
- Retire a handover whose §3c or next move is still live — it proposes `/session-handover:save` instead
- Touch `CLAUDE.md`, the design docs, or the worklog beyond a promotion the user approved
- Disable or uninstall the hooks (that's `/plugin`, or `HANDOVER_DISABLE=1` for auto-generation)
- Write anything into `HANDOVER.md`. That file is a handover document, never a progress log or a scratchpad;
  the only general write path is `/session-handover:save`, which rewrites it whole
