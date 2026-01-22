# Core Rules

## Linear Issue Creation

When creating Linear issues, ALWAYS use the `/linear-issue` skill.

- DO NOT call MCP tools (`mcp__plugin_linear_linear__*`) directly
- The skill ensures proper labels (Type, Repository) and description templates

## Starting Development Work

When starting work on a Feature/Bug/Chore, use the `/start-work` skill.

- Creates isolated git worktree for development
- Fetches Linear issue details and branch name automatically
- Calls `/linear-issue` internally if no issue exists

DO NOT use for Thinking issues (no worktree needed).
