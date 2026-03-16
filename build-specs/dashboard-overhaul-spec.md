# Dashboard Overhaul + Activity Ticker — Build Spec

## Overview
Rework the dashboard to be more visual with an agent grid showing visual status, and add a persistent live activity ticker visible across all pages.

## Files to modify/create
1. **MODIFY** `/home/user/workspace/muse-hq/client/src/pages/dashboard.tsx` — overhaul the dashboard
2. **CREATE** `/home/user/workspace/muse-hq/client/src/components/activity-ticker.tsx` — persistent ticker component

## Part 1: Activity Ticker Component

### Design
A slim horizontal bar at the top of the main content area (above page content, below the top of the page). Shows a scrolling/cycling feed of recent agent actions.

- Height: 36px
- Background: `bg-card/80 backdrop-blur-sm border-b border-card-border`
- Contains a single line of text that auto-cycles through recent activity items
- Each item shows: agent avatar (tiny, 16px circle with color), agent codename, action text, and relative time
- Items fade in/out with a 4-second cycle
- Small "Activity" label on the left with a pulsing green dot

### Data
Fetch from `GET /api/recent-activity` → `RecentActivity[]`

### Implementation
- Export as `ActivityTicker` component
- Use `useState` + `useEffect` with `setInterval` to cycle through items
- Smooth CSS transition on opacity for fade effect

## Part 2: Dashboard Overhaul

### Current State
The dashboard currently has: greeting, priority cards, metrics row, recent activity list, product grid, and agent network strip. 

### New Layout
Keep the greeting and metrics. Rework the agent section to be much more visual.

#### Greeting Section (keep, improve slightly)
- Same greeting "Good {time}, Ben."
- Below: MUSE priority summary text

#### Metrics Row (keep as-is)
Four metric cards: Revenue, Active Products, Tasks Completed, Agent Utilization.

#### NEW: Visual Agent Grid (replaces the old agent strip)
Section title: "Agent Network" with Users icon

A 2x4 grid of agent cards (or 4x2 on wide screens). Each card is larger and more informative than the current tiny strip:

Each agent card:
- Size: fills grid cell, min-height ~120px
- Top: colored accent bar (3px, agent's color)
- Agent avatar: 32px circle with agent color + initials
- Status indicator: small dot (green=working pulse, blue=active, gray=idle)
- Codename: text-sm font-bold
- Current task: text-xs, truncated to 1 line
- Mini stats bar at bottom: "47 tasks completed" + tiny utilization bar (just a thin colored bar proportional to tasks completed)
- Entire card links to `/agents/{codename}`
- Working agents have a subtle glow: `box-shadow: 0 0 12px {agentColor}33`

#### Priority Cards (keep but slightly improve)
Make them a bit more prominent. Add the agent avatar next to the agent codename.

#### Recent Activity (keep as-is)
"Continue Where You Left Off" section stays the same.

#### Product Grid (keep, add department badge)
Each product card adds a subtle badge showing which department's agent is primarily working on it (the agent with the most tasks for that product).

### Skeleton
Keep the existing skeleton loading state.

## Important Technical Notes
- Types from `@shared/schema`
- `@tanstack/react-query` with `useQuery`
- `Link` from `wouter`
- lucide-react icons
- `data-testid` attributes everywhere
- DO NOT import React explicitly
- ActivityTicker will be integrated into the layout in App.tsx later (not in this spec)
