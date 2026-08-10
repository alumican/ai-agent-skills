# AI Agent Skills

Reusable skills for AI coding agents (Claude Code, etc.), distributed as a plugin marketplace.

## Plugins

| Plugin | Commands | Description |
|--------|----------|-------------|
| [fresh-eyes](plugins/fresh-eyes/) | `/fresh-eyes` | Spawn isolated agents to review code/docs with zero prior context |
| [session-handover](plugins/session-handover/) | `/session-handover:save`, `/session-handover:load` | Carry cross-session context via `HANDOVER.md` — intent, design rationale, rejected options, and verification state that code and git history don't preserve |
| [figma-translator](plugins/figma-translator/) | auto-invoked (or `/figma-translator:figma-transcribe`, `/figma-translator:figma-design-system-discipline`) | Reproduce Figma designs exactly from structured data instead of screenshots, and keep a growing design system honest |

## Plugin Marketplace

Install directly via Claude Code's plugin system:

```
# 1. Add this marketplace (one-time setup)
/plugin marketplace add alumican/ai-agent-skills

# 2. Install the plugins you want
/plugin install fresh-eyes@ai-agent-skills
/plugin install session-handover@ai-agent-skills
/plugin install figma-translator@ai-agent-skills
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
/session-handover:save  # write/update this project's HANDOVER.md (run at wave end / before ending a session)
/session-handover:load  # load a previous HANDOVER.md and restore working context
```

It also ships two hooks that **auto-wire on install** (no manual `settings.json` editing):

- **SessionStart** — injects the project's `HANDOVER.md` into context at session start, if one exists.
- **PreCompact** — a safety net that regenerates `HANDOVER.md` right before context compaction. Opt-in: it only acts in projects that already have a `HANDOVER.md` (create the first one with `/session-handover:save`, or set `HANDOVER_AUTO_CREATE=1` to generate from the first compaction).

`HANDOVER.md` is written in the language you work in with the user (default English). Env vars: `HANDOVER_MODEL` (auto-generation model, default `sonnet`), `HANDOVER_DISABLE=1` (disable auto-generation), `HANDOVER_AUTO_CREATE=1` (generate even without an existing `HANDOVER.md`). Auto-generation logs to `<project>/.claude/handover.log`.

Recommended per-project `.gitignore` entries: `HANDOVER.md`, `.claude/handover.log`, `.claude/.handover.lock` (the handover file is a volatile snapshot).

### figma-translator

Two skills that load themselves when the work matches — no command needed.

- **figma-transcribe** — reproduce a Figma design exactly. Reads structure, dimensions, colours and variables from the **Dev Mode MCP** rather than eyeballing a screenshot, so a 1 px border or a variable mode never gets guessed. Works **without registering the MCP server**: a bundled script speaks JSON-RPC to `localhost:3845` directly. Includes an 8-point read checklist (each point answered "confirmed absent", not skipped), variable-mode handling (Desktop/Mobile), instance-override detection, and how to record deliberate divergences from the master.
- **figma-design-system-discipline** — the practices that keep a shared UI layer honest once it grows past the first screen: read the ledger instead of transcribing it, don't write the same look twice, props that can't be omitted, exhaustive maps, never machine-read a display string, shelve colours by nature, fail loudly, verify computed values on a real device.

Requires the Figma **desktop app** running with a design file as the active tab (that's what serves the Dev Mode MCP).

```bash
# The bundled helper, usable straight from a project:
node scripts/figma-mcp.mjs get_metadata '{"nodeId":"1:23"}'
```

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
├── session-handover/
│   ├── .claude-plugin/plugin.json
│   ├── skills/
│   │   ├── save/SKILL.md
│   │   └── load/SKILL.md
│   └── hooks/
│       ├── hooks.json             # auto-wires PreCompact + SessionStart on install
│       ├── precompact-handover.sh
│       ├── sessionstart-handover.sh
│       └── extract-transcript.mjs
└── figma-translator/
    ├── .claude-plugin/plugin.json
    └── skills/
        ├── figma-transcribe/
        │   ├── SKILL.md
        │   └── scripts/           # Dev Mode MCP client + readers (copy into a project's scripts/)
        │       ├── figma-mcp.mjs
        │       ├── figma-context-tree.mjs
        │       └── figma-instance-diff.mjs
        └── figma-design-system-discipline/SKILL.md
```

Each skill follows the [Anthropic Skills spec](https://github.com/anthropics/skills): a `skills/{name}/SKILL.md` with frontmatter (`name`, `description`) plus instructions.

## License

MIT
