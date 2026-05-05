# VIB Component Rules & Architecture

## Component Philosophy

VIB components follow three principles:
1. **Predictable** — Same input always produces the same output
2. **Composable** — Small, focused components combine into larger patterns
3. **Accessible** — Every component meets WCAG 2.1 AA as a baseline

---

## Component Classification

| Tier | Category | Examples | Quality Bar |
|------|----------|----------|-------------|
| **T1** | Primitives | Button, Input, Badge, Icon | Fully tested, edge cases covered |
| **T2** | Composites | Card, Table, Modal, Select | Composition of T1 + state handling |
| **T3** | Patterns | AgentList, ChatBubble, DashboardGrid | Page-specific compositions |
| **T4** | Pages | AgentDetail, Settings, Login | Full page layouts |

- T1/T2: Shared across the entire platform (design system)
- T3: Shared within a domain (agents, monitor, settings)
- T4: Page-specific, can import anything below

---

## Naming Conventions

### Files
- **React components**: `PascalCase.tsx` — `Button.tsx`, `AgentCard.tsx`
- **Hooks**: `useCamelCase.ts` — `useAgentStatus.ts`
- **Utilities**: `camelCase.ts` — `formatDate.ts`
- **Types**: `PascalCase.types.ts` — `Agent.types.ts`
- **Styles**: `ComponentName.module.css` or use design tokens directly

### CSS Classes (when not using CSS-in-JS)
```css
/* Block: component name */
.vib-button {}

/* Element: part of a component */
.vib-button__icon {}

/* Modifier: state or variant */
.vib-button--primary {}
.vib-button--disabled {}
```

### React Props (TypeScript conventions)
```typescript
// Boolean props use is/has/should prefix
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isLoading?: boolean;
  isFullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

---

## State Coverage

Every interactive component must handle:

| State | Requirement | Example |
|-------|-------------|---------|
| **Default** | Resting appearance | Primary button, blue filled |
| **Hover** | Visual feedback on cursor hover | Slightly darker background |
| **Active/Pressed** | Momentary feedback on click/tap | Scale down 2% or darker bg |
| **Focus** | Visible focus ring (keyboard nav) | 2px offset ring in brand color |
| **Disabled** | Grayed out, no interaction | 50% opacity, `cursor: not-allowed` |
| **Loading** | Processing indicator | Spinner replacing icon |
| **Error** | Validation failure | Red border + error message |
| **Empty** | No content to display | Illustration + message + CTA |

### Focus Ring Specification
```css
/* All interactive elements */
.vib-focus-ring:focus-visible {
  outline: 2px solid var(--vib-border-focus);
  outline-offset: 2px;
  border-radius: var(--vib-radius-md);
}
```

---

## Accessibility Rules

1. **All interactive elements** must be keyboard-accessible (Tab, Enter, Space, Escape)
2. **All images/icons** must have alt text or `aria-hidden="true"`
3. **Color not sufficient** for conveying information — always include icon/text
4. **Form inputs** must have associated `<label>` elements
5. **Dynamic content** must use `aria-live` regions
6. **Modals** must trap focus and restore on close
7. **Touch targets** minimum 44x44px on mobile
8. **Heading hierarchy** must not skip levels

### Accessible Button Pattern
```tsx
<button
  className="vib-button vib-button--primary"
  disabled={isDisabled}
  aria-busy={isLoading}
  aria-label={iconOnly ? "Close dialog" : undefined}
  type="button"
>
  {isLoading ? <Spinner /> : icon}
  {!iconOnly && label}
</button>
```

---

## Composition Patterns

### Props Spreading (Forwarded Props)
```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
}

function Card({ variant = 'default', padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'vib-card',
        `vib-card--${variant}`,
        `vib-card--pad-${padding}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Compound Components (for complex composites)
```tsx
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Status</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>DataBot</Table.Cell>
      <Table.Cell><StatusDot status="online" /></Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

---

## CSS & Theming Rules

1. **Never use raw color values** — always reference `--vib-*` tokens
2. **Avoid `!important`** — use selector specificity instead
3. **Never style based on DOM position** (`:first-child`, `nth-child`) in reusable components
4. **Use semantic tokens** (--vib-bg-primary) not primitive tokens (--vib-gray-50) in components
5. **Dark mode** is automatic via `[data-theme="dark"]` — no component-specific dark queries

---

## Testing Expectations

| Component Tier | Tests Required |
|----------------|----------------|
| T1 (Primitives) | Unit: render, states, a11y, event handlers |
| T2 (Composites) | Unit + Integration: composition, state flow |
| T3 (Patterns) | Integration: data flow, user interactions |
| T4 (Pages) | E2E: critical user paths |

### Sample Test Pattern (Button)
```tsx
// Renders correctly
it('renders with default props', () => { /* ... */ });
it('renders all variants', () => { /* ... */ });
it('renders all sizes', () => { /* ... */ });

// States
it('shows loading state', () => { /* ... */ });
it('is disabled when isDisabled=true', () => { /* ... */ });

// Events
it('calls onClick when clicked', () => { /* ... */ });
it('does not call onClick when disabled', () => { /* ... */ });

// Accessibility
it('has proper aria attributes when loading', () => { /* ... */ });
it('is keyboard accessible', () => { /* ... */ });
```

---

## File Organization

```
components/
├── ui/                    # T1 Primitives
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Spinner.tsx
│   └── ...
├── composite/             # T2 Composites
│   ├── DataTable.tsx
│   ├── Modal.tsx
│   ├── Select.tsx
│   ├── BottomSheet.tsx
│   └── ...
├── agents/                # T3 Agent domain patterns
│   ├── AgentCard.tsx
│   ├── AgentList.tsx
│   ├── AgentStatus.tsx
│   └── ...
├── chat/                  # T3 Chat patterns
│   ├── ChatBubble.tsx
│   ├── MessageInput.tsx
│   └── ...
└── layout/                # Layout wrappers
    ├── DashboardLayout.tsx
    ├── MobileLayout.tsx
    ├── Sidebar.tsx
    └── TopBar.tsx
```

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Component render time | < 16ms (60fps) |
| Bundle size (T1 + T2) | < 30KB gzipped |
| Re-renders on prop change | 1 (no cascading) |
| Event handler attachments | Less than DOM nodes |
