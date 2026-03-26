---
name: fresh-eyes
description: Use this skill when you want an objective outside perspective on code, documentation, or architecture. Spawns isolated Claude agents that review a directory with zero prior context — no hints, no conversation history. They report what they understand, what confuses them, and what's missing.
---

# Fresh Eyes

Spawn isolated Claude agents to review a directory with zero prior context. Each agent can ONLY see files inside the target directory — no hints, no background, no conversation history. They report what they understand, what confuses them, and what's missing.

## Usage

```
/fresh-eyes                              → review current working directory, general perspective
/fresh-eyes apps/my-app                  → review a specific directory
/fresh-eyes packages/ "API usability"    → review with a specific perspective
```

## How It Works

1. **Parse the request** — extract target directory and perspective (if any)
2. **Spawn one or more Agent(s)** — each agent is given ONLY the target directory path and told it has NO access outside of it
3. **Collect the report** and present it to the user

## Agent Spawning Rules

- Each agent's prompt must:
  - State clearly that the agent has ONLY access to the specified directory
  - State clearly that the agent has NO prior context about the project
  - List the specific questions to answer (see templates below)
  - Instruct the agent to read documentation first, then code, then report honestly

## Perspectives

When the user specifies a perspective, focus the agent's questions on that angle. When no perspective is given, use the **General** template.

### General (no perspective specified)

#### Understanding
- In your own words, what is this? What problem does it solve?
- Was anything unclear or ambiguous after reading the docs?

#### Usability
- Could you use/run/modify this from the docs alone?
- What's the first thing that would block or confuse you?
- What assumptions does the documentation make about your knowledge?

#### Quality
- Does the code match what the docs describe? Any inconsistencies?
- Any dead code, unused config, or misleading comments?
- Anything that looks like a bug?

#### What's Missing
- What would you want to know that isn't documented?
- What would make the docs better?
- What would make the code better?

### Specific Perspectives

When the user provides a perspective, adapt the questions. Examples:

- **"API usability"** — Is the public API clear? Are exports well-organized? Could you use this as a library?
- **"onboarding"** — Could a new developer get productive quickly? What's the learning curve?
- **"documentation"** — Are the docs accurate, complete, and well-structured? Any gaps?
- **"architecture"** — Is the design sound? Are responsibilities well-separated? Any coupling issues?
- **"security"** — Any obvious vulnerabilities? Input validation? Secret handling?

## Multiple Agents

When the target is large (e.g., a monorepo with multiple packages), spawn **separate agents for each subdirectory** so they truly cannot see each other's code. This reveals whether each part is self-explanatory in isolation.

When using multiple agents, launch them **in parallel**.

## Output Format

After collecting agent reports, present:

1. **What's working well** — things the agent understood clearly
2. **Issues found** — categorized by severity (bug / inconsistency / gap / suggestion)
3. **Synthesis** — if multiple agents, highlight where their understanding diverged

## Important

- The agent must be **brutally honest**. Instruct it to report confusion, not paper over it.
- Never pre-brief the agent about the project. The whole point is zero context.
- The agent should read docs, README, or CLAUDE.md FIRST, then code. This tests whether the docs actually work.
- If the agent finds something that contradicts the docs, that's a high-value finding.
