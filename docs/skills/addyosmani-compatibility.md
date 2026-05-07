# VIB ↔ addyosmani/agent-skills Compatibility Adapter

## Purpose

Bridge between VIB's **15-field Capability Protocol** and [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) **2-field minimal frontmatter** format. Enables skill import from the addyosmani ecosystem and export of VIB skills to the broader agent-skill community.

## Quick Start

```typescript
import { vibToAddyosmani, addyosmaniToVib } from "../../src/skills/adapters/addyosmani.js";
import type { VibCapability, AddyosmaniSkill } from "../../src/skills/adapters/types.js";

// Export a VIB skill to addyosmani format
const result = vibToAddyosmani(myVibSkill);
console.log("Addyosmani skill:", result.data);
console.log("Dropped fields:", result.warnings);

// Import an addyosmani skill into VIB format
const vib = addyosmaniToVib({ name: "code-review", description: "Reviews code. Use when validating PRs." });
console.log("VIB capability:", vib.data);
```

## Field Mapping

### VIB → addyosmani

| VIB Field | addyosmani | Behaviour |
|-----------|-----------|-----------|
| `name` | `name` | lowercased + hyphenated; warns if changed |
| `description` | `description` | "Use when..." appended if missing; warns if changed |
| `category` | — | warn + drop |
| `version` | — | warn + drop |
| `owner` | — | warn + drop (if set) |
| `inputs` | — | warn + drop (if non-empty) |
| `outputs` | — | warn + drop (if non-empty) |
| `tools` | — | warn + drop (if non-empty) |
| `verification` | — | warn + drop (if non-empty) |
| `failure_modes` | — | warn + drop (if non-empty) |
| `memory` | — | warn + drop (if set) |
| `workflow` | — | warn + drop (if set) |
| `fallback` | — | warn + drop (if set) |
| `handoff` | — | warn + drop (if non-empty) |
| `cost_tracking` | — | warn + drop (if set) |

### addyosmani → VIB

| addyosmani | VIB Field | Value |
|-----------|-----------|-------|
| `name` | `name` | direct copy |
| `description` | `description` | direct copy |
| — | `category` | `"process"` (default) |
| — | `version` | `"0.1.0"` (default) |
| — | `owner` | `"community"` (default) |
| — | `inputs` | `[]` (default) |
| — | `outputs` | `[]` (default) |
| — | `tools` | `[]` (default) |
| — | `verification` | `[]` (default) |
| — | `failure_modes` | `[]` (default) |
| — | `memory` | omitted |
| — | `workflow` | omitted |
| — | `fallback` | omitted |
| — | `handoff` | omitted |
| — | `cost_tracking` | omitted |

## Warning Reference

| Warning Context | Example Reason |
|----------------|---------------|
| Name normalised | `normalized to "context-engineering" (addyosmani convention: lowercase, hyphen-separated)` |
| Description amended | `appended "Use when..." usage guidance (addyosmani convention)` |
| Unmapped VIB field dropped | `no addyosmani equivalent; dropped` |
| Synthetic default injected (addy→VIB) | `synthesized default: "process" (no addyosmani equivalent)` |

## Round-Trip Characteristics

```
VIB (15 fields) ──→ addyosmani (2 fields) ──→ VIB (15 fields)
  • name + description survive intact
  • all other VIB fields are lost on the first leg
  • defaults fill the gaps on the second leg
```

The round-trip is **lossy by design**: the 2-field addyosmani format cannot represent most VIB fields. This is expected — use the adapter for:

- **Importing** addyosmani skills into VIB: accept defaults, enrich later
- **Exporting** VIB skills to addyosmani: accept data loss, share the core intent

## Limitations

- addyosmani skills have no semantic versioning; `0.1.0` is a conservative default
- `workflow` cannot round-trip (addyosmani embeds workflow in prose description)
- `verification` gates and `failure_modes` have no addyosmani equivalent

## Verification

```bash
npx vitest run tests/skills/adapters/addyosmani.test.ts
npm run validate:agent-os-skills   # existing skills unchanged
npm run typecheck
```
