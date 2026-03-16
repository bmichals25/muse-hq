import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Circle,
  DollarSign,
  GitBranch,
  Loader2,
  MessageSquare,
  Package,
  Users,
} from "lucide-react";
import type { Product, Task, Agent } from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  priority_1: "PRIORITY 1",
  active_dev: "Active Dev",
  in_progress: "In Progress",
  early_stage: "Early Stage",
  concept: "Concept",
  long_term: "Long Term",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#3B82F6",
  low: "#6B7280",
};

const TASK_STATUS_ICON: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  blocked: Ban,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

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

// ── Types ───────────────────────────────────────────────────────────

type ProductDetail = Product & { tasks: Task[]; agents: Agent[] };

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function ProductSkeleton() {
  return (
    <div className="px-6 py-8 space-y-8" data-testid="product-skeleton">
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="h-10 w-64" />
      <SkeletonBlock className="h-4 w-96" />
      <div className="grid grid-cols-4 gap-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </div>
    </div>
  );
}

// ── Kanban Card ─────────────────────────────────────────────────────

function TaskCard({
  task,
  agents,
}: {
  task: Task;
  agents: Agent[];
}) {
  const StatusIcon = TASK_STATUS_ICON[task.status] ?? Circle;
  const agent = agents.find((a) => a.id === task.agentId);
  const isSpinning = task.status === "in_progress";

  return (
    <div
      className="bg-background/30 border border-white/5 rounded-lg p-3 space-y-2"
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start gap-2">
        <StatusIcon
          size={14}
          className={`shrink-0 mt-0.5 ${
            task.status === "completed"
              ? "text-emerald-400"
              : task.status === "blocked"
                ? "text-red-400"
                : "text-muted-foreground"
          } ${isSpinning ? "animate-spin" : ""}`}
        />
        <span className="text-sm font-medium text-foreground leading-tight">
          {task.title}
        </span>
      </div>

      <p className="text-xs text-muted-foreground/70 line-clamp-2">
        {task.description}
      </p>

      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${PRIORITY_COLORS[task.priority] ?? "#6B7280"}20`,
            color: PRIORITY_COLORS[task.priority] ?? "#6B7280",
          }}
          data-testid={`task-priority-${task.id}`}
        >
          {task.priority.toUpperCase()}
        </span>

        {agent && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: agent.color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {agent.codename}
            </span>
          </div>
        )}
      </div>

      <span className="text-[9px] text-muted-foreground/50">
        {formatDate(task.createdAt)}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function ProductView() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ["/api/products", slug],
  });

  if (isLoading || !product) return <ProductSkeleton />;

  const kanbanColumns = [
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "blocked", label: "Blocked" },
  ];

  const tasksByStatus = (status: string) =>
    product.tasks.filter((t) => t.status === status);

  // Find a matching channel name for this product
  const channelName = product.slug === "resumaid"
    ? "resumaid-launch"
    : product.slug === "trustedriders"
      ? "trustedriders"
      : "general";

  return (
    <div
      className="min-h-screen px-6 py-8 space-y-8"
      style={{ backgroundColor: product.bgColor }}
      data-testid="product-view"
    >
      {/* ── Back Link ──────────────────────────────────────── */}
      <Link href="/">
        <span
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          data-testid="back-to-dashboard"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </span>
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <div data-testid="product-header">
        <div className="flex items-center gap-3 mb-2">
          <h1
            className="text-3xl font-bold"
            style={{ color: product.accentColor, fontFamily: product.fontFamily }}
            data-testid="product-name"
          >
            {product.name}
          </h1>
          <span
            className={`text-[10px] font-semibold px-2 py-1 rounded ${
              product.status === "priority_1"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-white/10 text-muted-foreground"
            }`}
            data-testid="product-status"
          >
            {STATUS_LABELS[product.status] ?? product.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl" data-testid="product-description">
          {product.description}
        </p>
      </div>

      {/* ── Overview Row ───────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3" data-testid="overview-row">
        {[
          {
            label: "Revenue",
            value: product.revenue === 0 ? "Pre-revenue" : `$${product.revenue.toLocaleString()}`,
            icon: DollarSign,
            testId: "overview-revenue",
          },
          {
            label: "Repositories",
            value: product.repos.length,
            icon: GitBranch,
            testId: "overview-repos",
          },
          {
            label: "Total Tasks",
            value: product.tasks.length,
            icon: Package,
            testId: "overview-tasks",
          },
          {
            label: "Agents Assigned",
            value: product.agents.length,
            icon: Users,
            testId: "overview-agents",
          },
        ].map(({ label, value, icon: Icon, testId }) => (
          <div
            key={testId}
            className="bg-background/30 border border-white/5 rounded-lg p-4"
            data-testid={testId}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon size={14} className="text-muted-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Kanban Board ───────────────────────────────────── */}
      <div data-testid="kanban-board">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Task Board
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {kanbanColumns.map(({ key, label }) => {
            const tasks = tasksByStatus(key);
            return (
              <div
                key={key}
                className="bg-background/20 border border-white/5 rounded-lg p-3"
                data-testid={`kanban-col-${key}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agents={product.agents}
                    />
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground/30 text-center py-4">
                      No tasks
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Assigned Agents ────────────────────────────────── */}
      <div data-testid="assigned-agents-section">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Assigned Agents
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {product.agents.map((agent) => {
            const agentTasks = product.tasks.filter(
              (t) => t.agentId === agent.id,
            );
            const activeTask = agentTasks.find(
              (t) => t.status === "in_progress",
            );
            return (
              <Link href={`/agents/${agent.codename}`} key={agent.id}>
                <div
                  className="bg-background/30 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors cursor-pointer"
                  data-testid={`assigned-agent-${agent.codename}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.codename.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground block">
                        {agent.codename}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {agent.role.split("—")[0].trim()}
                      </span>
                    </div>
                  </div>
                  {activeTask && (
                    <p className="text-xs text-muted-foreground/70 truncate mb-1">
                      Working on: {activeTask.title}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground/50">
                    {agentTasks.length} task{agentTasks.length !== 1 ? "s" : ""} on this product
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Message Team Button ────────────────────────────── */}
      <Link href="/channels">
        <button
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: product.accentColor,
            color: "#fff",
          }}
          data-testid="message-team-btn"
        >
          <MessageSquare size={16} />
          Message in #{channelName}
        </button>
      </Link>

      {/* ── Repositories ───────────────────────────────────── */}
      <div data-testid="repos-section">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Repositories
        </h2>
        <div className="space-y-2">
          {product.repos.map((repo) => (
            <div
              key={repo}
              className="flex items-center gap-3 bg-background/30 border border-white/5 rounded-lg px-4 py-3"
              data-testid={`repo-${repo}`}
            >
              <GitBranch size={14} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{repo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
