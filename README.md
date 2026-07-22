# AI Agent Skills

Reusable skills for AI coding agents (Claude Code, etc.), distributed as a plugin marketplace.

## Plugins

| Plugin | Commands | Description |
|--------|----------|-------------|
| [fresh-eyes](plugins/fresh-eyes/) | `/fresh-eyes` | Spawn isolated agents to review code/docs with zero prior context |
| [session-handover](plugins/session-handover/) | `/handover`, `/handover-load` | Carry cross-session context via `HANDOVER.md` — intent, design rationale, rejected options, and verification state that code and git history don't preserve |

## Plugin Marketplace

Install directly via Claude Code's plugin system:

```
# 1. Add this marketplace (one-time setup)
/plugin marketplace add alumican/ai-agent-skills

# 2. Install the plugins you want
/plugin install fresh-eyes@ai-agent-skills
/plugin install session-handover@ai-agent-skills
```

Update later with `/plugin marketplace update ai-agent-skills`.

> Installing a plugin at **user** scope makes it available in all projects; **project**/**local** scope limits it to one repo. See `--scope` on `/plugin install`. Plugin **hooks activate on the next session start**.

### fresh-eyes

```
/fresh-eyes                               # general review of current directory
/fresh-eyes path/to/dir                   # general review of specific directory
/fresh-eyes src/ "API usability"          # topic perspective of src directory
/fresh-eyes src/ "security"               # topic perspective of src directory
/fresh-eyes dst/ "new user"               # persona perspective of dst directory
/fresh-eyes dst/ "external contributor"   # persona perspective of dst directory
/fresh-eyes . "non-technical stakeholder" # persona perspective of current directory
```

### session-handover

```
/handover       # write/update this project's HANDOVER.md (run at wave end / before ending a session)
/handover-load  # load a previous HANDOVER.md and restore working context
```

It also ships two hooks that **auto-wire on install** (no manual `settings.json` editing):

- **SessionStart** — injects the project's `HANDOVER.md` into context at session start, if one exists.
- **PreCompact** — a safety net that regenerates `HANDOVER.md` right before context compaction. Opt-in: it only acts in projects that already have a `HANDOVER.md` (create the first one with `/handover`, or set `HANDOVER_AUTO_CREATE=1` to generate from the first compaction).

`HANDOVER.md` is written in the language you work in with the user (default English). Env vars: `HANDOVER_MODEL` (auto-generation model, default `sonnet`), `HANDOVER_DISABLE=1` (disable auto-generation), `HANDOVER_AUTO_CREATE=1` (generate even without an existing `HANDOVER.md`). Auto-generation logs to `<project>/.claude/handover.log`.

Recommended per-project `.gitignore` entries: `HANDOVER.md`, `.claude/handover.log`, `.claude/.handover.lock` (the handover file is a volatile snapshot).

## Manual Installation

Skills also work without the plugin system. Copy a skill directory to your project's `.claude/skills/` or user-level `~/.claude/skills/`:

```bash
# Copy a skill directory (example: fresh-eyes)
cp -r plugins/fresh-eyes/skills/fresh-eyes ~/.claude/skills/fresh-eyes
```

Note: manual install carries the **skills only**. The session-handover hooks are wired automatically by the plugin system, so manual installation of that plugin also means wiring its hooks yourself in `settings.json`.

## Structure

This repository is a multi-plugin marketplace. Each plugin is a self-contained directory under `plugins/`:

```
.claude-plugin/
└── marketplace.json          # marketplace catalog (lists the plugins below)
plugins/
├── fresh-eyes/
│   ├── .claude-plugin/plugin.json
│   └── skills/fresh-eyes/SKILL.md
└── session-handover/
    ├── .claude-plugin/plugin.json
    ├── skills/
    │   ├── handover/SKILL.md
    │   └── handover-load/SKILL.md
    └── hooks/
        ├── hooks.json                 # auto-wires PreCompact + SessionStart on install
        ├── precompact-handover.sh
        ├── sessionstart-handover.sh
        └── extract-transcript.mjs
```

Each skill follows the [Anthropic Skills spec](https://github.com/anthropics/skills): a `skills/{name}/SKILL.md` with frontmatter (`name`, `description`) plus instructions.

## License

MIT
