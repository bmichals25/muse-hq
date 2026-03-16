import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import type { Agent, BriefingData } from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
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

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function BriefingSkeleton() {
  return (
    <div
      className="max-w-2xl mx-auto px-6 py-8 space-y-8"
      data-testid="briefing-skeleton"
    >
      <SkeletonBlock className="h-6 w-56" />
      <SkeletonBlock className="h-8 w-80" />
      <SkeletonBlock className="h-4 w-64" />
      <div className="space-y-3">
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-14" />
      </div>
      <SkeletonBlock className="h-20" />
      <SkeletonBlock className="h-12 w-64" />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function Briefing() {
  const { data: briefing, isLoading: loadingBriefing } =
    useQuery<BriefingData>({ queryKey: ["/api/briefing"] });
  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const isLoading = loadingBriefing || loadingAgents;
  if (isLoading) return <BriefingSkeleton />;
  if (!briefing) return null;

  const agentColor = (codename: string) =>
    agents?.find((a) => a.codename === codename)?.color ?? "#6B7280";

  return (
    <div
      className="max-w-2xl mx-auto px-6 py-8 space-y-8"
      data-testid="briefing-page"
    >
      {/* ── Date Header ──────────────────────────────────────── */}
      <div data-testid="briefing-date-header">
        <p className="text-xs text-muted-foreground tracking-wide uppercase">
          {formatDate()}
        </p>
        <h1
          className="text-2xl font-semibold text-foreground mt-2"
          data-testid="briefing-greeting"
        >
          {briefing.greeting}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what happened while you were away.
        </p>
      </div>

      {/* ── Overnight Activity ───────────────────────────────── */}
      <div data-testid="overnight-activity-section">
        <h2
          className="text-sm font-semibold text-foreground mb-3"
          data-testid="overnight-activity-heading"
        >
          Overnight Activity
        </h2>
        <div className="space-y-2">
          {briefing.overnightActivity.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-card border border-card-border rounded-lg p-3"
              data-testid={`overnight-${i}`}
            >
              <CheckCircle2
                size={16}
                className="text-emerald-400 shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-xs font-bold"
                    style={{ color: agentColor(item.agentCodename) }}
                    data-testid={`overnight-agent-${item.agentCodename}`}
                  >
                    {item.agentCodename}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {formatTime(item.time)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's Priorities ───────────────────────────────── */}
      <div data-testid="priorities-section">
        <h2
          className="text-sm font-semibold text-foreground mb-3"
          data-testid="priorities-heading"
        >
          Today&apos;s Priorities
        </h2>
        <div className="space-y-2">
          {briefing.priorities.map((p) => (
            <Link href={`/products/${p.productSlug}`} key={p.rank}>
              <div
                className="flex items-center gap-3 bg-card border border-card-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer"
                data-testid={`priority-${p.rank}`}
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {p.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: agentColor(p.agentCodename) }}
                    >
                      {p.agentCodename}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {p.productSlug}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Blockers ─────────────────────────────────────────── */}
      {briefing.blockers.length > 0 && (
        <div data-testid="blockers-section">
          <h2
            className="text-sm font-semibold text-foreground mb-3"
            data-testid="blockers-heading"
          >
            Blockers
          </h2>
          <div className="space-y-2">
            {briefing.blockers.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-card border border-yellow-500/20 rounded-lg p-3"
                data-testid={`blocker-${i}`}
              >
                <AlertTriangle
                  size={16}
                  className="text-yellow-400 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {b.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground/50">
                    {b.productSlug}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue Update ───────────────────────────────────── */}
      <div data-testid="revenue-section">
        <h2
          className="text-sm font-semibold text-foreground mb-3"
          data-testid="revenue-heading"
        >
          Revenue Update
        </h2>
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-400" />
            <span
              className="text-lg font-semibold text-foreground"
              data-testid="revenue-mrr"
            >
              {briefing.revenue.mrr === 0
                ? "$0 MRR"
                : `$${briefing.revenue.mrr.toLocaleString()} MRR`}
            </span>
          </div>
          <p
            className="text-sm text-muted-foreground"
            data-testid="revenue-trend"
          >
            {briefing.revenue.trend}
          </p>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <Link href="/focus">
        <button
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
          data-testid="focus-cta"
        >
          Start Focus Mode on Priority #1
          <ArrowRight size={16} />
        </button>
      </Link>
    </div>
  );
}
