# VIB Admin Dashboard Style Guide

## Overview

The VIB Admin Dashboard is the primary interface for power users and administrators to configure, monitor, and manage AI agents across the organization. It is designed for desktop-first with responsive adaptation.

---

## Layout Architecture

```
┌────────────┬─────────────────────────────────────┐
│            │  Top Bar                             │
│  Sidebar   │  Breadcrumb | Search | Profile       │
│  (256px)   ├─────────────────────────────────────┤
│            │                                     │
│  Collapsed │  Main Content Area                  │
│  to 72px   │  (12-column grid)                   │
│  on hover  │                                     │
│            │  ┌────┐ ┌────┐ ┌────┐               │
│  Navigation│  │Stat│ │Stat│ │Stat│               │
│  - Agents  │  └────┘ └────┘ └────┘               │
│  - Monitor │  ┌──────────────────────┐           │
│  - Logs    │  │   Chart / Timeline   │           │
│  - Settings│  └──────────────────────┘           │
│  - Billing │  ┌────────┐ ┌──────────┐           │
│            │  │ List   │ │ Activity │           │
│            │  └────────┘ └──────────┘           │
└────────────┴─────────────────────────────────────┘
```

### Layout Tokens
| Element | Size | Token |
|---------|------|-------|
| Sidebar (expanded) | 256px | `--vib-sidebar-width` |
| Sidebar (collapsed) | 72px | `--vib-sidebar-collapsed` |
| Header height | 56px | `--vib-header-height` |
| Content padding | 24px | `--vib-dashboard-padding` |

### Layout Rules
- Sidebar is persistent on desktop (768px+), overlay on tablet
- Content area fills remaining width, max-width 1440px
- 12-column grid inside content area, 24px gap
- Content scrolls vertically, sidebar is sticky

---

## Sidebar Navigation

### Structure
```
LOGO (24px height)            [Collapse btn]
─────────────────────────────────────────
🔲  Overview                   Active state
🤖  Agents                     ▼
    ├── All Agents             Sub-nav
    ├── Agent Templates        Sub-nav
    └── Agent Marketplace    
📊  Monitor
    ├── Dashboard  
    ├── Logs
    └── Alerts
⚙️  Settings
    ├── General
    ├── API Keys
    └── Team
💳  Billing
📚  Documentation            External link icon
```

### States
```css
.vib-nav-item {
  /* Normal */
  color: var(--vib-text-secondary);
  padding: 8px 16px;
  border-radius: var(--vib-radius-md);

  /* Hover */
  background: var(--vib-bg-tertiary);

  /* Active / Current page */
  background: var(--vib-brand-primary-soft);
  color: var(--vib-brand-primary);
  font-weight: var(--vib-weight-semibold);

  /* Active indicator */
  border-left: 3px solid var(--vib-brand-primary);
}
```

### Collapsed Mode
- Icons only, 72px wide
- Tooltip on hover shows label
- Sub-navigation hidden until hover
- User can toggle via hamburger button

---

## Top Bar

### Elements
```
[☰]  Agents  /  All Agents    🔍  🔔(3)  👤  John D.
```
- Left: hamburger (toggle sidebar), breadcrumb
- Right: global search (CMD+K), notifications (bell with count), user avatar dropdown

### Notification Badge
```css
.vib-badge-dot {
  width: 8px; height: 8px;
  background: var(--vib-error-text);
  border-radius: 50%;
  position: absolute; top: -2px; right: -2px;
}
```

---

## Content Components

### Stat Cards
```css
.vib-stat-card {
  padding: 24px;
  background: var(--vib-bg-elevated);
  border-radius: var(--vib-radius-card);
  border: 1px solid var(--vib-border-light);
  box-shadow: var(--vib-shadow-xs);
}
```
```
┌──────────────────────┐
│ Active Agents        │ ← Label (text-secondary)
│ 12           +3  ↑   │ ← Value, Trend
│ Last 24 hours        │ ← Footnote
└──────────────────────┘
```

### Data Tables
```css
.vib-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.vib-table th {
  padding: 12px 16px;
  font-weight: var(--vib-weight-semibold);
  font-size: var(--vib-text-sm);
  color: var(--vib-text-secondary);
  text-align: left;
  border-bottom: 1px solid var(--vib-border-light);
}
.vib-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--vib-border-light);
}
.vib-table tr:hover {
  background: var(--vib-bg-secondary);
}
```
- Row height: 48-56px
- Zebra striping: optional, use on dense tables only
- Sortable columns: show arrow indicator on active column
- Empty cells: show "—" dash, never blank
- Actions column: always right-aligned, icon-only buttons

### Status Indicators
| Status | Color | Icon | Example |
|--------|-------|------|---------|
| Online | Green | ● | Agent is running |
| Offline | Gray | ○ | Agent is stopped |
| Error | Red | ● | Agent crashed |
| Pending | Amber | ◐ | Starting / deploying |
| Unknown | Gray | ? | No heartbeat |

```css
.vib-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--vib-text-sm);
}
.vib-status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
}
.vib-status-dot.online   { background: var(--vib-success); }
.vib-status-dot.offline  { background: var(--vib-text-tertiary); }
.vib-status-dot.error    { background: var(--vib-error); }
.vib-status-dot.pending  { background: var(--vib-warning); }
```

### Agent Detail Panel
```
┌──────────────────────────────────────┐
│ ← Back to Agents                     │
│                                      │
│ 🤖 DataBot           ● Online        │
│ v2.1.0 • Assistant • Created Mar 12  │
│                                      │
│ ┌── Tabs ──────────────────────────┐ │
│ │ Overview | Config | Logs | Metrics│ │
│ └──────────────────────────────────┘ │
│                                      │
│ Description:                         │
│ Data analysis agent for quarterly    │
│ reporting…                           │
│                                      │
│ Metrics:                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │99.8% │ │ 1.2s │ │4.5K  │ │ 0.2% ││
│ │Uptime│ │AvgResp│ │Tasks │ │FailRt││
│ └──────┘ └──────┘ └──────┘ └──────┘│
└──────────────────────────────────────┘
```
- Detail panel slides in from right (desktop) or pushes content (tablet)
- 480px wide on desktop, full-width on mobile
- Contains tabs for different views of the agent

### Filter Bar
```
┌──────────────────────────────────────────────┐
│ All Agents  ▼  |  Status: All  ▼  |  Sort: ▼ │
│ [Search agents by name or ID...]      [Grid]  │
│ Active filters: Data Analyst ×  Online ×     │
└──────────────────────────────────────────────┘
```
- Filter chips below the main filter bar
- Each chip is removable (× button)
- "Clear all" link when 3+ filters active
- URL-synced filters (shareable URLs)

---

## Charts & Data Visualization

### Chart Style
```css
/* Chart.js / ECharts overrides for VIB theme */
.vib-chart {
  font-family: var(--vib-font-en);
  grid-line-color: var(--vib-border-light);
  label-color: var(--vib-text-secondary);
  primary-line: var(--vib-brand-primary);
  secondary-line: var(--vib-brand-primary-muted);
}
```
- Line charts: 2px stroke, no fill by default, circle dots on hover
- Bar charts: rounded top corners (4px radius), brand primary color
- Area charts: 30% opacity fill
- Pie/donut: donut style preferred, center shows total
- Tooltip: dark background, white text, rounded corners

### Dashboard Widget Sizing
| Widget Type | Default Width | Default Height |
|-------------|---------------|----------------|
| Stat card | 1 col (1/12) | Auto (64px) |
| Line chart | 6-8 col | 320px |
| Table | 12 col | 400px |
| Activity feed | 4 col | 320px |
| Mini timeline | 6 col | 240px |

---

## Responsive Breakpoints (Dashboard)

| Breakpoint | Dashboard Behavior |
|------------|-------------------|
| > 1440px | Max-width constrained, centered |
| 1024–1440px | Fluid 12-col grid |
| 768–1024px | 6-col grid, sidebar collapsed |
| < 768px | 4-col grid, sidebar becomes overlay drawer, stacked layout |

---

## Empty / Loading / Error States

### Dashboard Loading
- Skeleton grids matching stat card dimensions
- Tables: show 5 shimmer rows
- Avoid full-page spinners

### Empty Dashboard
- "Welcome to VIB — create your first agent to get started"
- Quick start wizard card
- Template gallery

### Error State
- Inline error banners (not modals) for recoverable errors
- Retry button on failed widgets
- "Something went wrong" + error ID for debugging
- Never show raw stack traces to users
