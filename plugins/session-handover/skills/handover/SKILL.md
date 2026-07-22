---
name: handover
description: Generate and update HANDOVER.md — a session handover note that carries the context code and git history don't keep: user direction, design rationale, rejected options, and verification state. Run it at wave boundaries, before ending a session, or when context is getting long. Also invoked automatically by the PreCompact hook.
---

# /handover — write the session handover note

## Purpose (what problem this solves)

Context is lost across sessions. What survives in the code and the git log is only *what was done* —
**not *why*, not *what the user asked for*, not *what was discarded*, not *how far it was verified*.**
This skill pins that non-code context into `HANDOVER.md` (project root, fully rewritten each time),
so the next session can return to the same footing in minutes.

Good handover is measured by **preservation of intent**, not by volume of facts. What the user cares
about, what frustrated them, which direction they rejected — if that is lost, the next session repeats
the same debates and redoes the same mistakes. That is the core value of this skill.

## When to run

- At a wave boundary / major checkpoint (ideally right before a completion report)
- Before ending a session
- When context is getting long and compaction feels near
- **Automatically**: the PreCompact hook (`hooks/precompact-handover.sh`, bundled with this plugin)
  generates it headless just before compaction. But that is a safety net — the in-session /handover
  has richer context and higher quality. **Manual is primary; the hook is the backup.**

## Output language

Write `HANDOVER.md` in the language you use with the user (default to English if it can't be
determined). Preserve the user's own words verbatim in their original language (see "Writing
discipline"). The **section numbers** (§1–§10, and §3a/§3b/§3c) are stable anchors that the hooks and
`/handover-load` rely on — keep them regardless of language.

## Steps

### Step 0 — take stock of the existing HANDOVER.md

If a `HANDOVER.md` already exists, read it. Carry still-live items (open tasks, not-yet-promoted
directions, valid pitfalls) into the new version. Drop resolved or stale items (history is the job of
the worklog and the git log).

### Step 1 — sort the information (the most important step)

Before writing, sort what happened this session into three layers. **HANDOVER.md is only for
"information that has nowhere else to live"** — it is not a shelter for permanent information.

| Layer | Home | What goes here |
|---|---|---|
| Permanent rules | The project's `CLAUDE.md` / design docs | "From now on…" directives, settled specs and design state, methodology |
| Wave history | A worklog / devlog directory (if the project keeps one) | What was requested, audit invariants, the record of how things were tried |
| Volatile session context | `HANDOVER.md` (project root) | Work-in-progress state, the next move, not-yet-promoted directives, the reasoning behind decisions, rejected options, gaps in verification |

Promotion rules:

- If a directive that should become a permanent rule is not yet in the docs, **reflect it into the docs
  before writing it into HANDOVER** (follow the project's "reflect directives into docs" rule if it has
  one, i.e. same-wave reflection). Leave only the destination path in HANDOVER.
- When there's no room to reflect (right before PreCompact, or headless auto-generation), write it
  **verbatim** into template §3c "Not yet promoted" and make it the next session's first job.
- During headless auto-generation (via the PreCompact hook), do **not** modify any docs. The only write
  target is HANDOVER.md; every promotion candidate goes into §3c.

### Step 2 — rewrite the whole file from the template

Rewrite the entire file every time; don't append. There is no length limit — **richer is fine.** The only
thing you may cut is "information that won't change the next session's actions." Never let intent wither
for the sake of compression.

### Step 3 — quality gate (the fresh-instance test)

When you're done, ask yourself: **could a brand-new session that knows nothing about this project, given
only the project's CLAUDE.md, its docs, and this HANDOVER.md, (1) resume the in-progress work from the
correct next move, (2) avoid asking the user the same questions again, and (3) avoid re-proposing
already-rejected options?** If any of the three is "no," fill that gap before closing.

## HANDOVER.md template

```markdown
# HANDOVER — session handover note

> Generated: YYYY-MM-DD HH:MM / method: in-session /handover (or "PreCompact auto-generation")
> This file is fully overwritten each time — a volatile snapshot. Permanent info lives in CLAUDE.md and the docs.

## 1. Session subject (1–2 lines)

What this session was for. The user's original request in one line.

## 2. Current work state

- **Done**: what finished (always note whether it's verified)
- **In progress**: which file, how far. **The next move at an executable granularity**
  (e.g. "in src/x.tsx:120 change ◯◯ to △△; watch out for □□")
- **Not started**: parts of the request not yet touched

## 3. User directives (received this session)

### 3a. Promoted to permanent rules
- "(summary of the directive)" → reflected in: CLAUDE.md §… / docs/….md
### 3b. Session-only instructions
- Conditions/preferences that apply to this task only
### 3c. ⚠ Not yet promoted (the next session handles these first)
- "(**verbatim quote**)" → candidate destination: …

## 4. Design intent / rationale (the "why" that can't be read from the code)

- Why this structure. Which principle it was derived from
- Implicit assumptions (state "this presupposes that …" explicitly)
- Observed user preferences/values (include phrasing and intensity;
  strong corrections — "never do X again" level — especially)

## 5. Rejected options and why

| Option | Why rejected | Condition to reconsider |
|---|---|---|
| … | … | (or "none") |

## 6. Relevant files

| Path | Its role this session |
|---|---|

## 7. Verification state (word-gate)

- What can be called "done": … (which checks were run: typecheck / tests / real invocation)
- **Implemented but unverified**: … (name the missing axis)
- Verification commands: `npm run build` / `npm test` / …

## 8. Remaining tasks / residual list

- Gated deferrals (with the reason; only those that passed the project's deferral bar)
- Interrupted items (didn't pass the bar; land them next session)

## 9. Pitfalls / cautions

- Gotchas specific to this work area
- Fragile invariants (**with exact values**, e.g. "needsReply=5 (IDs: A/B/C/D/E)")

## 10. How the next session resumes

1. Follow the project's doc-reading order (CLAUDE.md → README → design docs → latest worklog if any)
2. First command to run: …
3. First thing to do: … (handle §3c not-yet-promoted, then §2's next move — in that order)
```

## Writing discipline

- **Preserve verbatim**: quote important directives in the user's own words, don't paraphrase. Better long
  than have intent wither in a summary. Negations and corrections especially ("stop doing X", "no, not
  that") go in the original wording and original language.
- **Tone is context too**: for points the user corrected strongly or raised repeatedly, keep not just the
  fact but the intensity. It's the only thing that keeps the next session off the same landmine.
- **Be concrete**: not "a test failed" but "`npm run build` reports a type error at src/x.tsx:42, cause is
  ◯◯". Write with file:line, exact values, and the exact command run. Vague summaries are worthless in a
  handover.
- **Separate guess from fact**: mark unverified beliefs as "should be … (unverified)". A guess written as
  fact becomes the seed of a misdiagnosis next session.
- **Record why an option was rejected — to prevent recurrence**: not "chose B" but "A rejected because ◯◯,
  chose B". Without the reason, the next session re-proposes A.
- **Overwrite discipline**: HANDOVER.md is not a permanent file, it's a snapshot of where things stand.
  Send old content that deserves keeping to the worklog; delete the rest.

## How this plugin (session-handover) is wired

- `HANDOVER.md` is a volatile file at the project root (fully overwritten each time). Permanent info lives
  in the project's CLAUDE.md and design docs. Whether to commit it is the project's call, but as a volatile
  snapshot **gitignore is recommended** (in projects that keep a worklog, the committed history is the
  worklog's job).
- The hooks **auto-wire** when the session-handover plugin is installed and enabled (no settings.json
  editing):
  - **PreCompact** → `hooks/precompact-handover.sh`: just before compaction, builds a transcript excerpt and
    has a headless `claude -p` read this SKILL.md to auto-generate HANDOVER.md (safety net). It acts **only
    in projects that already have a HANDOVER.md** (opt-in; set `HANDOVER_AUTO_CREATE=1` to generate from the
    first compaction).
  - **SessionStart** → `hooks/sessionstart-handover.sh`: if a HANDOVER.md exists, injects it into context at
    session start.
- The read side has three paths: ① the SessionStart hook's auto-injection (primary) → ② the project's
  CLAUDE.md "read it if present" rule, if it has one → ③ the manual command `/handover-load` (bundled with
  this plugin).
- Environment variables: `HANDOVER_MODEL` (model for auto-generation, default `sonnet`) / `HANDOVER_DISABLE=1`
  (disable auto-generation) / `HANDOVER_AUTO_CREATE=1` (generate even without an existing HANDOVER.md).
  Activity is logged to `<project>/.claude/handover.log`.
