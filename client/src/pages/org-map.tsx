import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Network, CheckCircle2 } from "lucide-react";
import type { Agent } from "@shared/schema";

// ── Hierarchy definition ────────────────────────────────────────────

const HIERARCHY: { label: string; codenames: string[] }[] = [
  { label: "Command", codenames: ["MUSE"] },
  { label: "Core Operations", codenames: ["SCOUT", "FORGE", "HERALD", "VAULT"] },
  { label: "Support Layer", codenames: ["NEXUS", "SENTINEL", "PHOENIX"] },
];

// ── Status helpers ──────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === "working") return "#10B981";
  if (status === "active") return "#3B82F6";
  return "#6B7280";
}

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="w-[160px] bg-card border border-card-border rounded-lg overflow-hidden">
      <div className="h-[3px] skeleton-shimmer" />
      <div className="p-3 flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full skeleton-shimmer" />
        <div className="h-4 w-16 skeleton-shimmer rounded" />
        <div className="h-3 w-20 skeleton-shimmer rounded" />
        <div className="h-3 w-24 skeleton-shimmer rounded" />
      </div>
    </div>
  );
}

function OrgMapSkeleton() {
  return (
    <div className="px-6 py-8 space-y-10" data-testid="org-map-skeleton">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-64 skeleton-shimmer rounded" />
        <div className="h-5 w-48 skeleton-shimmer rounded" />
      </div>
      {/* Command */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-3 w-20 skeleton-shimmer rounded" />
        <SkeletonCard />
      </div>
      {/* Core */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-3 w-28 skeleton-shimmer rounded" />
        <div className="flex gap-4 justify-center flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
      {/* Support */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-3 w-24 skeleton-shimmer rounded" />
        <div className="flex gap-4 justify-center flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ──────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const isWorking = agent.status === "working";

  return (
    <Link href={`/agents/${agent.codename}`}>
      <div
        className="w-[160px] bg-card border border-card-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
        data-testid={`org-card-${agent.codename}`}
      >
        {/* Accent bar */}
        <div className="h-[3px]" style={{ backgroundColor: agent.color }} />

        <div className="p-3 flex flex-col items-center gap-1.5">
          {/* Avatar with status dot */}
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                isWorking ? "animate-agent-pulse" : ""
              }`}
              style={
                {
                  backgroundColor: agent.color,
                  "--pulse-color": `${agent.color}66`,
                } as React.CSSProperties
              }
              data-testid={`org-avatar-${agent.codename}`}
            >
              {agent.codename.slice(0, 2)}
            </div>
            {/* Status dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${
                isWorking ? "animate-agent-pulse" : ""
              }`}
              style={
                {
                  backgroundColor: statusColor(agent.status),
                  "--pulse-color": isWorking ? "#10B98166" : undefined,
                } as React.CSSProperties
              }
              data-testid={`org-status-${agent.codename}`}
            />
          </div>

          {/* Codename */}
          <span
            className="text-sm font-bold text-foreground"
            data-testid={`org-codename-${agent.codename}`}
          >
            {agent.codename}
          </span>

          {/* Department */}
          <span className="text-xs text-muted-foreground">
            {agent.department}
          </span>

          {/* Current task */}
          <span
            className="text-xs text-muted-foreground/60 truncate max-w-full text-center"
            title={agent.currentTask}
            data-testid={`org-task-${agent.codename}`}
          >
            {agent.currentTask}
          </span>

          {/* Tasks completed badge */}
          <span
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            data-testid={`org-tasks-completed-${agent.codename}`}
          >
            <CheckCircle2 size={10} />
            {agent.tasksCompleted} tasks
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Connecting Lines ────────────────────────────────────────────────

function ConnectorDown({ childCount }: { childCount: number }) {
  // Vertical line from parent, horizontal span across children, vertical lines down to each child
  // All rendered via CSS borders
  return (
    <div className="flex flex-col items-center" data-testid="org-connector">
      {/* Vertical line down from parent */}
      <div className="w-px h-6 bg-muted-foreground/20" />
      {/* Horizontal bar + vertical drops */}
      {childCount > 1 && (
        <div className="relative flex items-start justify-center">
          {/* Horizontal line spanning all children */}
          <div
            className="h-px bg-muted-foreground/20 absolute top-0"
            style={{
              width: `calc(${childCount - 1} * 176px)`,
              left: `calc(-${(childCount - 1) * 176 / 2}px)`,
            }}
          />
          {/* Vertical drops to each child */}
          <div className="flex" style={{ gap: "16px" }}>
            {Array.from({ length: childCount }).map((_, i) => (
              <div key={i} className="flex flex-col items-center" style={{ width: "160px" }}>
                <div className="w-px h-6 bg-muted-foreground/20" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function OrgMap() {
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  if (isLoading || !agents) return <OrgMapSkeleton />;

  // Build lookup by codename
  const agentMap = new Map<string, Agent>();
  for (const a of agents) {
    agentMap.set(a.codename, a);
  }

  return (
    <div className="px-6 py-8" data-testid="org-map">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-10" data-testid="org-map-header">
        <div className="flex items-center gap-2 mb-1">
          <Network size={20} className="text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">
            Organization Map
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Agent hierarchy &amp; real-time status
        </p>
      </div>

      {/* ── Org Chart ───────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0" data-testid="org-chart">
        {HIERARCHY.map((layer, layerIdx) => {
          const layerAgents = layer.codenames
            .map((cn) => agentMap.get(cn))
            .filter((a): a is Agent => !!a);

          return (
            <div key={layer.label} className="flex flex-col items-center">
              {/* Connector from previous layer */}
              {layerIdx > 0 && (
                <ConnectorDown childCount={layerAgents.length} />
              )}

              {/* Layer label */}
              <div
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-3"
                data-testid={`org-layer-${layer.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                {layer.label}
              </div>

              {/* Agent cards */}
              <div className="flex gap-4 justify-center flex-wrap">
                {layerAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
