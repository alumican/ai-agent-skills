# AI Agent Skills

Reusable skills for AI coding agents (Claude Code, etc.).

## Skills

| Skill | Description |
|-------|-------------|
| [fresh-eyes](skills/fresh-eyes/) | Spawn isolated agents to review code/docs with zero prior context |

## Plugin Marketplace

Install directly via Claude Code's plugin system:

```
# 1. Add this marketplace (one-time setup)
/plugin marketplace add alumican/ai-agent-skills

# 2. Install the fresh-eyes skill
/plugin install fresh-eyes@ai-agent-skills
```

```
# 3. Use it
/fresh-eyes                               # general review of current directory
/fresh-eyes path/to/dir                   # general review of specific directory
/fresh-eyes src/ "API usability"          # topic perspective of src directory
/fresh-eyes src/ "security"               # topic perspective of src directory
/fresh-eyes dst/ "new user"               # persona perspective of dst directory
/fresh-eyes dst/ "external contributor"   # persona perspective of dst directory
/fresh-eyes . "non-technical stakeholder" # persona perspective of current directory
```

Update later with `/plugin marketplace update ai-agent-skills`.

## Manual Installation

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
