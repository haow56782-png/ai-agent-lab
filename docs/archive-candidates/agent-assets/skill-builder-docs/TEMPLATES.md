---
name: "Skill Builder Templates"
description: "Templates for basic, intermediate, and advanced Claude Code Skills. Referenced by Skill Builder SKILL.md when creating new skills."
---

# Skill Builder Templates

> 本文档是 Skill Builder 的模板库。**什么时候读**：当你要创建技能，需要模板参考时。**什么时候不用读**：日常技能创建指导在 `SKILL.md` 中。

---

## Template 1: Basic Skill (Minimal)

```markdown
---
name: "My Basic Skill"
description: "One sentence what. One sentence when to use."
---

# My Basic Skill

## What This Skill Does
[2-3 sentences describing functionality]

## Quick Start
```bash
# Single command to get started
```

## Step-by-Step Guide

### Step 1: Setup
[Instructions]

### Step 2: Usage
[Instructions]

### Step 3: Verify
[Instructions]

## Troubleshooting
- **Issue**: Problem description
  - **Solution**: Fix description
```
```

## Template 2: Intermediate Skill (With Scripts)

```markdown
---
name: "My Intermediate Skill"
description: "Detailed what with key features. When to use with specific triggers: scaffolding, generating, building."
---

# My Intermediate Skill

## Prerequisites
- Requirement 1
- Requirement 2

## What This Skill Does
1. Primary function
2. Secondary function
3. Integration capability

## Quick Start
```bash
./scripts/setup.sh
./scripts/generate.sh my-project
```

## Configuration
Edit `config.json`:
```json
{
  "option1": "value1",
  "option2": "value2"
}
```

## Step-by-Step Guide

### Basic Usage
[Steps for 80% use case]

### Advanced Usage
[Steps for complex scenarios]

## Available Scripts
- `scripts/setup.sh` - Initial setup
- `scripts/generate.sh` - Code generation
- `scripts/validate.sh` - Validation

## Resources
- Templates: `resources/templates/`
- Examples: `resources/examples/`

## Troubleshooting
[Common issues and solutions]
```

## Template 3: Advanced Skill (Full-Featured)

```markdown
---
name: "My Advanced Skill"
description: "Comprehensive what with all features and integrations. Use when [trigger 1], [trigger 2], or [trigger 3]. Supports [technology stack]."
---

# My Advanced Skill

## Overview
[Brief 2-3 sentence description]

## Prerequisites
- Technology 1 (version X+)
- Technology 2 (version Y+)
- API keys or credentials

## What This Skill Does
1. **Core Feature**: Description
2. **Integration**: Description
3. **Automation**: Description

---

## Quick Start (60 seconds)

### Installation
```bash
./scripts/install.sh
```

### First Use
```bash
./scripts/quickstart.sh
```

Expected output:
```
✓ Setup complete
✓ Configuration validated
→ Ready to use
```

---

## Configuration

### Basic Configuration
Edit `config.json`:
```json
{
  "mode": "production",
  "features": ["feature1", "feature2"]
}
```

### Advanced Configuration
See [Configuration Guide](docs/CONFIGURATION.md)

---

## Step-by-Step Guide

### 1. Initial Setup
[Detailed steps]

### 2. Core Workflow
[Main procedures]

### 3. Integration
[Integration steps]

---

## Advanced Features

### Feature 1: Custom Templates
```bash
./scripts/generate.sh --template custom
```

### Feature 2: Batch Processing
```bash
./scripts/batch.sh --input data.json
```

### Feature 3: CI/CD Integration
See [CI/CD Guide](docs/CICD.md)

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `install.sh` | Install dependencies | `./scripts/install.sh` |
| `generate.sh` | Generate code | `./scripts/generate.sh [name]` |
| `validate.sh` | Validate output | `./scripts/validate.sh` |
| `deploy.sh` | Deploy to environment | `./scripts/deploy.sh [env]` |

---

## Resources

### Templates
- `resources/templates/basic.template` - Basic template
- `resources/templates/advanced.template` - Advanced template

### Examples
- `resources/examples/basic/` - Simple example
- `resources/examples/advanced/` - Complex example
- `resources/examples/integration/` - Integration example

### Schemas
- `resources/schemas/config.schema.json` - Configuration schema
- `resources/schemas/output.schema.json` - Output validation

---

## Troubleshooting

### Issue: Installation Failed
**Symptoms**: Error during `install.sh`
**Cause**: Missing dependencies
**Solution**:
```bash
# Install prerequisites
npm install -g required-package
./scripts/install.sh --force
```

### Issue: Validation Errors
**Symptoms**: Validation script fails
**Solution**: See [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

---

## API Reference
Complete API documentation: [API_REFERENCE.md](docs/API_REFERENCE.md)

## Related Skills
- [Related Skill 1](../related-skill-1/)
- [Related Skill 2](../related-skill-2/)

## Resources
- [Official Documentation](https://example.com/docs)
- [GitHub Repository](https://github.com/example/repo)
- [Community Forum](https://forum.example.com)

---

**Created**: 2025-10-19
**Category**: Advanced
**Difficulty**: Intermediate
**Estimated Time**: 15-30 minutes
```

---

## VIB 实践示例

### Example 1: Simple Documentation Skill

```markdown
---
name: "README Generator"
description: "Generate comprehensive README.md files for GitHub repositories. Use when starting new projects, documenting code, or improving existing READMEs."
---

# README Generator

## What This Skill Does
Creates well-structured README.md files with badges, installation, usage, and contribution sections.

## Quick Start
```bash
# Answer a few questions
./scripts/generate-readme.sh

# README.md created with:
# - Project title and description
# - Installation instructions
# - Usage examples
# - Contribution guidelines
```

## Customization
Edit sections in `resources/templates/sections/` before generating.
```

### Example 2: Code Generation Skill

```markdown
---
name: "React Component Generator"
description: "Generate React functional components with TypeScript, hooks, tests, and Storybook stories. Use when creating new components, scaffolding UI, or following component architecture patterns."
---

# React Component Generator

## Prerequisites
- Node.js 18+
- React 18+
- TypeScript 5+

## Quick Start
```bash
./scripts/generate-component.sh MyComponent

# Creates:
# - src/components/MyComponent/MyComponent.tsx
# - src/components/MyComponent/MyComponent.test.tsx
# - src/components/MyComponent/MyComponent.stories.tsx
# - src/components/MyComponent/index.ts
```

## Step-by-Step Guide

### 1. Run Generator
```bash
./scripts/generate-component.sh ComponentName
```

### 2. Choose Template
- Basic: Simple functional component
- With State: useState hooks
- With Context: useContext integration
- With API: Data fetching component

### 3. Customize
Edit generated files in `src/components/ComponentName/`

## Templates
See `resources/templates/` for available component templates.
```

### File References and Navigation

Claude 可以自动导航到引用文件。使用方式：

```markdown
See [Advanced Configuration](docs/ADVANCED.md) for complex scenarios.
See [Troubleshooting Guide](docs/TROUBLESHOOTING.md) if you encounter errors.
```

**最佳实践**：SKILL.md 控制在 ~2-5KB。长内容移到独立文件并引用。
