## Default Product Quality Guardrails

These guardrails are the default standard for this repository unless a product requirement explicitly overrides them.

### Step3 Parse Experience

- Step3 is a product-defining interaction surface, not a generic loading screen.
- The target interaction is a Manus-style "document under glass" parsing experience:
  - flowing paper / printer-read feeling
  - glass-layer reflections
  - scanner sweep / progressive reveal
  - structure recognition linked to stage progress
  - visible per-stage timing and task advancement
- Avoid fallbacking to black-box dashboards, static progress bars, or plain skeleton screens as the main experience.
- If a new implementation does not visibly achieve this interaction quality in browser QA, it should be treated as not accepted even if the data flow works.

### Quality Gate

- Product, interaction, visual, and QA standards should be evaluated together.
- "Works technically" is not enough for Step3 acceptance; the browser-visible interaction quality must also pass.
- When there is tension between fast implementation and Step3 experience quality, preserve the experience bar and simplify secondary UI elsewhere instead.


## Active Coding Standard

- The active coding baseline for this repository is `docs/coding-baseline-v2.md`.
- It supersedes earlier baseline drafts when there is any conflict.
- All future frontend and backend implementation, refactoring, review feedback, and architecture decisions should follow the v2.0 baseline by default.
- If a local file, comment, or older note conflicts with v2.0, prefer v2.0 unless a newer ADR explicitly overrides it.

## Default Coding Baseline

These are the default coding standards for both frontend and backend work in this repository.

### Architectural Thinking

- Code should present clear responsibility boundaries, explicit data flow, and stable dependency direction.
- Prefer layered organization: input validation at the edge, orchestration in services/controllers, domain rules in domain-facing modules, and I/O at the boundary.
- Business language should map directly into code names and module boundaries whenever possible.
- New behavior should prefer extension over invasive modification of existing stable interfaces.

### Readability And Structure

- Optimize for six-month readability, not only short-term velocity.
- Functions should usually fit within one screen and should do one thing well.
- If a function name naturally wants the word `and`, it likely has too many responsibilities.
- Comments should explain `why`, boundary conditions, or architectural intent, not narrate obvious syntax.
- Keep visible logical whitespace between phases of a workflow so the control flow is easy to scan.

### Explicit Data Flow

- Prefer explicit parameters and return values over hidden state, implicit mutation, or broad closure capture.
- Pure transformations should stay pure where possible.
- Side effects such as network, database, storage, timers, and file I/O should stay near controllers/services or clearly marked orchestration edges.
- Avoid implicit cross-module coupling; a reader should be able to see where data comes from and where it goes.

### Defensive Programming

- Treat all external input as untrusted and validate shape, type, length, and format.
- Guard all object access that may be nullable or optional.
- Prefer `unknown` plus type guards over `any`.
- Async boundaries should have deliberate error handling with meaningful fallback or failure behavior.

### Error Handling

- Errors should be explicit, typed where practical, and handled by layer.
- Low-level modules should raise precise failures such as validation, not-found, or storage/network errors.
- Controllers/routes should return a stable response shape and should not leak raw internal errors.
- Do not silently swallow failures that affect user trust or downstream state.

### Simplicity And Reuse

- Prefer the simplest design that cleanly fits the current problem.
- Avoid premature abstraction and unnecessary indirection.
- Keep each piece of knowledge defined once: validation rules, formatting policies, config values, and shared types should not drift across files.
- Use repetition as a signal: extract only when duplication reflects the same knowledge, not merely similar-looking code.

### Light Domain Modeling

- When business concepts are stable, model them directly through entities, value-like objects, repositories, and services with clear names.
- Core business rules should live close to the business object or service that owns them.
- Important state transitions should happen through named methods or orchestration steps, not ad hoc property mutation.

### Acceptance Standard

- "It works" is the floor, not the bar.
- New code should be architecturally legible, readable, concise, and close to the business model.
- When there is tension between speed and clarity, choose the clearest design that still keeps momentum.
