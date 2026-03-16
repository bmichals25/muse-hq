import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ProductView from "@/pages/product-view";
import AgentPanel from "@/pages/agent-panel";
import AgentChat from "@/pages/agent-chat";
import GroupChat from "@/pages/group-chat";
import Briefing from "@/pages/briefing";
import FocusMode from "@/pages/focus-mode";
import AgentSettings from "@/pages/agent-settings";
import OrgMap from "@/pages/org-map";
import KanbanBoard from "@/pages/kanban-board";
import VoiceCall from "@/pages/voice-call";
import GroupCall from "@/pages/group-call";
import ActivityFeed from "@/pages/activity-feed";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { ActivityTicker } from "@/components/activity-ticker";
import {
  LayoutDashboard,
  Package,
  Bot,
  MessageSquare,
  Hash,
  FileText,
  Crosshair,
  KanbanSquare,
  Network,
  Mic,
  Activity,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useState, useEffect, useCallback, createContext, useContext } from "react";

// Sidebar context so child components can read collapsed state
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}
const SidebarContext = createContext<SidebarContextType>({ collapsed: false, setCollapsed: () => {} });
export function useSidebar() { return useContext(SidebarContext); }

function MuseHQLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-1" data-testid="logo-muse-hq">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="MUSE HQ Logo">
        <rect x="2" y="2" width="28" height="28" rx="6" stroke="#3B82F6" strokeWidth="2" fill="none" />
        <path d="M8 22V10l4 6 4-6v12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="24" cy="12" r="2" fill="#3B82F6" />
        <path d="M22 18h4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 22h4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!collapsed && (
        <span className="text-sm font-semibold tracking-wide text-foreground">
          MUSE HQ
        </span>
      )}
    </div>
  );
}

// Command Palette
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const commands = [
    { label: "Dashboard", shortcut: "1", path: "/", icon: "📊" },
    { label: "Products (Resumaid)", shortcut: "2", path: "/products/resumaid", icon: "📦" },
    { label: "Agents (MUSE)", shortcut: "3", path: "/agents/MUSE", icon: "🤖" },
    { label: "Chat", shortcut: "4", path: "/chat/pick", icon: "💬" },
    { label: "Channels", shortcut: "5", path: "/channels", icon: "#" },
    { label: "Briefing", shortcut: "6", path: "/briefing", icon: "📋" },
    { label: "Focus Mode", shortcut: "7", path: "/focus", icon: "🎯" },
    { label: "Board", shortcut: "8", path: "/board", icon: "📋" },
    { label: "Activity", shortcut: "9", path: "/activity", icon: "📡" },
    { label: "Org Map", shortcut: "0", path: "/org", icon: "🗺️" },
    { label: "Voice Call (MUSE)", shortcut: "", path: "/voice/a-1", icon: "🎙️" },
    { label: "Group Voice Call", shortcut: "", path: "/voice/group", icon: "🎙️" },
    { label: "Chat with MUSE", shortcut: "", path: "/chat/a-1", icon: "💬" },
    { label: "Chat with FORGE", shortcut: "", path: "/chat/a-3", icon: "💬" },
    { label: "Chat with SCOUT", shortcut: "", path: "/chat/a-2", icon: "💬" },
    { label: "Chat with HERALD", shortcut: "", path: "/chat/a-4", icon: "💬" },
    { label: "Chat with SENTINEL", shortcut: "", path: "/chat/a-7", icon: "💬" },
    { label: "Chat with PHOENIX", shortcut: "", path: "/chat/a-8", icon: "💬" },
    { label: "Resumaid", shortcut: "", path: "/products/resumaid", icon: "📦" },
    { label: "MuseRoom Studio", shortcut: "", path: "/products/museroom", icon: "📦" },
    { label: "TrustedRiders", shortcut: "", path: "/products/trustedriders", icon: "📦" },
    { label: "Stream", shortcut: "", path: "/products/stream", icon: "📦" },
    { label: "Pomerance", shortcut: "", path: "/products/pomerance", icon: "📦" },
    { label: "SEVEN", shortcut: "", path: "/products/seven", icon: "📦" },
  ];

  const filtered = search
    ? commands.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()))
    : commands.slice(0, 7);

  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] command-backdrop flex items-start justify-center pt-[20vh]" onClick={onClose} data-testid="command-palette">
      <div className="w-[480px] bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-card-border">
          <Search size={16} className="text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands, agents, products..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
            data-testid="command-search"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length > 0) handleSelect(filtered[0].path);
            }}
          />
          <span className="text-[10px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded">ESC</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.map((cmd) => (
            <button
              key={cmd.path + cmd.label}
              onClick={() => handleSelect(cmd.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary/10 transition-colors"
              data-testid={`cmd-${cmd.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <span className="text-sm">{cmd.icon}</span>
              <span className="text-sm text-foreground flex-1">{cmd.label}</span>
              {cmd.shortcut && (
                <span className="text-[10px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded font-mono">
                  {cmd.shortcut}
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground/40">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, unreadKey: null },
  { path: "/board", label: "Board", icon: KanbanSquare, unreadKey: null },
  { path: "/products/resumaid", label: "Products", icon: Package, unreadKey: null },
  { path: "/agents/MUSE", label: "Agents", icon: Bot, unreadKey: null },
  { path: "/org", label: "Org Map", icon: Network, unreadKey: null },
  { path: "/chat/pick", label: "Chat", icon: MessageSquare, unreadKey: "chat" as const },
  { path: "/channels", label: "Channels", icon: Hash, unreadKey: "channels" as const },
  { path: "/voice/group", label: "Voice", icon: Mic, unreadKey: null },
  { path: "/activity", label: "Activity", icon: Activity, unreadKey: null },
  { path: "/briefing", label: "Briefing", icon: FileText, unreadKey: null },
  { path: "/focus", label: "Focus", icon: Crosshair, unreadKey: null },
];

function Sidebar() {
  const [location] = useLocation();
  const { collapsed, setCollapsed } = useSidebar();

  const { data: unread } = useQuery<{ chat: number; channels: number }>({
    queryKey: ["/api/unread"],
    refetchInterval: 10000,
  });

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ${
        collapsed ? "w-[52px]" : "w-[200px]"
      }`}
      data-testid="sidebar"
    >
      <div className="flex items-center justify-between px-3 h-14 border-b border-sidebar-border">
        <MuseHQLogo collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems.map(({ path, label, icon: Icon, unreadKey }) => {
          const isActive =
            path === "/"
              ? location === "/"
              : location.startsWith(path.split("/").slice(0, 2).join("/"));

          const unreadCount = unreadKey && unread ? (unread as any)[unreadKey] : 0;

          return (
            <Link href={path} key={path}>
              <div
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors relative ${
                  isActive
                    ? "bg-sidebar-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                }`}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon size={16} className={isActive ? "text-primary" : ""} />
                {!collapsed && <span>{label}</span>}
                {unreadCount > 0 && (
                  <span className={`absolute ${collapsed ? "top-0.5 right-0.5" : "right-2"} min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold text-white bg-primary rounded-full px-1 animate-badge-pulse`}>
                    {unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 py-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary" data-testid="avatar-bm">
              BM
            </div>
            <div className="text-xs">
              <div className="text-foreground font-medium">Ben Michals</div>
              <div className="text-muted-foreground">Muse Labs</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary" data-testid="avatar-bm-collapsed">
              BM
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const { collapsed } = useSidebar();
  const isFocusMode = location === "/focus";
  const isFullHeightPage = location.startsWith("/chat") || location === "/channels";
  const isVoicePage = location.startsWith("/voice/");
  const sidebarWidth = collapsed ? "52px" : "200px";

  if (isFocusMode) {
    return <FocusMode />;
  }

  if (location.startsWith("/voice/")) {
    return (
      <Switch>
        <Route path="/voice/group" component={GroupCall} />
        <Route path="/voice/:agentId" component={VoiceCall} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={`transition-[margin] duration-200 ${
          isFullHeightPage ? "h-screen overflow-hidden" : "min-h-screen"
        }`}
        style={{ marginLeft: sidebarWidth }}
      >
        {!isFullHeightPage && !isVoicePage && <ActivityTicker />}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/board" component={KanbanBoard} />
          <Route path="/activity" component={ActivityFeed} />
          <Route path="/products/:slug" component={ProductView} />
          <Route path="/agents/:codename/settings" component={AgentSettings} />
          <Route path="/agents/:codename" component={AgentPanel} />
          <Route path="/chat/pick" component={AgentChat} />
          <Route path="/chat/:agentId" component={AgentChat} />
          <Route path="/channels" component={GroupChat} />
          <Route path="/briefing" component={Briefing} />
          <Route path="/org" component={OrgMap} />
          <Route component={NotFound} />
        </Switch>
        {!isFullHeightPage && (
          <div className="px-6 pb-4">
            <PerplexityAttribution />
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      // Escape — close command palette
      if (e.key === "Escape" && cmdOpen) {
        setCmdOpen(false);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cmdOpen]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
          <Toaster />
          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
          <Router hook={useHashLocation}>
            <AppLayout />
          </Router>
        </SidebarContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
