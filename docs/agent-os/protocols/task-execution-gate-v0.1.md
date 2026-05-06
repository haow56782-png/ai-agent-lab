# Task Execution Gate v0.1

## Purpose

Turn AGENTS.md's Plan→Execute→Verify→Report workflow from a human-readable specification into a machine-verifiable contract. Every task report MUST pass this gate before its result is accepted.

## Required Fields

All task reports must contain the following 7 top-level fields in a YAML code block:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | object | yes | Task objective and execution steps |
| `changed_files` | array | yes | List of files changed by the task |
| `commands_run` | array | yes | Commands executed with exit codes |
| `verification_result` | object | yes | Gate results with status PASS/PARTIAL/FAIL |
| `test_result` | object | yes | Test outcomes |
| `unresolved_risks` | array | yes | Remaining risks after task completion |
| `next_recommended_action` | object | yes | Suggested next step |

## Field Specifications

### plan

```yaml
plan:
  objective: string        # One-line task summary
  steps:                   # Ordered execution steps
    - string
```

### changed_files

```yaml
changed_files:
  - path: string           # File path relative to project root
    action: string         # created | modified | deleted
    summary: string        # One-line change description
```

### commands_run

```yaml
commands_run:
  - command: string        # Exact command executed
    exit_code: number      # 0 for success, non-zero for failure
    output: string         # Summary of stdout/stderr
```

### verification_result

```yaml
verification_result:
  status: string           # PASS | PARTIAL | FAIL
  total: number            # Total gates executed
  passed: number           # Gates that passed
  failed: number           # Gates that failed
  gates:
    - id: string           # Gate identifier
      status: string       # passed | failed
      evidence: string     # Command output or evidence reference
```

### test_result

```yaml
test_result:
  test_files: number       # Number of test files executed
  tests_passed: number     # Tests that passed
  tests_failed: number     # Tests that failed
  duration_ms: number      # Total execution time in milliseconds
```

### unresolved_risks

```yaml
unresolved_risks:
  - risk: string           # Risk description
    severity: string       # high | medium | low
    impact: string         # What happens if ignored
```

### next_recommended_action

```yaml
next_recommended_action:
  action: string           # Suggested next step
  reason: string           # Rationale
```

## Validation Rules

1. All 7 fields must exist at the top level of the YAML block
2. `verification_result.status` must be exactly `PASS`, `PARTIAL`, or `FAIL`
3. `changed_files` must be a non-empty array (use `[]` for read-only tasks)
4. `commands_run` must be a non-empty array
5. `unresolved_risks` must be an array (can be empty)
6. `test_result` must have `tests_passed` and `tests_failed` as numbers
7. All `changed_files[].action` values must be `created`, `modified`, or `delete`

## Integration

This gate is enforced by `scripts/validate-agent-task-report.mjs`:

```bash
node scripts/validate-agent-task-report.mjs < task-report.md
npm run validate:agent-task-report -- < task-report.md
```

The validator:
- Reads YAML from the first ```yaml block in stdin or a file
- Checks all 7 fields per the rules above
- Exits 0 on PASS, 1 on FAIL
- Prints per-field validation results to stdout

## Relation to Verification Gate Skill

The Task Execution Gate is the outer wrapper that validates the *report structure*. The Verification Gate Skill (`.claude/skills/verification-gate-skill/`) validates the *content* of each individual gate. The two gates operate at different layers:

```
Task Execution Gate  (report structure)   ← this protocol
    └── Verification Gate Skill (content) ← existing skill
```

## Example: Valid Minimal Report

```yaml
plan:
  objective: "Fix CI type error"
  steps:
    - "Add missing type annotation"
    - "Run typecheck"

changed_files:
  - path: "src/index.ts"
    action: "modified"
    summary: "Added return type annotation"

commands_run:
  - command: "npm run typecheck"
    exit_code: 0
    output: "tsc --noEmit passed"

verification_result:
  status: "PASS"
  total: 1
  passed: 1
  failed: 0
  gates:
    - id: "gate-typecheck"
      status: "passed"
      evidence: "npm run typecheck exit 0"

test_result:
  test_files: 0
  tests_passed: 0
  tests_failed: 0
  duration_ms: 0

unresolved_risks: []

next_recommended_action:
  action: "Merge PR"
  reason: "CI green, no blockers"
```
