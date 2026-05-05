# VIB Mobile H5 UI Guidelines

## Overview

The VIB mobile H5 experience provides agent management, chat, and monitoring on the go. These pages are rendered as responsive web views (H5) within mobile browsers or WebViews. They are not native apps.

---

## Layout

### Page Structure (H5 WebView)
```
┌────────────────────────────┐
│  Status bar (safe area)     │
│  ┌──────────────────────┐  │
│  │  Header / Nav Bar     │  │
│  ├──────────────────────┤  │
│  │                      │  │
│  │  Scrollable Content   │  │
│  │                       │  │
│  │                       │  │
│  ├──────────────────────┤  │
│  │  Bottom Tab Bar       │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

### Key Dimensions
- **Viewport**: 375px–414px width (iOS / Android standard)
- **Header height**: 44px + safe area top
- **Tab bar height**: 50px + safe area bottom
- **Content**: fills remaining height, scrollable

### Safe Areas
```css
/* Use env(safe-area-inset-*) for WebView */
padding-top: env(safe-area-inset-top, 0px);
padding-bottom: env(safe-area-inset-bottom, 0px);
padding-left: env(safe-area-inset-left, 0px);
padding-right: env(safe-area-inset-right, 0px);
```

---

## Navigation

### Bottom Tab Bar
| Tab | Icon | Badge | Description |
|-----|------|-------|-------------|
| Agents | robot | Agent count | My agent list |
| Chat | message | Unread count | Conversations |
| Monitor | activity | Alert count | Live status |
| Profile | user | — | Account & settings |

### Top Navigation Bar
- Left: Back button (when applicable) or logo
- Center: Page title (truncated if long)
- Right: 0-2 action icons (max)

### Gestures
- Swipe back to navigate (iOS standard)
- Pull-to-refresh on list pages
- Tap top status bar to scroll to top

---

## Component Adaptations (Mobile)

### Cards
```css
.vib-card-mobile {
  padding: var(--vib-space-4);
  margin: var(--vib-space-3) var(--vib-space-4);
  border-radius: var(--vib-radius-lg);
  background: var(--vib-bg-elevated);
  box-shadow: var(--vib-shadow-sm);
}
```
- Full-width with horizontal margin
- No hover states (use tap/active states)
- Minimum tap target: 44x44px
- Stack vertically, no side-by-side cards on mobile

### Agent Cards
```
┌────────────────────────────────┐
│ ● Online    Agent: "DataBot"   │
│ Assistant • v2.1.0             │
│ ┌──────────────────────────┐   │
│ │ "Analyzing Q3 metrics..." │   │
│ └──────────────────────────┘   │
│ [Chat] [View] [⋮]              │
└────────────────────────────────┘
```

### Buttons
- Primary: Full-width preferred ("stretched")
- Secondary/ghost: Icon + compact label
- Floating Action Button (FAB): 56px, bottom-right above tab bar
- Bottom sheet for 3+ action options (avoid action sheets with long labels)

### Input Fields
- Auto-capitalize: off for agent names (they're often code-like)
- Always show label above (no placeholder-only)
- Minimum height: 44px
- Clear button always visible when text is entered
- Use `inputmode` attribute for keyboard types:
  - `numeric` for IDs/numbers
  - `url` for webhook URLs
  - `text` for names/descriptions

### Bottom Sheet
```css
.vib-bottom-sheet {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  border-radius: var(--vib-radius-xl) var(--vib-radius-xl) 0 0;
  background: var(--vib-bg-elevated);
  max-height: 85vh;
  transform: translateY(100%);
  transition: transform 0.3s var(--vib-ease-out);
}
.vib-bottom-sheet.open {
  transform: translateY(0);
}
```
- Drag handle: 32px wide, 4px tall pill at top
- Backdrop overlays the content below
- Dismiss on backdrop tap or drag down

### Pull-to-Refresh
- Trigger at -60px pull distance
- Agent-appropriate loading state: show "Syncing agents..." text
- Spinner in VIB brand color

### Empty States
```
┌────────────────────────┐
│                        │
│     🤖 (illustration)  │
│                        │
│  No agents yet         │
│  Create your first     │
│  AI agent to get       │
│  started.              │
│                        │
│  [Create Agent]        │
│                        │
└────────────────────────┘
```
- Always include icon/illustration + heading + description + CTA
- Never show raw "No data" or empty table

### Loading States
- Skeleton screens (not spinners) for list content
- 3-5 shimmer bars matching card dimensions
- Use `aria-busy="true"` on loading containers
- Full-page spinner only for initial app load

---

## Agent Chat Interface

### Message Bubbles
```css
.vib-msg-user {
  align-self: flex-end;
  background: var(--vib-brand-primary);
  color: white;
  border-radius: 18px 18px 4px 18px;
  max-width: 80%;
}
.vib-msg-agent {
  align-self: flex-start;
  background: var(--vib-bg-tertiary);
  color: var(--vib-text-primary);
  border-radius: 18px 18px 18px 4px;
  max-width: 80%;
}
```
- Avatar: 28x28px for agent messages
- Timestamp: subtle, below bubble (optional, show on tap)
- Typing indicator: 3 bouncing dots in brand color

### Input Bar
```
┌─────────────────────────────────┐
│ [🔍]  Type a message...  [📎] ▶ │
└─────────────────────────────────┘
```
- Fixed at bottom, above tab bar
- Auto-resize textarea (max 4 lines)
- Send button disabled when empty
- Attachment button opens bottom sheet with: Image, File, Agent Context

---

## Responsive Breakpoints

| Name | Width | Target |
|------|-------|--------|
| Mobile S | < 375px | Small phones |
| Mobile M | 375–424px | iPhone standard |
| Mobile L | 425–768px | Large phones / phablets |
| Tablet | 768–1024px | iPads (landscape = use tablet layout) |

- **Below 375px**: Reduce horizontal padding to 12px, text stays the same
- **Above 768px**: Show tablet split-pane layout (sidebar + content)

---

## Performance Guidelines

- Use `touch-action: manipulation` on interactive elements (eliminates 300ms delay)
- `will-change: transform` only for elements that animate continuously
- Lazy-load images below the fold
- Keep bundle under 200KB JS gzipped
- Use native scrolling (`-webkit-overflow-scrolling: touch` legacy, now default)
- Debounce scroll/resize handlers
- Avoid `position: fixed` when a virtual keyboard might appear (iOS bug)
