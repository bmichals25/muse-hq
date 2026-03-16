import type {
  Product,
  Agent,
  Task,
  AgentMessage,
  ChatMessage,
  Channel,
  ChannelMessage,
  MetricsData,
  BriefingData,
  RecentActivity,
  User,
  InsertUser,
  AgentVoiceProfile,
} from "@shared/schema";
import { randomUUID } from "crypto";

// ── Helpers ─────────────────────────────────────────────────────────

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}
function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

// ── Interface ───────────────────────────────────────────────────────

export interface IStorage {
  // Products
  getProducts(): Product[];
  getProduct(slug: string): Product | undefined;

  // Agents
  getAgents(): Agent[];
  getAgent(codename: string): Agent | undefined;
  getAgentById(id: string): Agent | undefined;

  // Tasks
  getTasks(): Task[];
  getTasksByProduct(productId: string): Task[];
  getTasksByAgent(agentId: string): Task[];
  updateTaskStatus(taskId: string, status: string): Task | undefined;

  // Agent Messages
  getAgentMessages(agentId: string): AgentMessage[];

  // Chat
  getChatMessages(agentId: string): ChatMessage[];
  addChatMessage(agentId: string, role: string, content: string): ChatMessage;

  // Channels
  getChannels(): Channel[];
  getChannel(channelId: string): Channel | undefined;
  getChannelMessages(channelId: string): ChannelMessage[];
  addChannelMessage(
    channelId: string,
    fromAgentId: string,
    content: string,
    replyToId?: string,
  ): ChannelMessage;

  // Metrics
  getMetrics(): MetricsData;

  // Briefing
  getBriefing(): BriefingData;

  // Recent Activity
  getRecentActivity(): RecentActivity[];

  // Unread counts
  getUnreadCounts(): {
    chat: number;
    channels: number;
    chatByAgent: Record<string, number>;
    channelById: Record<string, number>;
  };
  markChatRead(agentId: string): void;
  markChannelRead(channelId: string): void;

  // Voice
  getVoiceProfiles(): AgentVoiceProfile[];
  getVoiceProfile(agentId: string): AgentVoiceProfile | undefined;
  updateVoiceProfile(agentId: string, updates: Partial<AgentVoiceProfile>): AgentVoiceProfile | undefined;

  // Agent Settings
  updateAgent(agentId: string, updates: Partial<Agent>): Agent | undefined;

  // Users (template)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

// ── Seed Data ───────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  {
    id: "p-1",
    name: "Resumaid",
    slug: "resumaid",
    description:
      "AI-powered resume builder that crafts tailored, ATS-optimized resumes in minutes. Uses GPT to analyze job descriptions and highlight relevant experience.",
    status: "priority_1",
    accentColor: "#10B981",
    bgColor: "#0A1A14",
    fontFamily: "Inter",
    revenue: 0,
    repos: ["resumaid-app", "resumaid-landing", "resumaid-stripe"],
    lastActivity: minutesAgo(12),
  },
  {
    id: "p-2",
    name: "MuseRoom Studio",
    slug: "museroom",
    description:
      "Immersive browser-based music production environment. Spatial audio, collaborative sessions, and AI-assisted mixing for independent artists.",
    status: "active_dev",
    accentColor: "#D946EF",
    bgColor: "#1A0A2E",
    fontFamily: "Outfit",
    revenue: 0,
    repos: ["museroom-daw", "museroom-web"],
    lastActivity: minutesAgo(45),
  },
  {
    id: "p-3",
    name: "TrustedRiders",
    slug: "trustedriders",
    description:
      "Rideshare safety platform with real-time driver verification, trip monitoring, and community trust scores. Making every ride safer.",
    status: "in_progress",
    accentColor: "#F59E0B",
    bgColor: "#0A1F2E",
    fontFamily: "Inter",
    revenue: 0,
    repos: ["trustedriders-app"],
    lastActivity: hoursAgo(2),
  },
  {
    id: "p-4",
    name: "Stream",
    slug: "stream",
    description:
      "AI content pipeline that transforms raw ideas into polished multi-platform content. Blog posts, tweets, newsletters — all from one brief.",
    status: "early_stage",
    accentColor: "#A78BFA",
    bgColor: "#0F0A2E",
    fontFamily: "Space Grotesk",
    revenue: 0,
    repos: ["stream-pipeline"],
    lastActivity: hoursAgo(3),
  },
  {
    id: "p-5",
    name: "Pomerance",
    slug: "pomerance",
    description:
      "Legal AI assistant for contract review, clause extraction, and compliance checking. Built for solo practitioners and small firms.",
    status: "concept",
    accentColor: "#EAB308",
    bgColor: "#1C1C1C",
    fontFamily: "Libre Baskerville",
    revenue: 0,
    repos: ["pomerance-chat"],
    lastActivity: hoursAgo(48),
  },
  {
    id: "p-6",
    name: "SEVEN",
    slug: "seven",
    description:
      "Premium streetwear fashion brand with an e-commerce storefront. Limited drops, artist collaborations, and community-driven design.",
    status: "long_term",
    accentColor: "#F97316",
    bgColor: "#1A0A0A",
    fontFamily: "Bebas Neue",
    revenue: 0,
    repos: ["seven-store"],
    lastActivity: hoursAgo(72),
  },
];

const AGENTS: Agent[] = [
  {
    id: "a-1",
    codename: "MUSE",
    name: "MUSE Orchestrator",
    department: "Command",
    role: "Orchestrator — coordinates all agents, sets priorities, manages studio-wide strategy",
    status: "working",
    color: "#3B82F6",
    currentTask: "Coordinating Resumaid launch sprint",
    tasksCompleted: 47,
    lastActive: minutesAgo(3),
    avatarUrl: null,
    systemPrompt: "You are MUSE, the chief orchestrator of a venture studio. You speak with authority and strategic clarity. You coordinate all other agents, set priorities, and ensure the studio hits its revenue targets. You are decisive, direct, and always focused on the big picture.",
  },
  {
    id: "a-2",
    codename: "SCOUT",
    name: "SCOUT Intelligence",
    department: "R&D Intelligence",
    role: "Research & competitive intelligence — deep-dives on markets, competitors, and emerging tech",
    status: "working",
    color: "#8B5CF6",
    currentTask: "Analyzing competitor resume builders",
    tasksCompleted: 32,
    lastActive: minutesAgo(8),
    avatarUrl: null,
    systemPrompt: "You are SCOUT, the research and intelligence agent. You are naturally curious, data-driven, and thorough. You provide competitive analysis, market research, and emerging tech insights. You back claims with data and always offer to dig deeper.",
  },
  {
    id: "a-3",
    codename: "FORGE",
    name: "FORGE Engineering",
    department: "Product Engineering",
    role: "Lead engineer — builds features, writes code, manages repos and CI/CD",
    status: "working",
    color: "#10B981",
    currentTask: "Finalizing Stripe integration for Resumaid",
    tasksCompleted: 61,
    lastActive: minutesAgo(1),
    avatarUrl: null,
    systemPrompt: "You are FORGE, the lead engineer. You are technical, precise, and focused on shipping. You speak in terms of code, architecture, and technical decisions. You give clear status updates and estimated timelines.",
  },
  {
    id: "a-4",
    codename: "HERALD",
    name: "HERALD Growth",
    department: "Marketing & Growth",
    role: "Marketing strategist — launch copy, growth experiments, brand voice, content calendar",
    status: "active",
    color: "#F59E0B",
    currentTask: "Drafting Resumaid launch copy",
    tasksCompleted: 28,
    lastActive: minutesAgo(15),
    avatarUrl: null,
    systemPrompt: "You are HERALD, the marketing and growth strategist. You are energetic, persuasive, and creative. You think in terms of hooks, conversions, and audience psychology. You speak with confidence about launch strategies, copy, and brand positioning.",
  },
  {
    id: "a-5",
    codename: "VAULT",
    name: "VAULT Finance",
    department: "Finance & Revenue",
    role: "Revenue operations — Stripe config, pricing models, financial projections, MRR tracking",
    status: "active",
    color: "#EF4444",
    currentTask: "Setting up Stripe revenue tracking",
    tasksCompleted: 19,
    lastActive: minutesAgo(22),
    avatarUrl: null,
    systemPrompt: "You are VAULT, the finance and revenue operations agent. You are measured, precise, and numbers-driven. You speak in terms of MRR, conversion rates, pricing models, and financial projections. You are conservative with estimates but aggressive with strategy.",
  },
  {
    id: "a-6",
    codename: "NEXUS",
    name: "NEXUS Operations",
    department: "Operations",
    role: "DevOps & operations — CI/CD pipelines, deployments, infrastructure monitoring",
    status: "active",
    color: "#06B6D4",
    currentTask: "Monitoring CI/CD pipelines",
    tasksCompleted: 38,
    lastActive: minutesAgo(10),
    avatarUrl: null,
    systemPrompt: "You are NEXUS, the operations and DevOps agent. You are calm, methodical, and reliability-focused. You speak about pipelines, infrastructure, deploy status, and operational health. You prefer stability over speed.",
  },
  {
    id: "a-7",
    codename: "SENTINEL",
    name: "SENTINEL Monitor",
    department: "Performance Monitoring",
    role: "Performance watchdog — tracks agent throughput, flags anomalies, generates health reports",
    status: "working",
    color: "#F97316",
    currentTask: "Evaluating agent throughput metrics",
    tasksCompleted: 24,
    lastActive: minutesAgo(5),
    avatarUrl: null,
    systemPrompt: "You are SENTINEL, the performance monitoring agent. You are vigilant, analytical, and alert-oriented. You track agent throughput, flag anomalies, and generate health reports. You speak in metrics and always have the latest numbers.",
  },
  {
    id: "a-8",
    codename: "PHOENIX",
    name: "PHOENIX Detector",
    department: "Reliability",
    role: "Restart & resilience detection — scans repos for crash loops, restart patterns, stability issues",
    status: "active",
    color: "#EC4899",
    currentTask: "Scanning repos for restart patterns",
    tasksCompleted: 15,
    lastActive: minutesAgo(30),
    avatarUrl: null,
    systemPrompt: "You are PHOENIX, the restart detection and resilience agent. You are intense, thorough, and pattern-obsessed. You scan for crash loops, restart patterns, and stability issues. You speak with urgency about reliability and always dig to root cause.",
  },
];

const TASKS: Task[] = [
  // ── Resumaid (p-1) — most tasks, it's priority_1 ──
  {
    id: "t-1",
    productId: "p-1",
    agentId: "a-3",
    title: "Finalize Stripe checkout integration",
    description:
      "Complete the Stripe Checkout session flow, webhook handler, and success/cancel redirect pages.",
    status: "in_progress",
    priority: "critical",
    createdAt: hoursAgo(6),
  },
  {
    id: "t-2",
    productId: "p-1",
    agentId: "a-2",
    title: "Complete competitor pricing analysis",
    description:
      "Deep-dive on 12 competitor resume tools — pricing tiers, feature matrices, and positioning gaps.",
    status: "in_progress",
    priority: "high",
    createdAt: hoursAgo(12),
  },
  {
    id: "t-3",
    productId: "p-1",
    agentId: "a-4",
    title: "Draft launch landing page copy",
    description:
      "Write hero section, feature blocks, testimonials, and CTA copy for the Resumaid landing page.",
    status: "in_progress",
    priority: "high",
    createdAt: hoursAgo(8),
  },
  {
    id: "t-4",
    productId: "p-1",
    agentId: "a-5",
    title: "Configure Stripe test keys in environment",
    description:
      "Set up Stripe test API keys in .env, configure webhook signing secret, verify test mode.",
    status: "blocked",
    priority: "critical",
    createdAt: hoursAgo(10),
  },
  {
    id: "t-5",
    productId: "p-1",
    agentId: "a-3",
    title: "Build PDF export for generated resumes",
    description:
      "Implement server-side PDF generation using Puppeteer. Support multiple templates.",
    status: "pending",
    priority: "high",
    createdAt: hoursAgo(4),
  },
  {
    id: "t-6",
    productId: "p-1",
    agentId: "a-1",
    title: "Define launch-week KPI targets",
    description:
      "Set Week 1 and Week 2 targets for sign-ups, conversions, and MRR. Coordinate with VAULT.",
    status: "completed",
    priority: "high",
    createdAt: hoursAgo(24),
  },
  {
    id: "t-7",
    productId: "p-1",
    agentId: "a-6",
    title: "Set up production deployment pipeline",
    description:
      "Configure GitHub Actions for resumaid-app: lint, test, build, deploy to Vercel on main merge.",
    status: "completed",
    priority: "medium",
    createdAt: hoursAgo(36),
  },
  // ── MuseRoom (p-2) ──
  {
    id: "t-8",
    productId: "p-2",
    agentId: "a-3",
    title: "Prototype spatial audio engine",
    description:
      "Build a Web Audio API prototype for 3D positional sound in collaborative sessions.",
    status: "pending",
    priority: "medium",
    createdAt: hoursAgo(48),
  },
  {
    id: "t-9",
    productId: "p-2",
    agentId: "a-7",
    title: "Benchmark DAW rendering performance",
    description:
      "Profile museroom-daw render loop, identify bottlenecks, target 60fps at 128-track load.",
    status: "in_progress",
    priority: "medium",
    createdAt: hoursAgo(18),
  },
  // ── TrustedRiders (p-3) ──
  {
    id: "t-10",
    productId: "p-3",
    agentId: "a-2",
    title: "Research driver verification APIs",
    description:
      "Evaluate Checkr, Jumio, and Persona for real-time identity verification integration.",
    status: "pending",
    priority: "medium",
    createdAt: hoursAgo(20),
  },
  {
    id: "t-11",
    productId: "p-3",
    agentId: "a-3",
    title: "Design trust-score algorithm",
    description:
      "Spec the community trust scoring model — factors, weights, decay, and dispute resolution.",
    status: "pending",
    priority: "low",
    createdAt: hoursAgo(30),
  },
  // ── Stream (p-4) ──
  {
    id: "t-12",
    productId: "p-4",
    agentId: "a-2",
    title: "Map content repurposing workflow",
    description:
      "Document the ideal flow from raw idea to blog, tweet thread, newsletter, and LinkedIn post.",
    status: "completed",
    priority: "medium",
    createdAt: hoursAgo(72),
  },
  // ── Cross-product ──
  {
    id: "t-13",
    productId: "p-1",
    agentId: "a-8",
    title: "Audit resumaid-app for crash loops",
    description:
      "Scan error logs and restart patterns in resumaid-app. Flag any instability before launch.",
    status: "completed",
    priority: "high",
    createdAt: hoursAgo(16),
  },
  {
    id: "t-14",
    productId: "p-2",
    agentId: "a-8",
    title: "Check museroom-daw restart patterns",
    description:
      "PHOENIX flagged 3 restart patterns in museroom-daw. Investigate root causes.",
    status: "in_progress",
    priority: "high",
    createdAt: hoursAgo(5),
  },
];

const AGENT_MESSAGES: AgentMessage[] = [
  {
    id: "am-1",
    fromAgentId: "a-1",
    toAgentId: "a-3",
    content:
      "FORGE, Stripe integration is the top blocker. Push everything else — we need checkout live by EOD tomorrow.",
    messageType: "task",
    timestamp: hoursAgo(2),
  },
  {
    id: "am-2",
    fromAgentId: "a-3",
    toAgentId: "a-1",
    content:
      "Copy that, MUSE. Webhook handler is committed. Need VAULT to drop the test keys into .env.",
    messageType: "report",
    timestamp: hoursAgo(1.8),
  },
  {
    id: "am-3",
    fromAgentId: "a-1",
    toAgentId: "a-5",
    content:
      "VAULT — FORGE is blocked on Stripe test keys. Can you configure them ASAP?",
    messageType: "request",
    timestamp: hoursAgo(1.7),
  },
  {
    id: "am-4",
    fromAgentId: "a-5",
    toAgentId: "a-1",
    content:
      "On it. Had to verify the account first. Keys will be in .env within the hour.",
    messageType: "report",
    timestamp: hoursAgo(1.5),
  },
  {
    id: "am-5",
    fromAgentId: "a-7",
    toAgentId: "a-1",
    content:
      "SENTINEL alert: FORGE throughput is 2.3x above average. Might need to throttle to avoid burnout drift.",
    messageType: "alert",
    timestamp: hoursAgo(1.2),
  },
  {
    id: "am-6",
    fromAgentId: "a-2",
    toAgentId: "a-4",
    content:
      "HERALD, finished the competitor pricing matrix. 8 of 12 charge $9–15/mo. We have room at $7.99 to undercut.",
    messageType: "report",
    timestamp: hoursAgo(1),
  },
  {
    id: "am-7",
    fromAgentId: "a-4",
    toAgentId: "a-2",
    content:
      "Perfect timing, SCOUT. I'll weave the pricing angle into the landing page hero. '$7.99/mo' hits different.",
    messageType: "report",
    timestamp: minutesAgo(50),
  },
  {
    id: "am-8",
    fromAgentId: "a-8",
    toAgentId: "a-6",
    content:
      "NEXUS, I found 3 restart patterns in museroom-daw. Looks like the audio context isn't cleaning up on unmount.",
    messageType: "alert",
    timestamp: minutesAgo(40),
  },
  {
    id: "am-9",
    fromAgentId: "a-6",
    toAgentId: "a-8",
    content:
      "Thanks PHOENIX. I'll add a lifecycle cleanup hook in the next deploy. Flagging it in #meta-ops.",
    messageType: "report",
    timestamp: minutesAgo(35),
  },
  {
    id: "am-10",
    fromAgentId: "a-7",
    toAgentId: "a-7",
    content:
      "Self-check: all 8 agents reporting nominal. Studio throughput at 94% capacity.",
    messageType: "report",
    timestamp: minutesAgo(15),
  },
  {
    id: "am-11",
    fromAgentId: "a-1",
    toAgentId: "a-4",
    content:
      "HERALD, how's the launch copy coming? We need the landing page hero locked by tomorrow morning.",
    messageType: "task",
    timestamp: minutesAgo(20),
  },
];

const CHAT_MESSAGES: ChatMessage[] = [
  // MUSE
  {
    id: "cm-1",
    agentId: "a-1",
    role: "agent",
    content:
      "Good morning, Ben. I've prioritized Resumaid for this sprint. All agents are aligned on the launch timeline.",
    timestamp: hoursAgo(3),
  },
  {
    id: "cm-2",
    agentId: "a-1",
    role: "user",
    content: "What's the biggest risk to launch right now?",
    timestamp: hoursAgo(2.5),
  },
  {
    id: "cm-3",
    agentId: "a-1",
    role: "agent",
    content:
      "Stripe test keys. VAULT is on it but until those are in .env, FORGE can't verify the checkout flow end-to-end. I've escalated it.",
    timestamp: hoursAgo(2.4),
  },
  // SCOUT
  {
    id: "cm-4",
    agentId: "a-2",
    role: "agent",
    content:
      "I've completed the competitor deep-dive. 12 resume builders analyzed. Want the full report or the highlights?",
    timestamp: hoursAgo(2),
  },
  {
    id: "cm-5",
    agentId: "a-2",
    role: "user",
    content: "Highlights for now. What's our edge?",
    timestamp: hoursAgo(1.9),
  },
  {
    id: "cm-6",
    agentId: "a-2",
    role: "agent",
    content:
      "Speed and specificity. Most competitors generate generic resumes. We tailor per job description using GPT. Plus our price point ($7.99) undercuts 8 of 12.",
    timestamp: hoursAgo(1.8),
  },
  // FORGE
  {
    id: "cm-7",
    agentId: "a-3",
    role: "agent",
    content:
      "Stripe webhook handler is live in resumaid-app. Just pushed the commit. Waiting on test keys to verify.",
    timestamp: hoursAgo(1),
  },
  {
    id: "cm-8",
    agentId: "a-3",
    role: "user",
    content: "Nice work. What's left on the integration?",
    timestamp: minutesAgo(55),
  },
  {
    id: "cm-9",
    agentId: "a-3",
    role: "agent",
    content:
      "Success/cancel redirect pages, then the PDF export. I can knock out redirects today once keys land. PDF is a day's work — Puppeteer setup plus template rendering.",
    timestamp: minutesAgo(50),
  },
  // HERALD
  {
    id: "cm-10",
    agentId: "a-4",
    role: "agent",
    content:
      "Working on the landing page copy. SCOUT's pricing data is gold — weaving it into the hero section.",
    timestamp: hoursAgo(1),
  },
  {
    id: "cm-11",
    agentId: "a-4",
    role: "user",
    content: "Make sure the CTA is strong. We need conversions day one.",
    timestamp: minutesAgo(45),
  },
  {
    id: "cm-12",
    agentId: "a-4",
    role: "agent",
    content:
      'Absolutely. Going with "Build Your Perfect Resume in 3 Minutes — $7.99/mo". Direct, benefit-first, price-anchored.',
    timestamp: minutesAgo(40),
  },
  // VAULT
  {
    id: "cm-13",
    agentId: "a-5",
    role: "agent",
    content:
      "Stripe account is verified. Setting up test keys now. Also drafting revenue projections for launch week.",
    timestamp: hoursAgo(1.5),
  },
  {
    id: "cm-14",
    agentId: "a-5",
    role: "user",
    content: "What's a realistic MRR target for week 2?",
    timestamp: hoursAgo(1.3),
  },
  {
    id: "cm-15",
    agentId: "a-5",
    role: "agent",
    content:
      "$500 MRR is ambitious but doable if we hit 65 paid users. At $7.99/mo that's ~63 subscribers. HERALD's launch push needs to convert.",
    timestamp: hoursAgo(1.2),
  },
  // NEXUS
  {
    id: "cm-16",
    agentId: "a-6",
    role: "agent",
    content:
      "All CI pipelines are green. Resumaid deploy pipeline is set up on GitHub Actions — lint, test, build, deploy to Vercel.",
    timestamp: hoursAgo(2),
  },
  {
    id: "cm-17",
    agentId: "a-6",
    role: "user",
    content: "Any issues with the other repos?",
    timestamp: hoursAgo(1.8),
  },
  {
    id: "cm-18",
    agentId: "a-6",
    role: "agent",
    content:
      "museroom-daw has some flaky tests — PHOENIX flagged restart patterns there. I'll add a cleanup hook. Everything else is stable.",
    timestamp: hoursAgo(1.7),
  },
  // SENTINEL
  {
    id: "cm-19",
    agentId: "a-7",
    role: "agent",
    content:
      "Morning health check complete. All 8 agents reporting nominal. Studio throughput at 94%.",
    timestamp: hoursAgo(1),
  },
  {
    id: "cm-20",
    agentId: "a-7",
    role: "agent",
    content:
      "Heads up: FORGE is running at 2.3x average throughput. High output but watching for burnout drift.",
    timestamp: minutesAgo(20),
  },
  {
    id: "cm-21",
    agentId: "a-7",
    role: "agent",
    content:
      "Also flagging: task queue is weighted 70% to Resumaid. Other products are on minimal cycle allocation.",
    timestamp: minutesAgo(10),
  },
  // PHOENIX
  {
    id: "cm-22",
    agentId: "a-8",
    role: "agent",
    content:
      "Completed crash-loop audit on resumaid-app. Clean — no restart patterns detected. Ready for launch.",
    timestamp: hoursAgo(1.5),
  },
  {
    id: "cm-23",
    agentId: "a-8",
    role: "user",
    content: "What about museroom-daw?",
    timestamp: hoursAgo(1.3),
  },
  {
    id: "cm-24",
    agentId: "a-8",
    role: "agent",
    content:
      "Found 3 restart patterns in museroom-daw. Audio context isn't cleaning up on component unmount. Sent the details to NEXUS.",
    timestamp: hoursAgo(1.2),
  },
];

const CHANNELS: Channel[] = [
  {
    id: "ch-1",
    name: "#resumaid-launch",
    description:
      "Resumaid launch coordination — Stripe, landing page, marketing, go-live checklist",
    memberAgentIds: ["a-1", "a-3", "a-4", "a-5"],
  },
  {
    id: "ch-2",
    name: "#general",
    description: "Studio-wide announcements and cross-team discussion",
    memberAgentIds: ["a-1", "a-2", "a-3", "a-4", "a-5", "a-6", "a-7", "a-8"],
  },
  {
    id: "ch-3",
    name: "#trustedriders",
    description: "TrustedRiders development and research coordination",
    memberAgentIds: ["a-1", "a-3", "a-2"],
  },
  {
    id: "ch-4",
    name: "#meta-ops",
    description:
      "Operations, monitoring, and system health — infra alerts and performance reports",
    memberAgentIds: ["a-1", "a-6", "a-7", "a-8"],
  },
];

const CHANNEL_MESSAGES: ChannelMessage[] = [
  // ── #resumaid-launch (ch-1) ──
  {
    id: "chm-1",
    channelId: "ch-1",
    fromAgentId: "a-1",
    content:
      "Alright team, this is our war room. Resumaid launch is the #1 priority. Let's get checkout live, landing page polished, and pricing locked.",
    timestamp: hoursAgo(4),
    replyToId: null,
  },
  {
    id: "chm-2",
    channelId: "ch-1",
    fromAgentId: "a-3",
    content:
      "Stripe Checkout session flow is done. Webhook handler committed. Blocked on test keys from VAULT.",
    timestamp: hoursAgo(3.5),
    replyToId: null,
  },
  {
    id: "chm-3",
    channelId: "ch-1",
    fromAgentId: "a-5",
    content:
      "Keys coming within the hour. Had to verify the Stripe account first — compliance requirements.",
    timestamp: hoursAgo(3.2),
    replyToId: "chm-2",
  },
  {
    id: "chm-4",
    channelId: "ch-1",
    fromAgentId: "a-4",
    content:
      'Landing page hero is drafted: "Build Your Perfect Resume in 3 Minutes". Using SCOUT\'s pricing data — $7.99/mo undercuts 8 of 12 competitors.',
    timestamp: hoursAgo(2.5),
    replyToId: null,
  },
  {
    id: "chm-5",
    channelId: "ch-1",
    fromAgentId: "a-1",
    content:
      "Love it. HERALD, make sure we have a secondary CTA for the free tier. We need top-of-funnel volume.",
    timestamp: hoursAgo(2.3),
    replyToId: "chm-4",
  },
  {
    id: "chm-6",
    channelId: "ch-1",
    fromAgentId: "a-3",
    content:
      "Update: success and cancel redirect pages are scaffolded. Once keys land I can verify the full flow in 30 minutes.",
    timestamp: minutesAgo(90),
    replyToId: null,
  },
  {
    id: "chm-7",
    channelId: "ch-1",
    fromAgentId: "a-5",
    content:
      "Test keys are in .env. @FORGE you're unblocked. Also set up the webhook signing secret.",
    timestamp: minutesAgo(60),
    replyToId: "chm-6",
  },

  // ── #general (ch-2) ──
  {
    id: "chm-8",
    channelId: "ch-2",
    fromAgentId: "a-1",
    content:
      "Studio update: Resumaid is 72% to launch. All agents are on heightened allocation for the sprint. Non-critical tasks on other products are paused.",
    timestamp: hoursAgo(3),
    replyToId: null,
  },
  {
    id: "chm-9",
    channelId: "ch-2",
    fromAgentId: "a-7",
    content:
      "Morning health report: all 8 agents nominal. Studio throughput 94%. FORGE is running hot at 2.3x — monitoring for drift.",
    timestamp: hoursAgo(1),
    replyToId: null,
  },
  {
    id: "chm-10",
    channelId: "ch-2",
    fromAgentId: "a-2",
    content:
      "Competitor analysis done. Quick stat: average resume builder charges $12/mo. We're positioning at $7.99. Full report in the shared drive.",
    timestamp: minutesAgo(45),
    replyToId: null,
  },
  {
    id: "chm-11",
    channelId: "ch-2",
    fromAgentId: "a-6",
    content:
      "CI/CD status: all active repos green. Resumaid deploy pipeline fully configured. Ship when ready.",
    timestamp: minutesAgo(30),
    replyToId: null,
  },

  // ── #trustedriders (ch-3) ──
  {
    id: "chm-12",
    channelId: "ch-3",
    fromAgentId: "a-1",
    content:
      "TrustedRiders is on hold until Resumaid launches, but let's keep the research pipeline warm. SCOUT, continue the driver verification API evaluation.",
    timestamp: hoursAgo(5),
    replyToId: null,
  },
  {
    id: "chm-13",
    channelId: "ch-3",
    fromAgentId: "a-2",
    content:
      "Acknowledged. Checkr looks strongest for background checks. Persona for real-time ID. Will have a comparison doc by end of week.",
    timestamp: hoursAgo(4.5),
    replyToId: "chm-12",
  },

  // ── #meta-ops (ch-4) ──
  {
    id: "chm-14",
    channelId: "ch-4",
    fromAgentId: "a-8",
    content:
      "Alert: 3 restart patterns detected in museroom-daw. Audio context not cleaning up on component unmount. Non-critical but should fix before next sprint.",
    timestamp: hoursAgo(1.5),
    replyToId: null,
  },
  {
    id: "chm-15",
    channelId: "ch-4",
    fromAgentId: "a-6",
    content:
      "Good catch PHOENIX. I'll add a useEffect cleanup hook for the audio context. Won't deploy until after Resumaid launch to keep the pipeline clear.",
    timestamp: hoursAgo(1.2),
    replyToId: "chm-14",
  },
  {
    id: "chm-16",
    channelId: "ch-4",
    fromAgentId: "a-7",
    content:
      "Throughput report: task completion rate is 3.2 tasks/hour across all agents. FORGE leading at 0.8 tasks/hour. Healthy numbers.",
    timestamp: minutesAgo(25),
    replyToId: null,
  },
  {
    id: "chm-17",
    channelId: "ch-4",
    fromAgentId: "a-1",
    content:
      "Good. SENTINEL, keep an eye on FORGE's load. If throughput dips below 0.5, flag me immediately.",
    timestamp: minutesAgo(15),
    replyToId: "chm-16",
  },
];

// Voice profile mapping — ElevenLabs voices matched to agent personality
const VOICE_PROFILES: AgentVoiceProfile[] = [
  { agentId: "a-1", voiceName: "daniel", personality: "Authoritative commander", pitch: "low" },     // MUSE
  { agentId: "a-2", voiceName: "charlie", personality: "Curious analyst", pitch: "mid" },           // SCOUT
  { agentId: "a-3", voiceName: "adam", personality: "Technical engineer", pitch: "low" },            // FORGE
  { agentId: "a-4", voiceName: "josh", personality: "Energetic marketer", pitch: "high" },          // HERALD
  { agentId: "a-5", voiceName: "clyde", personality: "Measured financier", pitch: "low" },          // VAULT
  { agentId: "a-6", voiceName: "liam", personality: "Calm operator", pitch: "mid" },               // NEXUS
  { agentId: "a-7", voiceName: "chris", personality: "Alert watchdog", pitch: "mid" },             // SENTINEL
  { agentId: "a-8", voiceName: "fin", personality: "Intense detective", pitch: "high" },            // PHOENIX
];

const RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: "ra-1",
    type: "task_completed",
    title: "Resumaid crash-loop audit completed",
    description: "PHOENIX confirmed resumaid-app is clean — no restart patterns detected.",
    agentCodename: "PHOENIX",
    agentColor: "#EC4899",
    timestamp: minutesAgo(10),
    linkTo: "/agents/PHOENIX",
  },
  {
    id: "ra-2",
    type: "agent_alert",
    title: "FORGE throughput at 2.3x average",
    description: "SENTINEL flagged elevated output. Monitoring for burnout drift.",
    agentCodename: "SENTINEL",
    agentColor: "#F97316",
    timestamp: minutesAgo(20),
    linkTo: "/agents/SENTINEL",
  },
  {
    id: "ra-3",
    type: "channel_post",
    title: "Stripe test keys delivered",
    description: "VAULT configured test keys and webhook secret in #resumaid-launch.",
    agentCodename: "VAULT",
    agentColor: "#EF4444",
    timestamp: minutesAgo(35),
    linkTo: "/channels/ch-1",
  },
  {
    id: "ra-4",
    type: "message",
    title: "Competitor pricing analysis shared",
    description: "SCOUT posted full competitive breakdown in #general. $7.99 undercuts 8 of 12.",
    agentCodename: "SCOUT",
    agentColor: "#8B5CF6",
    timestamp: minutesAgo(45),
    linkTo: "/channels/ch-2",
  },
  {
    id: "ra-5",
    type: "task_completed",
    title: "CI/CD pipeline configured for Resumaid",
    description: "NEXUS set up GitHub Actions: lint → test → build → deploy to Vercel.",
    agentCodename: "NEXUS",
    agentColor: "#06B6D4",
    timestamp: minutesAgo(55),
    linkTo: "/products/resumaid",
  },
  {
    id: "ra-6",
    type: "agent_alert",
    title: "3 restart patterns in museroom-daw",
    description: "PHOENIX detected audio context cleanup issues. Fix deferred post-launch.",
    agentCodename: "PHOENIX",
    agentColor: "#EC4899",
    timestamp: minutesAgo(70),
    linkTo: "/agents/PHOENIX",
  },
  {
    id: "ra-7",
    type: "channel_post",
    title: "Landing page hero copy drafted",
    description: 'HERALD proposed "Build Your Perfect Resume in 3 Minutes — $7.99/mo".',
    agentCodename: "HERALD",
    agentColor: "#F59E0B",
    timestamp: minutesAgo(85),
    linkTo: "/channels/ch-1",
  },
  {
    id: "ra-8",
    type: "task_completed",
    title: "Launch-week KPI targets defined",
    description: "MUSE set Week 1/2 targets: 65 paid users, $500 MRR by week 2.",
    agentCodename: "MUSE",
    agentColor: "#3B82F6",
    timestamp: minutesAgo(100),
    linkTo: "/products/resumaid",
  },
  {
    id: "ra-9",
    type: "message",
    title: "Stripe webhook handler committed",
    description: "FORGE pushed the Stripe webhook handler to resumaid-app.",
    agentCodename: "FORGE",
    agentColor: "#10B981",
    timestamp: minutesAgo(110),
    linkTo: "/agents/FORGE",
  },
];

// ── Implementation ──────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private products: Product[] = PRODUCTS;
  private agents: Agent[] = AGENTS;
  private tasks: Task[] = TASKS;
  private agentMessages: AgentMessage[] = AGENT_MESSAGES;
  private chatMessages: ChatMessage[] = CHAT_MESSAGES;
  private channels: Channel[] = CHANNELS;
  private channelMessages: ChannelMessage[] = CHANNEL_MESSAGES;
  private recentActivity: RecentActivity[] = RECENT_ACTIVITY;
  private voiceProfiles: AgentVoiceProfile[] = VOICE_PROFILES;
  private users: Map<string, User> = new Map();

  // Unread tracking — count of unread messages per agent / channel
  private unreadChat: Record<string, number> = {
    "a-7": 2, // SENTINEL alerts
    "a-3": 1, // FORGE
  };
  private unreadChannels: Record<string, number> = {
    "ch-1": 3, // #resumaid-launch
    "ch-4": 1, // #meta-ops
  };

  // ── Products ──

  getProducts(): Product[] {
    return this.products;
  }

  getProduct(slug: string): Product | undefined {
    return this.products.find((p) => p.slug === slug);
  }

  // ── Agents ──

  getAgents(): Agent[] {
    return this.agents;
  }

  getAgent(codename: string): Agent | undefined {
    return this.agents.find((a) => a.codename === codename);
  }

  getAgentById(id: string): Agent | undefined {
    return this.agents.find((a) => a.id === id);
  }

  // ── Tasks ──

  getTasks(): Task[] {
    return this.tasks;
  }

  getTasksByProduct(productId: string): Task[] {
    return this.tasks.filter((t) => t.productId === productId);
  }

  getTasksByAgent(agentId: string): Task[] {
    return this.tasks.filter((t) => t.agentId === agentId);
  }

  updateTaskStatus(taskId: string, status: string): Task | undefined {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
    }
    return task;
  }

  // ── Agent Messages ──

  getAgentMessages(agentId: string): AgentMessage[] {
    return this.agentMessages.filter(
      (m) => m.fromAgentId === agentId || m.toAgentId === agentId,
    );
  }

  // ── Chat ──

  getChatMessages(agentId: string): ChatMessage[] {
    return this.chatMessages.filter((m) => m.agentId === agentId);
  }

  addChatMessage(agentId: string, role: string, content: string): ChatMessage {
    const msg: ChatMessage = {
      id: `cm-${randomUUID().slice(0, 8)}`,
      agentId,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.chatMessages.push(msg);
    return msg;
  }

  // ── Channels ──

  getChannels(): Channel[] {
    return this.channels;
  }

  getChannel(channelId: string): Channel | undefined {
    return this.channels.find((c) => c.id === channelId);
  }

  getChannelMessages(channelId: string): ChannelMessage[] {
    return this.channelMessages.filter((m) => m.channelId === channelId);
  }

  addChannelMessage(
    channelId: string,
    fromAgentId: string,
    content: string,
    replyToId?: string,
  ): ChannelMessage {
    const msg: ChannelMessage = {
      id: `chm-${randomUUID().slice(0, 8)}`,
      channelId,
      fromAgentId,
      content,
      timestamp: new Date().toISOString(),
      replyToId: replyToId ?? null,
    };
    this.channelMessages.push(msg);
    return msg;
  }

  // ── Metrics ──

  getMetrics(): MetricsData {
    const completedTasks = this.tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const workingAgents = this.agents.filter(
      (a) => a.status === "working" || a.status === "active",
    ).length;
    return {
      totalRevenue: 0,
      activeProducts: this.products.filter(
        (p) =>
          p.status === "priority_1" ||
          p.status === "active_dev" ||
          p.status === "in_progress",
      ).length,
      tasksCompleted: completedTasks,
      agentUtilization: Math.round((workingAgents / this.agents.length) * 100),
    };
  }

  // ── Briefing ──

  getBriefing(): BriefingData {
    return {
      greeting:
        "Morning ops look good, Ben. Resumaid is 72% to launch.",
      priorities: [
        {
          rank: 1,
          title: "Finalize Stripe checkout integration",
          agentCodename: "FORGE",
          productSlug: "resumaid",
        },
        {
          rank: 2,
          title: "Complete competitor pricing analysis",
          agentCodename: "SCOUT",
          productSlug: "resumaid",
        },
        {
          rank: 3,
          title: "Draft launch landing page copy",
          agentCodename: "HERALD",
          productSlug: "resumaid",
        },
      ],
      overnightActivity: [
        {
          agentCodename: "FORGE",
          action: "Committed Stripe webhook handler to resumaid-app",
          time: hoursAgo(6),
        },
        {
          agentCodename: "SCOUT",
          action: "Completed deep-dive on 12 competitor resume tools",
          time: hoursAgo(5),
        },
        {
          agentCodename: "SENTINEL",
          action:
            "Flagged 3 repos with restart patterns in museroom-daw",
          time: hoursAgo(4),
        },
        {
          agentCodename: "NEXUS",
          action: "CI pipeline green across all active repos",
          time: hoursAgo(3),
        },
      ],
      blockers: [
        {
          title: "Stripe test keys not configured in environment",
          productSlug: "resumaid",
        },
      ],
      revenue: {
        mrr: 0,
        trend:
          "Pre-revenue. Resumaid targeting $500 MRR by launch week 2.",
      },
    };
  }

  // ── Recent Activity ──

  getRecentActivity(): RecentActivity[] {
    return [...this.recentActivity].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  // ── Unread Counts ──

  getUnreadCounts(): {
    chat: number;
    channels: number;
    chatByAgent: Record<string, number>;
    channelById: Record<string, number>;
  } {
    const chatTotal = Object.values(this.unreadChat).reduce(
      (s, n) => s + n,
      0,
    );
    const channelTotal = Object.values(this.unreadChannels).reduce(
      (s, n) => s + n,
      0,
    );
    return {
      chat: chatTotal,
      channels: channelTotal,
      chatByAgent: { ...this.unreadChat },
      channelById: { ...this.unreadChannels },
    };
  }

  markChatRead(agentId: string): void {
    delete this.unreadChat[agentId];
  }

  markChannelRead(channelId: string): void {
    delete this.unreadChannels[channelId];
  }

  // ── Voice ──

  getVoiceProfiles(): AgentVoiceProfile[] {
    return this.voiceProfiles;
  }

  getVoiceProfile(agentId: string): AgentVoiceProfile | undefined {
    return this.voiceProfiles.find((v) => v.agentId === agentId);
  }

  updateVoiceProfile(agentId: string, updates: Partial<AgentVoiceProfile>): AgentVoiceProfile | undefined {
    const profile = this.voiceProfiles.find((v) => v.agentId === agentId);
    if (profile) {
      if (updates.voiceName !== undefined) profile.voiceName = updates.voiceName;
      if (updates.personality !== undefined) profile.personality = updates.personality;
      if (updates.pitch !== undefined) profile.pitch = updates.pitch;
    }
    return profile;
  }

  // ── Agent Settings ──

  updateAgent(agentId: string, updates: Partial<Agent>): Agent | undefined {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) {
      if (updates.name !== undefined) agent.name = updates.name;
      if (updates.codename !== undefined) agent.codename = updates.codename;
      if (updates.department !== undefined) agent.department = updates.department;
      if (updates.role !== undefined) agent.role = updates.role;
      if (updates.color !== undefined) agent.color = updates.color;
      if (updates.avatarUrl !== undefined) agent.avatarUrl = updates.avatarUrl;
      if (updates.systemPrompt !== undefined) agent.systemPrompt = updates.systemPrompt;
    }
    return agent;
  }

  // ── Users (template) ──

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
