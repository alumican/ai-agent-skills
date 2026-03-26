# AI Agent Skills

Reusable skills for AI coding agents (Claude Code, etc.).

## Skills

| Skill | Description |
|-------|-------------|
| [fresh-eyes](skills/fresh-eyes/) | Spawn isolated agents to review code/docs with zero prior context |

## Installation

Add a skill to your project's `.claude/commands/` or user-level `~/.claude/skills/`:

```bash
# Copy the skill directory
cp -r skills/fresh-eyes ~/.claude/skills/fresh-eyes
```

Or reference it directly in your Claude Code settings.

## Format

Each skill follows the [Anthropic Skills spec](https://github.com/anthropics/skills):

```
skills/{name}/
└── SKILL.md          # Frontmatter (name, description) + instructions
```

## License

MIT
