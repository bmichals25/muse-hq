# Org Map Page — Build Spec

## Overview
Visual agent hierarchy/org chart showing all 8 agents in a structured layout with real-time status indicators, department grouping, and links to agent pages. Pure CSS/HTML layout (no React Flow dependency).

## File to create
`/home/user/workspace/muse-hq/client/src/pages/org-map.tsx`

## Data
- Fetch agents from `GET /api/agents` → returns `Agent[]`
- Agent type defined in `@shared/schema`

## Layout

### Page Header
- Title: "Organization Map" with a Network icon from lucide-react
- Subtitle: "Agent hierarchy & real-time status"

### Org Chart Structure
Visual tree layout using CSS Grid/Flexbox:

```
                    ┌─────────┐
                    │  MUSE   │  (Command)
                    └────┬────┘
          ┌──────────┬───┴───┬──────────┐
     ┌────┴───┐ ┌────┴───┐ ┌─┴──────┐ ┌─┴──────┐
     │ SCOUT  │ │ FORGE  │ │ HERALD │ │ VAULT  │
     └────────┘ └────────┘ └────────┘ └────────┘
               (Core Operations)
          ┌──────────┬───────────┐
     ┌────┴───┐ ┌────┴────┐ ┌───┴────┐
     │ NEXUS  │ │SENTINEL │ │PHOENIX │
     └────────┘ └─────────┘ └────────┘
               (Support Layer)
```

### Agent Node Cards
Each agent is rendered as a card node:
- Background: `bg-card border border-card-border`
- Top accent stripe: 3px bar in the agent's color
- Agent avatar circle: 40px with agent color background, white initials (first 2 chars of codename)
- Status indicator dot: 8px circle overlaid on avatar
  - working: green (#10B981), with pulse animation
  - active: blue (#3B82F6)
  - idle: gray (#6B7280)
- Codename: text-sm font-bold
- Department: text-xs text-muted-foreground
- Current task: text-xs text-muted-foreground/60, truncated
- Tasks completed: small badge "47 tasks"
- Entire card is a Link to `/agents/{codename}`

### Connecting Lines
Use CSS pseudo-elements or SVG to draw thin connection lines between hierarchy levels:
- Vertical lines from MUSE down
- Horizontal line connecting the children
- Color: `border-card-border` or `text-muted-foreground/20`
- Line width: 1px

### Layer Labels
- "Command" label above MUSE
- "Core Operations" label above the middle row
- "Support Layer" label above the bottom row
- Labels: text-xs font-semibold uppercase tracking-wider text-muted-foreground/40

## Styling
- Dark theme: `bg-background` for page
- Cards have hover: `hover:border-primary/30 hover:shadow-lg transition-all`
- Responsive: on smaller screens, cards can stack vertically
- Page padding: `px-6 py-8`
- Use `animate-agent-pulse` CSS class (already exists in index.css) for working agents

## Skeleton Loading
While data loads, show skeleton card placeholders in the tree layout.

## Important Technical Notes
- Import types from `@shared/schema`
- Use `@tanstack/react-query` with `useQuery`
- Use `Link` from `wouter` for navigation
- Use lucide-react icons (Network, Activity, CheckCircle2, Circle)
- Add `data-testid` attributes
- DO NOT import React explicitly
- DO NOT use any external graph library — pure CSS layout
