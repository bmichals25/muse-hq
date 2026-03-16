import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Hash,
  MessageSquare,
  Send,
  CornerDownRight,
  Users,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Agent, Channel, ChannelMessage } from "@shared/schema";

// ── Types ───────────────────────────────────────────────────────────

interface UnreadData {
  chat: number;
  channels: number;
  chatByAgent: Record<string, number>;
  channelById: Record<string, number>;
}

interface EnrichedChannel extends Channel {
  messageCount: number;
  lastMessage: ChannelMessage | null;
  members: { id: string; codename: string; color: string }[];
}

interface ChannelDetail extends Channel {
  messages: ChannelMessage[];
  members: { id: string; codename: string; color: string; name: string }[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Returns true when two messages should be visually grouped (same author, within 3 min). */
function shouldGroup(
  prev: ChannelMessage | null,
  curr: ChannelMessage,
): boolean {
  if (!prev) return false;
  if (prev.fromAgentId !== curr.fromAgentId) return false;
  const diffMs =
    new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
  return Math.abs(diffMs) < 3 * 60 * 1000;
}

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function ChannelSkeleton() {
  return (
    <div className="h-[calc(100vh-0px)] flex" data-testid="channel-skeleton">
      {/* Sidebar skeleton */}
      <div className="w-[220px] border-r border-card-border p-4 space-y-3 shrink-0">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
      </div>
      {/* Message area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-card-border px-4 flex items-center gap-3">
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-12 w-1/2" />
          <SkeletonBlock className="h-12 w-2/3" />
        </div>
        <div className="h-16 border-t border-card-border px-4 flex items-center gap-2">
          <SkeletonBlock className="flex-1 h-10" />
          <SkeletonBlock className="w-10 h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Channel Sidebar ─────────────────────────────────────────────────

function ChannelSidebar({
  channels,
  activeId,
  onSelect,
}: {
  channels: EnrichedChannel[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { data: unread } = useQuery<UnreadData>({
    queryKey: ["/api/unread"],
    refetchInterval: 10000,
  });

  return (
    <div
      className="w-[220px] border-r border-card-border flex flex-col shrink-0"
      data-testid="channel-sidebar"
    >
      <div className="px-4 py-4">
        <h2
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          data-testid="channels-heading"
        >
          Channels
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {channels.map((ch) => {
          const isActive = ch.id === activeId;
          const unreadCount = unread?.channelById[ch.id] ?? 0;

          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors relative ${
                isActive
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              data-testid={`channel-item-${ch.id}`}
            >
              <Hash size={14} className={isActive ? "text-primary" : ""} />
              <span className="flex-1 text-left truncate">
                {ch.name.replace(/^#/, "")}
              </span>

              {unreadCount > 0 && (
                <span
                  className="min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold text-white bg-primary rounded-full px-1 animate-badge-pulse"
                  data-testid={`channel-unread-${ch.id}`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Member avatars for active channel */}
      {(() => {
        const active = channels.find((c) => c.id === activeId);
        if (!active) return null;
        return (
          <div className="px-4 py-3 border-t border-card-border">
            <div className="flex items-center gap-1 mb-1.5">
              <Users size={10} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {active.members.length} members
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {active.members.map((m) => (
                <div
                  key={m.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                  style={{ backgroundColor: m.color }}
                  title={m.codename}
                  data-testid={`sidebar-member-${m.codename}`}
                >
                  {m.codename.slice(0, 2)}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Direct Messages link */}
      <div className="px-2 pb-3">
        <Link href="/chat/pick">
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            data-testid="dm-link"
          >
            <MessageSquare size={14} />
            <span>Direct Messages</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Message Area ────────────────────────────────────────────────────

function MessageArea({
  channelId,
  agents,
}: {
  channelId: string;
  agents: Agent[];
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: detail, isLoading } = useQuery<ChannelDetail>({
    queryKey: ["/api/channels", channelId],
  });

  const postMutation = useMutation({
    mutationFn: async (body: { content: string; replyToId?: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/channels/${channelId}`,
        body,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/channels", channelId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
    },
  });

  // Mark channel as read on mount / channel switch
  useEffect(() => {
    apiRequest("POST", `/api/unread/channel/${channelId}/read`).catch(
      () => {},
    );
    queryClient.invalidateQueries({ queryKey: ["/api/unread"] });
  }, [channelId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  // Auto-focus textarea on channel switch
  useEffect(() => {
    textareaRef.current?.focus();
  }, [channelId]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || postMutation.isPending) return;
    setInput("");
    postMutation.mutate({ content: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const getAuthor = (fromAgentId: string) => {
    if (fromAgentId === "user-ben") {
      return { codename: "Ben", color: undefined, isUser: true };
    }
    const agent = agentMap.get(fromAgentId);
    return agent
      ? { codename: agent.codename, color: agent.color, isUser: false }
      : { codename: fromAgentId, color: "#6B7280", isUser: false };
  };

  if (isLoading || !detail) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-card-border px-4 flex items-center">
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-12 w-1/2" />
          <SkeletonBlock className="h-12 w-2/3" />
        </div>
      </div>
    );
  }

  const messages = detail.messages;

  return (
    <div className="flex-1 flex flex-col" data-testid="message-area">
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="h-14 border-b border-card-border px-4 flex items-center gap-3 shrink-0"
        data-testid="channel-header"
      >
        <Hash size={16} className="text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <span
            className="text-sm font-semibold text-foreground"
            data-testid="channel-name"
          >
            {detail.name.replace(/^#/, "")}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {detail.description}
          </span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="header-members">
          <Users size={12} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {detail.members.length}
          </span>
          <div className="flex -space-x-1 ml-1">
            {detail.members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white border border-background"
                style={{ backgroundColor: m.color }}
                title={m.codename}
                data-testid={`header-avatar-${m.codename}`}
              >
                {m.codename.slice(0, 2)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        data-testid="channel-messages"
      >
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const grouped = shouldGroup(prev, msg);
          const author = getAuthor(msg.fromAgentId);

          // Reply indicator
          const replyOriginal = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;
          const replyAuthor = replyOriginal
            ? getAuthor(replyOriginal.fromAgentId)
            : null;

          return (
            <div key={msg.id} data-testid={`channel-msg-${msg.id}`}>
              {/* Reply thread connector */}
              {replyOriginal && replyAuthor && (
                <div
                  className="flex items-center gap-2 pl-10 mb-0.5"
                  data-testid={`reply-indicator-${msg.id}`}
                >
                  <CornerDownRight
                    size={12}
                    className="text-muted-foreground/40"
                  />
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color: replyAuthor.isUser ? undefined : replyAuthor.color,
                    }}
                  >
                    {replyAuthor.codename}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 truncate max-w-[200px]">
                    {replyOriginal.content}
                  </span>
                </div>
              )}

              <div
                className={`flex items-start gap-3 ${
                  grouped ? "pl-10" : ""
                } ${!grouped && idx > 0 ? "mt-3" : ""}`}
              >
                {/* Avatar — only show for first message in a group */}
                {!grouped && (
                  <>
                    {author.isUser ? (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
                        BM
                      </div>
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: author.color }}
                      >
                        {author.codename.slice(0, 2)}
                      </div>
                    )}
                  </>
                )}

                <div className="flex-1 min-w-0">
                  {/* Author + timestamp — only for first message in a group */}
                  {!grouped && (
                    <div className="flex items-center gap-2 mb-0.5">
                      {author.isUser ? (
                        <span className="text-[10px] font-semibold text-foreground">
                          Ben
                        </span>
                      ) : (
                        <Link href={`/agents/${author.codename}`}>
                          <span
                            className="text-[10px] font-semibold hover:underline cursor-pointer"
                            style={{ color: author.color }}
                            data-testid={`author-link-${msg.id}`}
                          >
                            {author.codename}
                          </span>
                        </Link>
                      )}
                      <span className="text-[9px] text-muted-foreground/50">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-foreground leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────── */}
      <div
        className="border-t border-card-border px-4 py-3 shrink-0"
        data-testid="channel-input-area"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${detail.name}...`}
            rows={1}
            className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none max-h-32"
            data-testid="channel-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || postMutation.isPending}
            className="p-2.5 rounded-lg bg-primary text-primary-foreground transition-colors disabled:opacity-30"
            data-testid="channel-send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function GroupChat() {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const prevChannelIdRef = useRef<string | null>(null);

  const { data: channels, isLoading: loadingChannels } = useQuery<
    EnrichedChannel[]
  >({
    queryKey: ["/api/channels"],
  });

  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  // Default to first channel
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Mark previous channel as read when switching
  useEffect(() => {
    if (
      prevChannelIdRef.current &&
      prevChannelIdRef.current !== activeChannelId
    ) {
      apiRequest(
        "POST",
        `/api/unread/channel/${prevChannelIdRef.current}/read`,
      ).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/unread"] });
    }
    prevChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  if (loadingChannels || loadingAgents || !channels || !agents) {
    return <ChannelSkeleton />;
  }

  return (
    <div
      className="h-[calc(100vh-0px)] flex"
      data-testid="group-chat"
    >
      <ChannelSidebar
        channels={channels}
        activeId={activeChannelId ?? ""}
        onSelect={setActiveChannelId}
      />

      {activeChannelId ? (
        <MessageArea
          key={activeChannelId}
          channelId={activeChannelId}
          agents={agents}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a channel to start chatting
          </p>
        </div>
      )}
    </div>
  );
}
