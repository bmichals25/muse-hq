import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageSquare,
  Send,
  Package,
  Users,
} from "lucide-react";
import type { Agent, AgentMessage, Product, Task } from "@shared/schema";

// ── Types ───────────────────────────────────────────────────────────

type AgentDetail = Agent & { tasks: Task[]; messages: AgentMessage[] };

// ── Helpers ─────────────────────────────────────────────────────────

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const MESSAGE_TYPE_ICON: Record<string, typeof Send> = {
  task: Send,
  alert: AlertTriangle,
  report: FileText,
  request: MessageSquare,
};

const MESSAGE_TYPE_COLOR: Record<string, string> = {
  task: "#3B82F6",
  alert: "#F59E0B",
  report: "#10B981",
  request: "#A78BFA",
};

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

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function AgentSkeleton() {
  return (
    <div className="px-6 py-8 space-y-8" data-testid="agent-skeleton">
      <SkeletonBlock className="h-4 w-40" />
      <div className="flex items-center gap-4">
        <SkeletonBlock className="w-14 h-14 rounded-xl" />
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
      </div>
      <SkeletonBlock className="h-24" />
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function AgentPanel() {
  const params = useParams<{ codename: string }>();
  const codename = params.codename ?? "";

  const { data: agent, isLoading: loadingAgent } = useQuery<AgentDetail>({
    queryKey: ["/api/agents", codename],
  });

  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (loadingAgent || loadingAgents || !agent || !agents)
    return <AgentSkeleton />;

  const completedTasks = agent.tasks.filter((t) => t.status === "completed");
  const activeTasks = agent.tasks.filter((t) => t.status === "in_progress");
  const currentTask = activeTasks[0];

  // Find products this agent is working on
  const productIds = Array.from(new Set(agent.tasks.map((t) => t.productId)));
  const agentProducts = (products ?? []).filter((p) =>
    productIds.includes(p.id),
  );

  // Other agents
  const otherAgents = agents.filter((a) => a.id !== agent.id);

  // Progress percentage for current task (simulated based on status)
  const progressPercent = currentTask ? 65 : 0;

  return (
    <div className="px-6 py-8 space-y-8" data-testid="agent-panel">
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

      {/* ── Agent Header ──────────────────────────────────── */}
      <div className="flex items-center gap-4" data-testid="agent-header">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ backgroundColor: agent.color }}
          data-testid="agent-avatar"
        >
          {agent.codename.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="text-2xl font-bold"
              style={{ color: agent.color }}
              data-testid="agent-codename"
            >
              {agent.codename}
            </h1>
            <span
              className={`text-[10px] font-semibold px-2 py-1 rounded ${
                agent.status === "working"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : agent.status === "active"
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-muted text-muted-foreground"
              }`}
              data-testid="agent-status"
            >
              {agent.status}
            </span>
          </div>
          <p
            className="text-sm text-muted-foreground"
            data-testid="agent-name-dept"
          >
            {agent.name} · {agent.department}
          </p>
          <p
            className="text-xs text-muted-foreground/70 mt-0.5"
            data-testid="agent-role"
          >
            {agent.role}
          </p>
        </div>
      </div>

      {/* ── Current Task Card ─────────────────────────────── */}
      {currentTask ? (
        <div
          className="bg-card border border-card-border rounded-lg p-4"
          style={{ borderLeftWidth: "3px", borderLeftColor: agent.color }}
          data-testid="current-task-card"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Currently Working On
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${PRIORITY_COLORS[currentTask.priority] ?? "#6B7280"}20`,
                color: PRIORITY_COLORS[currentTask.priority] ?? "#6B7280",
              }}
              data-testid="current-task-priority"
            >
              {currentTask.priority.toUpperCase()}
            </span>
          </div>
          <h3
            className="text-sm font-semibold text-foreground mb-1"
            data-testid="current-task-title"
          >
            {currentTask.title}
          </h3>
          <p className="text-xs text-muted-foreground/70 mb-3">
            {currentTask.description}
          </p>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: agent.color,
                }}
                data-testid="current-task-progress"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {progressPercent}%
            </span>
          </div>
        </div>
      ) : (
        <div
          className="bg-card border border-card-border rounded-lg p-4 text-center"
          data-testid="no-current-task"
        >
          <p className="text-sm text-muted-foreground">
            No active task right now
          </p>
        </div>
      )}

      {/* ── Performance Metrics ───────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-3"
        data-testid="performance-metrics"
      >
        {[
          {
            label: "Tasks Completed",
            value: agent.tasksCompleted,
            icon: CheckCircle2,
            testId: "metric-completed",
          },
          {
            label: "Active Tasks",
            value: activeTasks.length,
            icon: Package,
            testId: "metric-active",
          },
          {
            label: "Total Assigned",
            value: agent.tasks.length,
            icon: Users,
            testId: "metric-total",
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

      {/* ── Task History + Communications ─────────────────── */}
      <div className="grid grid-cols-2 gap-3" data-testid="history-comms">
        {/* Task History */}
        <div data-testid="task-history-section">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Task History
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {agent.tasks.map((task) => (
              <div
                key={task.id}
                className="bg-card border border-card-border rounded-lg p-3"
                data-testid={`task-history-${task.id}`}
              >
                <div className="flex items-start gap-2">
                  {task.status === "completed" ? (
                    <CheckCircle2
                      size={14}
                      className="text-emerald-400 shrink-0 mt-0.5"
                    />
                  ) : task.status === "in_progress" ? (
                    <Package
                      size={14}
                      className="text-blue-400 shrink-0 mt-0.5"
                    />
                  ) : (
                    <Package
                      size={14}
                      className="text-muted-foreground shrink-0 mt-0.5"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground block truncate">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${PRIORITY_COLORS[task.priority] ?? "#6B7280"}20`,
                          color:
                            PRIORITY_COLORS[task.priority] ?? "#6B7280",
                        }}
                      >
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {agent.tasks.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-4">
                No tasks yet
              </p>
            )}
          </div>
        </div>

        {/* Communications */}
        <div data-testid="communications-section">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Communications
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {agent.messages.map((msg) => {
              const MsgIcon =
                MESSAGE_TYPE_ICON[msg.messageType] ?? MessageSquare;
              const msgColor =
                MESSAGE_TYPE_COLOR[msg.messageType] ?? "#6B7280";
              const fromAgent = agents.find((a) => a.id === msg.fromAgentId);
              const toAgent = agents.find((a) => a.id === msg.toAgentId);
              const isSent = msg.fromAgentId === agent.id;

              return (
                <div
                  key={msg.id}
                  className="bg-card border border-card-border rounded-lg p-3"
                  data-testid={`comm-${msg.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MsgIcon
                      size={12}
                      style={{ color: msgColor }}
                      className="shrink-0"
                    />
                    <span
                      className="text-[10px] font-bold uppercase"
                      style={{ color: msgColor }}
                    >
                      {msg.messageType}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50 ml-auto">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-1">
                    {msg.content}
                  </p>
                  <span className="text-[10px] text-muted-foreground/50">
                    {isSent
                      ? `→ ${toAgent?.codename ?? msg.toAgentId}`
                      : `← ${fromAgent?.codename ?? msg.fromAgentId}`}
                  </span>
                </div>
              );
            })}
            {agent.messages.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-4">
                No messages
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Message Button ────────────────────────────────── */}
      <Link href={`/chat/${agent.id}`}>
        <button
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{ backgroundColor: agent.color, color: "#fff" }}
          data-testid="message-agent-btn"
        >
          <MessageSquare size={16} />
          Message {agent.codename}
        </button>
      </Link>

      {/* ── Working On (Products) ─────────────────────────── */}
      {agentProducts.length > 0 && (
        <div data-testid="working-on-section">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Working On
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {agentProducts.map((product) => {
              const productTasks = agent.tasks.filter(
                (t) => t.productId === product.id,
              );
              return (
                <Link href={`/products/${product.slug}`} key={product.id}>
                  <div
                    className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/20 transition-colors cursor-pointer"
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor: product.accentColor,
                    }}
                    data-testid={`working-on-${product.slug}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        {product.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          product.status === "priority_1"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABELS[product.status] ?? product.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {productTasks.length} task
                      {productTasks.length !== 1 ? "s" : ""} assigned
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Other Agents Strip ────────────────────────────── */}
      <div data-testid="other-agents-section">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Other Agents
        </h2>
        <div
          className="flex gap-4 overflow-x-auto pb-2"
          data-testid="other-agents-strip"
        >
          {otherAgents.map((a) => (
            <Link href={`/agents/${a.codename}`} key={a.id}>
              <div
                className="flex flex-col items-center gap-1.5 min-w-[80px] cursor-pointer group"
                data-testid={`other-agent-${a.codename}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform group-hover:scale-110 ${
                    a.status === "working" ? "animate-agent-pulse" : ""
                  }`}
                  style={
                    {
                      backgroundColor: a.color,
                      "--pulse-color": `${a.color}66`,
                    } as React.CSSProperties
                  }
                >
                  {a.codename.slice(0, 2)}
                </div>
                <span className="text-[10px] font-semibold text-foreground">
                  {a.codename}
                </span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-[80px] truncate">
                  {a.currentTask}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
