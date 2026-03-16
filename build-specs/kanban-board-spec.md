# Kanban Board Page — Build Spec

## Overview
Full-featured kanban board showing ALL tasks across ALL products. Supports department filtering, project filtering, clickable task cards that open a detail sheet/panel.

## File to create
`/home/user/workspace/muse-hq/client/src/pages/kanban-board.tsx`

## Data
- Fetch tasks from `GET /api/tasks` → returns `Task[]`
- Fetch agents from `GET /api/agents` → returns `Agent[]`
- Fetch products from `GET /api/products` → returns `Product[]`
- Use `apiRequest` from `@/lib/queryClient` for any mutations
- Task status can be updated via `PATCH /api/tasks/:id/status` with `{ status: string }`

## Types (from @shared/schema)
```ts
type Task = {
  id: string;
  productId: string;
  agentId: string;
  title: string;
  description: string;
  status: string; // pending, in_progress, completed, blocked
  priority: string; // critical, high, medium, low
  createdAt: string;
};

type Agent = {
  id: string;
  codename: string;
  name: string;
  department: string;
  role: string;
  status: string;
  color: string;
  currentTask: string;
  tasksCompleted: number;
  lastActive: string;
  avatarUrl: string | null;
  systemPrompt: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  accentColor: string;
  bgColor: string;
  fontFamily: string;
  revenue: number;
  repos: string[];
  lastActivity: string;
};
```

## Departments (from agent data)
- Command (MUSE)
- R&D Intelligence (SCOUT)
- Product Engineering (FORGE)
- Marketing & Growth (HERALD)
- Finance & Revenue (VAULT)
- Operations (NEXUS)
- Performance Monitoring (SENTINEL)
- Reliability (PHOENIX)

## Product IDs
- p-1: Resumaid
- p-2: MuseRoom Studio
- p-3: TrustedRiders
- p-4: Stream
- p-5: Pomerance
- p-6: SEVEN

## Layout & Design

### Header
- Title: "Board" with a KanbanSquare icon
- Filter bar below title with two rows of filter chips:
  - **View**: "All Projects" (default), then one chip per product (Resumaid, MuseRoom, etc.)
  - **Department**: "All Departments" (default), then department chips
- Active filters have `bg-primary/20 text-primary border-primary/30`
- Inactive filters have `bg-card border-card-border text-muted-foreground hover:border-primary/20`

### Kanban Columns
Four columns side by side, each with a colored header dot:
1. **Blocked** — red dot (#EF4444), show blocked tasks
2. **Pending** — amber dot (#F59E0B), show pending tasks
3. **In Progress** — blue dot (#3B82F6), show in_progress tasks
4. **Completed** — green dot (#10B981), show completed tasks

Each column:
- Header shows column name + task count badge
- Scrollable list of task cards
- Columns take equal width in a 4-col grid

### Task Cards
Each card shows:
- **Priority indicator**: left border color based on priority
  - critical: red (#EF4444)
  - high: amber (#F59E0B)
  - medium: blue (#3B82F6)
  - low: gray (#6B7280)
- **Title**: text-sm font-medium, truncated to 2 lines
- **Product badge**: small colored badge showing product name with product's accent color
- **Agent badge**: small avatar circle with agent's color + codename
- **Time**: relative time since creation

Cards are clickable — clicking opens a slide-out detail panel.

### Task Detail Panel (Sheet/Drawer from right)
Use shadcn Sheet component. Shows:
- Task title (large)
- Status badge (can be changed via dropdown)
- Priority badge
- Full description
- Product name with accent color dot
- Assigned agent with avatar and codename
- Created time
- Action buttons: Change status dropdown (pending/in_progress/completed/blocked)

When status is changed, call `PATCH /api/tasks/:id/status` with the new status, then invalidate `/api/tasks` query.

## Styling
- Dark theme: `bg-background` for page, `bg-card` for columns and cards
- Border: `border-card-border`
- Cards have subtle hover: `hover:border-primary/20 transition-colors`
- Use `overflow-y-auto` on column bodies with a reasonable max height
- Page has padding: `px-6 py-8`

## Skeleton Loading
While data is loading, show a skeleton: 4 columns of 3 skeleton cards each.

## Important Technical Notes
- Import types from `@shared/schema`
- Use `@tanstack/react-query` with `useQuery`
- Use `apiRequest` from `@/lib/queryClient` for mutations
- Import `queryClient` from `@/lib/queryClient` for cache invalidation
- Use `Sheet, SheetContent, SheetHeader, SheetTitle` from `@/components/ui/sheet`
- Use lucide-react icons
- Add `data-testid` attributes to all interactive and display elements
- DO NOT import React explicitly
- Use hash-based routing (wouter with useHashLocation is set up globally)
