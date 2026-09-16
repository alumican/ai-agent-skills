---
name: load
description: Load HANDOVER.md (the previous session's handover note) and restore working context. A manual fallback for when the SessionStart hook's auto-injection isn't wired, or you can't tell whether it fired. It reads and reports; it does not modify files (except promoting not-yet-promoted directives into the docs).
---

# /session-handover:load — load the handover note

## Purpose

Loading `HANDOVER.md` is normally done automatically by the SessionStart hook. This command exists to
restore the handover **explicitly and reliably** when that hook isn't wired, or when you can't confirm it
fired. It is the read-side counterpart to the write side (/session-handover:save).

## Steps

### 1. Read

Read `HANDOVER.md` at the project root. If it doesn't exist, report "there is no handover note" and stop
(this is not an error — instead, point to the latest log in the project's worklog/devlog if it has one).

### 2. Check freshness

Compare the header's generation timestamp against `git log -5 --format='%ad %s' --date=iso`. If commits
have moved past the HANDOVER generation time, **note in the restore report that the content may be stale**
(git is newer for work state; HANDOVER's value remains in the intent, the rejected-options, and the
pitfalls).

### 3. Internalize

What is binding for the rest of the session, in particular:

- **§5 Rejected options** — don't re-propose them; carry the reasons forward
- **§9 Pitfalls / cautions** — recall them before touching the relevant area
- **§7 Verification state** — don't mistake "implemented but unverified" for "done"
- **§2 Next move** — the resume point

### 4. Restore report (2–6 lines)

Report briefly to the user: subject / current work state / next move / whether there are not-yet-promoted
directives / a staleness warning (if any). Don't reproduce the whole HANDOVER.md (don't repeat what's
readable on its own).

### 5. Handle not-yet-promoted directives (§3c)

If §3c holds not-yet-promoted user directives, **promote them into the docs with an explicit destination,
and include what you wrote where in the report**. This is reflecting the user's own directive (the
project's "reflect directives into docs" rule), which is distinct from a tool appending things on its own.
However:

- For items where the destination is contested, or that carry a large structural decision, don't execute —
  **put them in the report as a proposal instead**.
- Move promoted items from §3c to §3a in HANDOVER.md (with the destination path attached).

## Writing to HANDOVER.md is restricted

`HANDOVER.md` is a session-handover document and nothing else — **not** a progress log, **not** a scratchpad,
**not** a TODO list. Having read it, do not start writing into it as the session goes on: no progress lines,
no reminders, no "I'll note this here for later". The next `/session-handover:save` overwrites the entire
file, so those notes are lost anyway, and meanwhile they dilute the intent the handover exists to carry.

This command's **only** permitted write is the Step 5 bookkeeping move of a promoted directive from §3c to
§3a. Everything else routes elsewhere: work notes → the project's worklog/devlog, permanent rules →
`CLAUDE.md` and the design docs, a fresh snapshot of where things stand → `/session-handover:save`, and
retiring a consumed note → `/session-handover:trash`.

## What this skill does NOT do

- Generate or overwrite HANDOVER.md (that's /session-handover:save's job)
- Write anything into HANDOVER.md beyond the §3c → §3a move above
- Retire HANDOVER.md when you're done with it (that's /session-handover:trash's job)
- Auto-append a read rule into the project's CLAUDE.md (that setup is done by hand, once)
