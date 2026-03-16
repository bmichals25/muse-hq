import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Hash,
  ArrowRight,
  Clock,
  Filter,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RecentActivity, Agent, Product } from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; dotColor: string; badge: string }
> = {
  task_completed: {
    label: "Task Completed",
    icon: CheckCircle2,
    dotColor: "#10B981",
    badge: "bg-emerald-500/15 text-emerald-400",
  },
  agent_alert: {
    label: "Alert",
    icon: AlertTriangle,
    dotColor: "#F59E0B",
    badge: "bg-amber-500/15 text-amber-400",
  },
  message: {
    label: "Message",
    icon: MessageSquare,
    dotColor: "#3B82F6",
    badge: "bg-blue-500/15 text-blue-400",
  },
  channel_post: {
    label: "Channel Post",
    icon: Hash,
    dotColor: "#8B5CF6",
    badge: "bg-violet-500/15 text-violet-400",
  },
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

function formatExactTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " · " + d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Type filter tabs ────────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: Activity },
  { key: "task_completed", label: "Tasks", icon: CheckCircle2 },
  { key: "agent_alert", label: "Alerts", icon: AlertTriangle },
  { key: "message", label: "Messages", icon: MessageSquare },
  { key: "channel_post", label: "Channels", icon: Hash },
] as const;

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonEntry() {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-3 h-3 rounded-full skeleton-shimmer" />
        <div className="w-0.5 flex-1 skeleton-shimmer mt-2" />
      </div>
      <div className="flex-1 bg-card border border-card-border rounded-lg p-4 space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full skeleton-shimmer" />
          <div className="h-4 w-24 skeleton-shimmer rounded" />
          <div className="h-4 w-16 skeleton-shimmer rounded" />
        </div>
        <div className="h-4 w-3/4 skeleton-shimmer rounded" />
        <div className="h-3 w-1/2 skeleton-shimmer rounded" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function ActivityFeed() {
  const { data: activities, isLoading: loadingActivities } = useQuery<
    RecentActivity[]
  >({
    queryKey: ["/api/recent-activity"],
    refetchInterval: 10000,
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // ── Filter state ──
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [agentFilters, setAgentFilters] = useState<Set<string>>(new Set());
  const [productFilter, setProductFilter] = useState<string | null>(null);

  const toggleAgent = (codename: string) => {
    setAgentFilters((prev) => {
      const next = new Set(prev);
      if (next.has(codename)) {
        next.delete(codename);
      } else {
        next.add(codename);
      }
      return next;
    });
  };

  // ── Filtered activities ──
  const filtered = useMemo(() => {
    if (!activities) return [];
    let result = [...activities].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter);
    }

    if (agentFilters.size > 0) {
      result = result.filter((a) => agentFilters.has(a.agentCodename));
    }

    if (productFilter) {
      result = result.filter((a) => a.productSlug === productFilter);
    }

    return result;
  }, [activities, typeFilter, agentFilters, productFilter]);

  // ── Type counts ──
  const typeCounts = useMemo(() => {
    if (!activities) return {};
    const counts: Record<string, number> = {};
    for (const a of activities) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [activities]);

  if (loadingActivities) {
    return (
      <div className="px-6 py-8 space-y-6" data-testid="activity-feed-skeleton">
        <div className="space-y-2">
          <div className="h-8 w-56 skeleton-shimmer rounded" />
          <div className="h-5 w-80 skeleton-shimmer rounded" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 skeleton-shimmer rounded-full" />
          ))}
        </div>
        <div className="mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonEntry key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasFilters =
    typeFilter !== "all" || agentFilters.size > 0 || productFilter !== null;

  return (
    <div className="px-6 py-8" data-testid="activity-feed">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6" data-testid="activity-header">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              Activity Feed
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time studio activity across all agents and products
          </p>
        </div>
        <div
          className="flex items-center gap-2 bg-card border border-card-border rounded-full px-3 py-1.5"
          data-testid="live-indicator"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-emerald-400">Live</span>
        </div>
      </div>

      {/* ── Type Filter Tabs ────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 mb-4"
        data-testid="type-filters"
      >
        {TYPE_FILTERS.map(({ key, label, icon: Icon }) => {
          const isActive = typeFilter === key;
          const count = key === "all" ? activities?.length ?? 0 : typeCounts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                isActive
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-card-border hover:border-primary/20"
              }`}
              data-testid={`type-filter-${key}`}
            >
              <Icon size={12} />
              <span>{label}</span>
              <span
                className={`min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full px-1 ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Agent + Product Filters ─────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Agent filter */}
        {agents && (
          <div
            className="flex items-center gap-2"
            data-testid="agent-filters"
          >
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider shrink-0 w-14">
              Agent
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {agents.map((agent) => {
                const isActive = agentFilters.has(agent.codename);
                return (
                  <Tooltip key={agent.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleAgent(agent.codename)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 transition-all ${
                          isActive
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "opacity-60 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: agent.color }}
                        data-testid={`agent-filter-${agent.codename}`}
                      >
                        {agent.codename.slice(0, 2)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="text-xs">{agent.codename} · {agent.department}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {agentFilters.size > 0 && (
                <button
                  onClick={() => setAgentFilters(new Set())}
                  className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                  data-testid="clear-agent-filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Product filter */}
        {products && (
          <div
            className="flex items-center gap-2"
            data-testid="product-filters"
          >
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider shrink-0 w-14">
              Product
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setProductFilter(null)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  productFilter === null
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-card text-muted-foreground border-card-border hover:border-primary/20"
                }`}
                data-testid="product-filter-all"
              >
                All
              </button>
              {products.map((product) => {
                const isActive = productFilter === product.slug;
                return (
                  <button
                    key={product.id}
                    onClick={() =>
                      setProductFilter(isActive ? null : product.slug)
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-card text-muted-foreground border-card-border hover:border-primary/20"
                    }`}
                    data-testid={`product-filter-${product.slug}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: product.accentColor }}
                    />
                    {product.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Stats Bar ───────────────────────────────────── */}
      {activities && (
        <div
          className="flex items-center gap-6 mb-6 px-4 py-3 bg-card border border-card-border rounded-lg"
          data-testid="activity-stats"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {typeCounts["task_completed"] ?? 0}
              </span>{" "}
              tasks completed
            </span>
          </div>
          <div className="w-px h-4 bg-card-border" />
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {typeCounts["agent_alert"] ?? 0}
              </span>{" "}
              alerts
            </span>
          </div>
          <div className="w-px h-4 bg-card-border" />
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-blue-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {typeCounts["message"] ?? 0}
              </span>{" "}
              messages
            </span>
          </div>
          <div className="w-px h-4 bg-card-border" />
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-violet-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {typeCounts["channel_post"] ?? 0}
              </span>{" "}
              channel posts
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <Clock size={12} />
            <span>Last 12 hours</span>
          </div>
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-testid="empty-state"
        >
          <Filter size={32} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No activity matching current filters
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setTypeFilter("all");
                setAgentFilters(new Set());
                setProductFilter(null);
              }}
              className="mt-2 text-xs text-primary hover:underline"
              data-testid="clear-all-filters"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="relative" data-testid="timeline">
          {/* Timeline line */}
          <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-card-border" />

          <div className="space-y-1">
            {filtered.map((item) => {
              const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.message;
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 relative"
                  data-testid={`timeline-entry-${item.id}`}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0 z-10 pt-5">
                    <div
                      className={`w-[11px] h-[11px] rounded-full border-2 border-background ${
                        item.type === "agent_alert" ? "animate-pulse" : ""
                      }`}
                      style={{ backgroundColor: config.dotColor }}
                      data-testid={`timeline-dot-${item.id}`}
                    />
                  </div>

                  {/* Card */}
                  <Link href={item.linkTo} className="flex-1 min-w-0">
                    <div
                      className="bg-card border border-card-border rounded-lg p-4 mb-1 hover:border-primary/20 transition-colors cursor-pointer group"
                      data-testid={`timeline-card-${item.id}`}
                    >
                      {/* Top row: agent + type + time */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ backgroundColor: item.agentColor }}
                          data-testid={`timeline-avatar-${item.agentCodename}`}
                        >
                          {item.agentCodename.slice(0, 2)}
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          {item.agentCodename}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.badge}`}
                        >
                          {config.label}
                        </span>
                        <span className="flex-1" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="text-[10px] text-muted-foreground/50 shrink-0"
                              data-testid={`timeline-time-${item.id}`}
                            >
                              {formatTimeAgo(item.timestamp)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <span className="text-xs">{formatExactTime(item.timestamp)}</span>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Title */}
                      <h3
                        className="text-sm font-medium text-foreground mb-0.5"
                        data-testid={`timeline-title-${item.id}`}
                      >
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p
                        className="text-xs text-muted-foreground mb-2 line-clamp-2"
                        data-testid={`timeline-desc-${item.id}`}
                      >
                        {item.description}
                      </p>

                      {/* Bottom row: product badge + link */}
                      <div className="flex items-center justify-between">
                        {item.productSlug ? (
                          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: item.productColor ?? "#666",
                              }}
                            />
                            {item.productName}
                          </span>
                        ) : (
                          <span />
                        )}
                        <ArrowRight
                          size={12}
                          className="text-muted-foreground/30 group-hover:text-primary transition-colors"
                        />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
