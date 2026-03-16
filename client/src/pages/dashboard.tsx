import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Hash,
  Layers,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  Product,
  Agent,
  Task,
  MetricsData,
  BriefingData,
  RecentActivity,
} from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  priority_1: "PRIORITY 1",
  active_dev: "Active Dev",
  in_progress: "In Progress",
  early_stage: "Early Stage",
  concept: "Concept",
  long_term: "Long Term",
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

function getGreetingTime(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const ACTIVITY_ICONS: Record<string, typeof CheckCircle2> = {
  task_completed: CheckCircle2,
  agent_alert: AlertTriangle,
  message: MessageSquare,
  channel_post: Hash,
};

// ── Skeleton Components ─────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="px-6 py-8 space-y-8" data-testid="dashboard-skeleton">
      {/* Greeting */}
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-72" />
        <SkeletonBlock className="h-5 w-56" />
      </div>
      {/* Priority cards */}
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </div>
      {/* Activity */}
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
      </div>
      {/* Products */}
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function Dashboard() {
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });
  const { data: metrics, isLoading: loadingMetrics } = useQuery<MetricsData>({
    queryKey: ["/api/metrics"],
  });
  const { data: briefing, isLoading: loadingBriefing } = useQuery<BriefingData>(
    { queryKey: ["/api/briefing"] },
  );
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: recentActivity, isLoading: loadingActivity } = useQuery<
    RecentActivity[]
  >({ queryKey: ["/api/recent-activity"] });

  const isLoading =
    loadingProducts ||
    loadingAgents ||
    loadingMetrics ||
    loadingBriefing ||
    loadingActivity;

  if (isLoading) return <DashboardSkeleton />;

  const pendingTasksByProduct = (productId: string) =>
    (tasks ?? []).filter(
      (t) => t.productId === productId && t.status !== "completed",
    ).length;

  return (
    <div className="px-6 py-8 space-y-8" data-testid="dashboard">
      {/* ── Greeting ─────────────────────────────────────────── */}
      <div data-testid="greeting-section">
        <h1
          className="text-2xl font-semibold text-foreground"
          data-testid="greeting"
        >
          Good {getGreetingTime()}, Ben.
        </h1>
        {briefing && (
          <p
            className="text-sm text-muted-foreground mt-1"
            data-testid="priority-summary"
          >
            MUSE has identified {briefing.priorities.length} priorities for
            today.
          </p>
        )}
      </div>

      {/* ── Priority Cards ───────────────────────────────────── */}
      {briefing && (
        <div
          className="grid grid-cols-3 gap-3"
          data-testid="priority-cards"
        >
          {briefing.priorities.map((p) => (
            <Link href={`/products/${p.productSlug}`} key={p.rank}>
              <div
                className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer"
                data-testid={`priority-card-${p.rank}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                    #{p.rank}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.agentCodename}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {p.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Metrics Row ──────────────────────────────────────── */}
      {metrics && (
        <div
          className="grid grid-cols-4 gap-3"
          data-testid="metrics-row"
        >
          {[
            {
              label: "Total Revenue",
              value:
                metrics.totalRevenue === 0
                  ? "Pre-revenue"
                  : `$${metrics.totalRevenue.toLocaleString()}`,
              icon: DollarSign,
              testId: "metric-revenue",
            },
            {
              label: "Active Products",
              value: metrics.activeProducts,
              icon: Layers,
              testId: "metric-products",
            },
            {
              label: "Tasks Completed",
              value: metrics.tasksCompleted,
              icon: CheckCircle2,
              testId: "metric-tasks",
            },
            {
              label: "Agent Utilization",
              value: `${metrics.agentUtilization}%`,
              icon: TrendingUp,
              testId: "metric-utilization",
            },
          ].map(({ label, value, icon: Icon, testId }) => (
            <div
              key={testId}
              className="bg-card border border-card-border rounded-lg p-4"
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
      )}

      {/* ── Continue Where You Left Off ──────────────────────── */}
      {recentActivity && recentActivity.length > 0 && (
        <div data-testid="recent-activity-section">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Continue Where You Left Off
            </h2>
          </div>
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((item) => {
              const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
              return (
                <Link href={item.linkTo} key={item.id}>
                  <div
                    className="flex items-start gap-3 bg-card border border-card-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer"
                    data-testid={`recent-activity-${item.id}`}
                  >
                    {/* Agent avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: item.agentColor }}
                      data-testid={`activity-avatar-${item.agentCodename}`}
                    >
                      {item.agentCodename.slice(0, 2)}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon size={12} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.description}
                      </p>
                    </div>
                    {/* Timestamp */}
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-1">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Product Grid ─────────────────────────────────────── */}
      {products && (
        <div data-testid="product-grid-section">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Products
          </h2>
          <div
            className="grid grid-cols-3 gap-3"
            data-testid="product-grid"
          >
            {products.map((product) => {
              const isPriority = product.status === "priority_1";
              return (
                <Link href={`/products/${product.slug}`} key={product.id}>
                  <div
                    className={`bg-card border border-card-border rounded-lg p-4 hover:border-primary/20 transition-colors cursor-pointer ${
                      isPriority
                        ? "glow-priority ring-1 ring-emerald-500/20"
                        : ""
                    }`}
                    style={
                      {
                        borderLeftWidth: "3px",
                        borderLeftColor: product.accentColor,
                        "--glow-color": isPriority
                          ? `${product.accentColor}33`
                          : undefined,
                      } as React.CSSProperties
                    }
                    data-testid={`product-card-${product.slug}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {product.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isPriority
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                        data-testid={`product-status-${product.slug}`}
                      >
                        {STATUS_LABELS[product.status] ?? product.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                      <span data-testid={`product-tasks-${product.slug}`}>
                        {pendingTasksByProduct(product.id)} pending tasks
                      </span>
                      <span>{formatTimeAgo(product.lastActivity)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Agent Network Strip ──────────────────────────────── */}
      {agents && (
        <div data-testid="agent-network-section">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Agent Network
            </h2>
          </div>
          <div
            className="flex gap-4 overflow-x-auto pb-2"
            data-testid="agent-strip"
          >
            {agents.map((agent) => {
              const isWorking = agent.status === "working";
              return (
                <Link href={`/agents/${agent.codename}`} key={agent.id}>
                  <div
                    className="flex flex-col items-center gap-1.5 min-w-[80px] cursor-pointer group"
                    data-testid={`agent-node-${agent.codename}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform group-hover:scale-110 ${
                        isWorking ? "animate-agent-pulse" : ""
                      }`}
                      style={
                        {
                          backgroundColor: agent.color,
                          "--pulse-color": `${agent.color}66`,
                        } as React.CSSProperties
                      }
                    >
                      {agent.codename.slice(0, 2)}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">
                      {agent.codename}
                    </span>
                    <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-[80px] truncate">
                      {agent.currentTask}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
