---
name: "Git Commit Formatter"
description: "Format git commit messages using Conventional Commits standard. Use when writing commit messages, preparing PR descriptions, or standardizing team commit history."
---

# Git Commit Formatter

## What This Skill Does

Formats git commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) standard with proper type, scope, and description structure.

## Quick Start

```bash
# Format the last commit message
git commit --amend -m "$(git log -1 --pretty=%B | <this skill will rewrite>)"
```

## Step-by-Step Guide

### 1. Choose Commit Type

| Type | When to Use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code restructuring without feature/bug change |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies, tooling |

### 2. Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Examples**:
- `feat(auth): add login with OAuth2`
- `fix(api): handle empty response from /users endpoint`
- `docs(readme): update installation instructions`

### 3. Verify

```bash
# Check recent commits
git log --oneline -5
```

## Troubleshooting

- **Issue**: Commit message too long
  - **Solution**: Keep first line under 72 characters, put details in body
- **Issue**: Unclear what type to use
  - **Solution**: Use `chore` for tooling, `refactor` for code changes without behavior change
