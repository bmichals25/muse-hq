import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecentActivity } from "@shared/schema";

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

export function ActivityTicker() {
  const { data: activities } = useQuery<RecentActivity[]>({
    queryKey: ["/api/recent-activity"],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!activities || activities.length === 0) return;

    const interval = setInterval(() => {
      // Fade out
      setVisible(false);

      // After fade-out, switch item and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [activities]);

  if (!activities || activities.length === 0) return null;

  const item = activities[currentIndex % activities.length];

  return (
    <div
      className="h-9 bg-card/80 backdrop-blur-sm border-b border-card-border flex items-center px-4 gap-3 overflow-hidden"
      data-testid="activity-ticker"
    >
      {/* Activity label with pulsing green dot */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        data-testid="ticker-label"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Activity
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-card-border shrink-0" />

      {/* Cycling item */}
      <div
        className="flex items-center gap-2 min-w-0 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        data-testid="ticker-item"
      >
        {/* Agent avatar */}
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
          style={{ backgroundColor: item.agentColor }}
          data-testid={`ticker-avatar-${item.agentCodename}`}
        >
          {item.agentCodename.slice(0, 2)}
        </div>

        {/* Content */}
        <span className="text-xs text-foreground truncate" data-testid="ticker-text">
          <span className="font-semibold">{item.agentCodename}</span>
          {" "}
          <span className="text-muted-foreground">{item.description}</span>
        </span>

        {/* Time */}
        <span
          className="text-[10px] text-muted-foreground/50 shrink-0"
          data-testid="ticker-time"
        >
          {formatTimeAgo(item.timestamp)}
        </span>
      </div>
    </div>
  );
}
