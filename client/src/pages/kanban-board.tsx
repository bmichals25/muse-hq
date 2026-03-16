import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { KanbanSquare, Clock, User, Package } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, Agent, Product } from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "blocked", label: "Blocked", dot: "#EF4444" },
  { key: "pending", label: "Pending", dot: "#F59E0B" },
  { key: "in_progress", label: "In Progress", dot: "#3B82F6" },
  { key: "completed", label: "Completed", dot: "#10B981" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const ALL_STATUSES: ColumnKey[] = ["blocked", "pending", "in_progress", "completed"];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#3B82F6",
  low: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  blocked: "Blocked",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-card border border-card-border rounded-lg p-3 space-y-2">
      <div className="skeleton-shimmer h-4 w-3/4 rounded" />
      <div className="skeleton-shimmer h-3 w-1/2 rounded" />
      <div className="flex gap-2">
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="px-6 py-8" data-testid="kanban-skeleton">
      <div className="skeleton-shimmer h-8 w-40 rounded mb-6" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((col) => (
          <div key={col} className="space-y-3">
            <div className="skeleton-shimmer h-6 w-32 rounded" />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Filter Chip ─────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
  testId,
  accentColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
  accentColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-primary/20 text-primary border-primary/30"
          : "bg-card border-card-border text-muted-foreground hover:border-primary/20"
      }`}
      data-testid={testId}
    >
      {accentColor && (
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {label}
    </button>
  );
}

// ── Task Card ───────────────────────────────────────────────────────

function TaskCard({
  task,
  agent,
  product,
  onClick,
}: {
  task: Task;
  agent: Agent | undefined;
  product: Product | undefined;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-card-border rounded-lg p-3 hover:border-primary/20 transition-colors cursor-pointer"
      style={{ borderLeftWidth: "3px", borderLeftColor: PRIORITY_COLORS[task.priority] ?? "#6B7280" }}
      data-testid={`task-card-${task.id}`}
    >
      <p
        className="text-sm font-medium text-foreground line-clamp-2 mb-2"
        data-testid={`task-title-${task.id}`}
      >
        {task.title}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Product badge */}
        {product && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `${product.accentColor}20`,
              color: product.accentColor,
            }}
            data-testid={`task-product-${task.id}`}
          >
            {product.name}
          </span>
        )}

        {/* Agent badge */}
        {agent && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
            data-testid={`task-agent-${task.id}`}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: agent.color }}
            >
              {agent.codename.slice(0, 2)}
            </span>
            {agent.codename}
          </span>
        )}
      </div>

      {/* Time */}
      <div
        className="text-[10px] text-muted-foreground/60 mt-2"
        data-testid={`task-time-${task.id}`}
      >
        {formatTimeAgo(task.createdAt)}
      </div>
    </button>
  );
}

// ── Task Detail Panel ───────────────────────────────────────────────

function TaskDetailPanel({
  task,
  agent,
  product,
  onStatusChange,
  isUpdating,
}: {
  task: Task;
  agent: Agent | undefined;
  product: Product | undefined;
  onStatusChange: (status: string) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="space-y-6" data-testid="task-detail-panel">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{
            backgroundColor: `${COLUMNS.find((c) => c.key === task.status)?.dot ?? "#6B7280"}20`,
            color: COLUMNS.find((c) => c.key === task.status)?.dot ?? "#6B7280",
          }}
          data-testid="task-detail-status"
        >
          {STATUS_LABELS[task.status] ?? task.status}
        </span>

        <span
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{
            backgroundColor: `${PRIORITY_COLORS[task.priority] ?? "#6B7280"}20`,
            color: PRIORITY_COLORS[task.priority] ?? "#6B7280",
          }}
          data-testid="task-detail-priority"
        >
          {task.priority}
        </span>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Description
        </h4>
        <p
          className="text-sm text-foreground leading-relaxed"
          data-testid="task-detail-description"
        >
          {task.description}
        </p>
      </div>

      {/* Product */}
      {product && (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: product.accentColor }}
          />
          <span className="text-sm text-foreground" data-testid="task-detail-product">
            {product.name}
          </span>
        </div>
      )}

      {/* Assigned agent */}
      {agent && (
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: agent.color }}
          >
            {agent.codename.slice(0, 2)}
          </span>
          <div>
            <span className="text-sm text-foreground" data-testid="task-detail-agent">
              {agent.codename}
            </span>
            <span className="text-xs text-muted-foreground ml-2">{agent.department}</span>
          </div>
        </div>
      )}

      {/* Created */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock size={14} />
        <span data-testid="task-detail-created">{formatTimeAgo(task.createdAt)}</span>
      </div>

      {/* Change status */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Change Status
        </h4>
        <div className="flex flex-wrap gap-2" data-testid="task-detail-status-actions">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              disabled={s === task.status || isUpdating}
              onClick={() => onStatusChange(s)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                s === task.status
                  ? "bg-primary/20 text-primary border-primary/30 cursor-default"
                  : "bg-card border-card-border text-muted-foreground hover:border-primary/20 disabled:opacity-50"
              }`}
              data-testid={`task-status-btn-${s}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function KanbanBoard() {
  const { data: tasks, isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  // Lookup maps
  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    (agents ?? []).forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Unique departments from agents
  const departments = useMemo(() => {
    const depts = new Set<string>();
    (agents ?? []).forEach((a) => depts.add(a.department));
    return Array.from(depts).sort();
  }, [agents]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = tasks ?? [];

    if (selectedProduct !== "all") {
      result = result.filter((t) => t.productId === selectedProduct);
    }

    if (selectedDepartment !== "all") {
      result = result.filter((t) => {
        const agent = agentMap.get(t.agentId);
        return agent?.department === selectedDepartment;
      });
    }

    return result;
  }, [tasks, selectedProduct, selectedDepartment, agentMap]);

  // Group by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<ColumnKey, Task[]> = {
      blocked: [],
      pending: [],
      in_progress: [],
      completed: [],
    };
    filteredTasks.forEach((t) => {
      const key = t.status as ColumnKey;
      if (grouped[key]) {
        grouped[key].push(t);
      }
    });
    return grouped;
  }, [filteredTasks]);

  const isLoading = loadingTasks || loadingAgents || loadingProducts;

  if (isLoading) return <KanbanSkeleton />;

  const handleStatusChange = (status: string) => {
    if (!selectedTask) return;
    statusMutation.mutate(
      { taskId: selectedTask.id, status },
      {
        onSuccess: () => {
          // Update the selected task in local state so the panel reflects the change
          setSelectedTask({ ...selectedTask, status });
        },
      },
    );
  };

  return (
    <div className="px-6 py-8" data-testid="kanban-board">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <KanbanSquare size={20} className="text-primary" />
          <h1
            className="text-2xl font-semibold text-foreground"
            data-testid="kanban-title"
          >
            Board
          </h1>
        </div>

        {/* Filter: Projects */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap" data-testid="filter-projects">
            <FilterChip
              label="All Projects"
              active={selectedProduct === "all"}
              onClick={() => setSelectedProduct("all")}
              testId="filter-product-all"
            />
            {(products ?? []).map((p) => (
              <FilterChip
                key={p.id}
                label={p.name}
                active={selectedProduct === p.id}
                onClick={() => setSelectedProduct(p.id)}
                testId={`filter-product-${p.slug}`}
                accentColor={p.accentColor}
              />
            ))}
          </div>

          {/* Filter: Departments */}
          <div className="flex items-center gap-2 flex-wrap" data-testid="filter-departments">
            <FilterChip
              label="All Departments"
              active={selectedDepartment === "all"}
              onClick={() => setSelectedDepartment("all")}
              testId="filter-dept-all"
            />
            {departments.map((dept) => (
              <FilterChip
                key={dept}
                label={dept}
                active={selectedDepartment === dept}
                onClick={() => setSelectedDepartment(dept)}
                testId={`filter-dept-${dept.toLowerCase().replace(/\s+/g, "-")}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanban Columns ─────────────────────────────────── */}
      <div
        className="grid grid-cols-4 gap-4"
        data-testid="kanban-columns"
      >
        {COLUMNS.map(({ key, label, dot }) => {
          const columnTasks = tasksByStatus[key];
          return (
            <div key={key} data-testid={`kanban-column-${key}`}>
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: dot }}
                />
                <h2 className="text-sm font-semibold text-foreground">
                  {label}
                </h2>
                <span
                  className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
                  data-testid={`kanban-count-${key}`}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Task list */}
              <div
                className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1"
                data-testid={`kanban-tasks-${key}`}
              >
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    agent={agentMap.get(task.agentId)}
                    product={productMap.get(task.productId)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-xs text-muted-foreground/40 text-center py-8">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task Detail Sheet ──────────────────────────────── */}
      <Sheet
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <SheetContent
          side="right"
          className="bg-background border-card-border overflow-y-auto"
          data-testid="task-detail-sheet"
        >
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle data-testid="task-detail-title">
                  {selectedTask.title}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Task details for {selectedTask.title}
                </SheetDescription>
              </SheetHeader>

              <TaskDetailPanel
                task={selectedTask}
                agent={agentMap.get(selectedTask.agentId)}
                product={productMap.get(selectedTask.productId)}
                onStatusChange={handleStatusChange}
                isUpdating={statusMutation.isPending}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
