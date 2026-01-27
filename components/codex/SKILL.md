---
name: codex
description: Run code analysis, reviews, and consultations using Codex CLI (OpenAI). Executes safely in read-only sandbox mode.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
user-invocable: true
---

# Codex CLI Skill

Use Codex CLI (OpenAI) to perform code analysis, reviews, and consultations.

## Triggers

Load this skill for the following keywords:
- "codex", "ask codex", "consult codex"
- "review this", "look at the code" (in code review context)
- "architecture analysis", "design consultation"

## Do NOT load for

- Simple file reading (Read tool is sufficient)
- Questions Claude can answer alone
- Code editing execution (codex is used in read-only mode)

## Command Syntax

```bash
codex exec --full-auto --sandbox <mode> --cd <dir> "<prompt>"
```

## Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `--sandbox` | `read-only` | Read-only mode (for analysis/review) **Default** |
| | `network-off` | Network disabled (allows local changes) |
| | `off` | No restrictions (**Do not use**) |
| `--cd` | path | Target directory |
| Bash timeout | 300000ms | Codex execution may take time |

## Prompt Structure

All prompts should follow this structure:

```
[Role definition (optional)]
[Task description]
[Scope/constraints (optional)]
[Output format (optional)]

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively.
```

**The closing instruction is mandatory**. Omitting it causes Codex to enter interactive mode, resulting in incomplete output.

## Workflow

### Step 1: Understand the Request
- Classify user request (review/bug investigation/design consultation/etc)
- Use `AskUserQuestion` if unclear

### Step 2: Confirm Target Directory
- If specified: use that path
- If unclear: use `AskUserQuestion` to confirm
- Default: current working directory

### Step 3: Determine Sandbox Mode
- **Default**: `read-only` (for analysis/review)
- Consider `network-off` only if changes are needed
- Never use `off` (security risk)

### Step 4: Compose Prompt
- Select appropriate template
- Incorporate user's specific concerns
- **Always include closing instruction**

### Step 5: Execute Command
- Run `codex exec` using Bash tool
- Set timeout: 300000ms (5 minutes)

### Step 6: Report Results
- Summarize and structure lengthy output
- Prioritize important findings by severity
- Suggest follow-up actions if needed

## Use Case Templates

### 1. Code Review

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"Review the code in this project.
Aspects: code quality, readability, maintainability, potential bugs, security
Output format: Classify issues by severity (High/Medium/Low) with fix suggestions for each

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

### 2. Bug Investigation

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"[Symptom description]

Investigate the cause and output:
1. Cause identification (root cause and direct cause)
2. Impact scope
3. Fix proposal (with code examples)
4. Prevention measures

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

### 3. Refactoring

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"Identify technical debt in this codebase and create a refactoring plan.
Prioritize by impact × cost and include Before/After code examples for each item.

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

### 4. Architecture Analysis

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"Analyze the architecture of this project.
Output: (1) Current structure diagram (Mermaid), (2) Dependency issues, (3) Improvement proposals

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

### 5. UI/UX Evaluation

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"Evaluate this project as a UI designer.
Aspects: visual hierarchy, spacing, color contrast, accessibility, cognitive load
Provide Tailwind CSS/CSS fix examples for each issue.

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

### 6. Specific File/Function Analysis

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"Analyze <function-name/class-name> in <file-path>.
[Analysis aspects or concerns]

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

### 7. Copy/Message Review

```bash
codex exec --full-auto --sandbox read-only --cd <dir> \
"Review user-facing messages in this project (error messages, UI copy, notifications, etc.).
Aspects: clarity, consistency, tone, internationalization
Provide specific improvement suggestions.

No confirmation or questions needed. Output specific suggestions, fixes, and code examples proactively."
```

## Error Handling

| Error | Resolution |
|-------|------------|
| `codex: command not found` | Guide installation: `npm install -g @openai/codex` |
| API authentication error | Advise checking `OPENAI_API_KEY` configuration |
| Timeout | Narrow scope (specify directory/file) |
| Empty/incomplete output | Verify closing instruction in prompt, suggest retry |

## Security Considerations

- **Sandbox required**: Always use `--sandbox read-only`
- **Sensitive data**: Warn when directory contains `.env`, credentials, or API keys
- **Output review**: Verify codex output contains no sensitive information before reporting

## Notes

- For large repositories, narrow the scope (specify directory or file)
- Maintain `--sandbox read-only` for repositories containing sensitive information
- Summarize and structure lengthy output for the user
