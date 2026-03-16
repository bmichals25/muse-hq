import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Send,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Agent, ChatMessage } from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Types ───────────────────────────────────────────────────────────

interface UnreadData {
  chat: number;
  channels: number;
  chatByAgent: Record<string, number>;
  channelById: Record<string, number>;
}

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function ChatSkeleton() {
  return (
    <div className="h-[calc(100vh-0px)] flex flex-col" data-testid="chat-skeleton">
      <div className="h-14 border-b border-card-border px-4 flex items-center gap-3">
        <SkeletonBlock className="w-8 h-8 rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <SkeletonBlock className="h-12 w-3/4" />
        <SkeletonBlock className="h-12 w-1/2 ml-auto" />
        <SkeletonBlock className="h-12 w-2/3" />
      </div>
      <div className="h-16 border-t border-card-border px-4 flex items-center gap-2">
        <SkeletonBlock className="flex-1 h-10" />
        <SkeletonBlock className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

// ── Agent Picker ────────────────────────────────────────────────────

function AgentPicker({ agents }: { agents: Agent[] }) {
  const { data: unread } = useQuery<UnreadData>({
    queryKey: ["/api/unread"],
    refetchInterval: 10000,
  });

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col" data-testid="agent-picker">
      <div className="px-6 py-8">
        <h1
          className="text-2xl font-semibold text-foreground"
          data-testid="picker-title"
        >
          Chat with Agents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an agent to start a conversation
        </p>
      </div>
      <div
        className="grid grid-cols-2 gap-3 px-6 pb-6"
        data-testid="agent-picker-grid"
      >
        {agents.map((agent) => {
          const unreadCount = unread?.chatByAgent[agent.id] ?? 0;
          return (
            <Link href={`/chat/${agent.id}`} key={agent.id}>
              <div
                className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer relative"
                data-testid={`picker-agent-${agent.codename}`}
              >
                {unreadCount > 0 && (
                  <span
                    className="absolute top-3 right-3 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-primary rounded-full px-1 animate-badge-pulse"
                    data-testid={`unread-badge-${agent.codename}`}
                  >
                    {unreadCount}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.codename.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {agent.codename}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                          agent.status === "working"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                        data-testid={`picker-status-${agent.codename}`}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {agent.department}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 line-clamp-2">
                  {agent.role}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────────

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2" data-testid="typing-indicator">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: color,
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Active Chat ─────────────────────────────────────────────────────

function ActiveChat({
  agent,
  agents,
}: {
  agent: Agent;
  agents: Agent[];
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, navigate] = useLocation();
  const prevAgentIdRef = useRef<string | null>(null);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", agent.id],
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/chat/${agent.id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", agent.id] });
    },
  });

  // Mark previous agent's chat as read when switching
  useEffect(() => {
    if (prevAgentIdRef.current && prevAgentIdRef.current !== agent.id) {
      apiRequest("POST", `/api/unread/chat/${prevAgentIdRef.current}/read`).catch(
        () => {},
      );
      queryClient.invalidateQueries({ queryKey: ["/api/unread"] });
    }
    prevAgentIdRef.current = agent.id;
  }, [agent.id]);

  // Mark current agent as read on mount
  useEffect(() => {
    apiRequest("POST", `/api/unread/chat/${agent.id}/read`).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/unread"] });
  }, [agent.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  // Auto-focus textarea on agent switch
  useEffect(() => {
    textareaRef.current?.focus();
  }, [agent.id]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherAgents = agents.filter((a) => a.id !== agent.id);

  if (isLoading) return <ChatSkeleton />;

  return (
    <div
      className="h-[calc(100vh-0px)] flex flex-col"
      data-testid="active-chat"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="h-14 border-b border-card-border px-4 flex items-center gap-3 shrink-0"
        data-testid="chat-header"
      >
        <Link href="/chat/pick">
          <button
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            data-testid="chat-back"
          >
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: agent.color }}
        >
          {agent.codename.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold text-foreground"
              data-testid="chat-agent-codename"
            >
              {agent.codename}
            </span>
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                agent.status === "working"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
              data-testid="chat-agent-status"
            >
              {agent.status}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {agent.name} · {agent.department}
          </span>
        </div>

        {/* Quick-switch avatars */}
        <div className="ml-auto flex items-center gap-1.5" data-testid="quick-switch">
          {otherAgents.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/chat/${a.id}`)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white opacity-50 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: a.color }}
              title={a.codename}
              data-testid={`switch-${a.codename}`}
            >
              {a.codename.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        data-testid="messages-area"
      >
        {(messages ?? []).map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.id}`}
            >
              <div
                className={`flex gap-2 max-w-[75%] ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                {isUser ? (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
                    BM
                  </div>
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.codename.slice(0, 2)}
                  </div>
                )}
                {/* Bubble */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold text-foreground">
                      {isUser ? "You" : agent.codename}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`text-sm rounded-lg px-3 py-2 ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-card-border text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.codename.slice(0, 2)}
              </div>
              <div className="bg-card border border-card-border rounded-lg">
                <TypingIndicator color={agent.color} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────── */}
      <div
        className="border-t border-card-border px-4 py-3 shrink-0"
        data-testid="chat-input-area"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.codename}...`}
            rows={1}
            className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none max-h-32"
            data-testid="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="p-2.5 rounded-lg transition-colors disabled:opacity-30"
            style={{
              backgroundColor: input.trim() ? agent.color : undefined,
              color: input.trim() ? "white" : undefined,
            }}
            data-testid="chat-send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function AgentChat() {
  const params = useParams<{ agentId?: string }>();

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  if (isLoading || !agents) return <ChatSkeleton />;

  // Picker mode: /chat/pick or no agentId
  if (!params.agentId || params.agentId === "pick") {
    return <AgentPicker agents={agents} />;
  }

  // Find the selected agent
  const agent = agents.find((a) => a.id === params.agentId);
  if (!agent) {
    return <AgentPicker agents={agents} />;
  }

  return <ActiveChat key={agent.id} agent={agent} agents={agents} />;
}
