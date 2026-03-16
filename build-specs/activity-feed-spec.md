# Activity Feed Page — Build Spec

## Overview
A full-page activity feed that expands on the ticker bar. Shows a real-time timeline of everything happening across the venture studio — every agent action, task update, channel post, and alert — filterable by agent, product, and type.

## File to create
`/home/user/workspace/muse-hq/client/src/pages/activity-feed.tsx`

## Data Sources
- `GET /api/recent-activity` → `RecentActivity[]` (already exists)
- `GET /api/agents` → `Agent[]` (for filter chips)
- `GET /api/products` → `Product[]` (for filter chips)
- `GET /api/tasks` → `Task[]` (for enriching context)

### RecentActivity type (from @shared/schema):
```ts
type RecentActivity = {
  id: string;
  type: string; // task_completed, agent_alert, message, channel_post
  title: string;
  description: string;
  agentCodename: string;
  agentColor: string;
  timestamp: string;
  linkTo: string;
  // NEW fields we'll add:
  productSlug?: string; // which product this relates to
  productName?: string;
  productColor?: string;
};
```

## Layout

### Page Header
- Title: "Activity Feed" with an Activity icon (lucide)
- Subtitle: "Real-time studio activity across all agents and products"
- Right side: auto-refresh indicator — pulsing green dot + "Live" text, with a refetch interval of 10 seconds on the query

### Filter Bar
A horizontal row of filter sections:
1. **Type filter** tabs: All, Tasks, Alerts, Messages, Channel Posts
   - Each type has an icon and count badge
   - "All" is default, highlighted in primary
2. **Agent filter** chips: horizontal scrollable row of agent avatar circles (small, 24px) — click to toggle filtering by that agent. Multiple agents can be selected. Active agents have a ring highlight.
3. **Product filter** chips: similar to kanban board — colored dots + product name. Click to filter.

### Timeline View
Vertical timeline layout with a thin line running down the left side:

Each activity entry is a card in the timeline:
```
  ●─── [Card]
  │
  ●─── [Card]  
  │
  ●─── [Card]
```

Each card:
- **Timeline dot**: 10px circle on the timeline line, colored by type:
  - task_completed: green (#10B981)
  - agent_alert: amber (#F59E0B) with pulse animation
  - message: blue (#3B82F6)
  - channel_post: purple (#8B5CF6)
- **Timestamp column**: left side, shows time (e.g., "10m ago") + exact time on hover via tooltip
- **Card body**: right side of the dot
  - Top row: Agent avatar (24px circle, agent color, white initials) + Agent codename (bold) + type badge (small colored pill)
  - Title: text-sm font-medium
  - Description: text-xs text-muted-foreground
  - Bottom row: product badge (if applicable, colored dot + product name) + link arrow icon
  - Entire card is clickable, navigates to linkTo

### Empty State
If filters result in no activities, show a centered message: "No activity matching filters" with a muted icon.

### Skeleton Loading
While data loads, show 6 skeleton timeline entries.

## Interaction: Ticker → Feed Link
The ActivityTicker component should be updated so clicking on the "Activity" label (left side) navigates to `/activity`. Use Link from wouter.

## Design
- Dark theme: bg-background page, bg-card for cards
- Timeline line: 2px wide, border-card-border color
- Cards: bg-card border border-card-border rounded-lg p-4
- Cards hover: hover:border-primary/20 transition-colors
- Generous spacing between timeline entries (gap-4 or space-y-4)
- Filter chips: same style as kanban board filters

## Technical Notes
- Import types from `@shared/schema`
- `@tanstack/react-query` with `useQuery`, refetchInterval: 10000 for live feel
- `Link` from `wouter` for navigation
- `Tooltip` from `@/components/ui/tooltip` for exact timestamps
- lucide-react icons: Activity, CheckCircle2, AlertTriangle, MessageSquare, Hash, Filter, ArrowRight, Clock
- data-testid on all elements
- DO NOT import React explicitly
- Page padding: px-6 py-8
