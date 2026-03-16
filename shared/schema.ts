import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Domain types (in-memory, no DB tables) ──────────────────────────

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string; // priority_1, active_dev, in_progress, early_stage, concept, long_term
  accentColor: string;
  bgColor: string;
  fontFamily: string;
  revenue: number;
  repos: string[];
  lastActivity: string;
};

export type Agent = {
  id: string;
  codename: string;
  name: string;
  department: string;
  role: string;
  status: string; // working, active, idle
  color: string;
  currentTask: string;
  tasksCompleted: number;
  lastActive: string;
  // Editable settings
  avatarUrl: string | null; // custom avatar image URL, null = use initial
  systemPrompt: string; // personality/behavior prompt
};

export type Task = {
  id: string;
  productId: string;
  agentId: string;
  title: string;
  description: string;
  status: string; // pending, in_progress, completed, blocked
  priority: string; // critical, high, medium, low
  createdAt: string;
};

export type AgentMessage = {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  messageType: string; // task, alert, report, request
  timestamp: string;
};

export type ChatMessage = {
  id: string;
  agentId: string;
  role: string; // user, agent
  content: string;
  timestamp: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  memberAgentIds: string[];
};

export type ChannelMessage = {
  id: string;
  channelId: string;
  fromAgentId: string;
  content: string;
  timestamp: string;
  replyToId: string | null;
};

export type MetricsData = {
  totalRevenue: number;
  activeProducts: number;
  tasksCompleted: number;
  agentUtilization: number;
};

export type BriefingPriority = {
  rank: number;
  title: string;
  agentCodename: string;
  productSlug: string;
};

export type BriefingActivity = {
  agentCodename: string;
  action: string;
  time: string;
};

export type BriefingBlocker = {
  title: string;
  productSlug: string;
};

export type BriefingData = {
  greeting: string;
  priorities: BriefingPriority[];
  overnightActivity: BriefingActivity[];
  blockers: BriefingBlocker[];
  revenue: { mrr: number; trend: string };
};

export type RecentActivity = {
  id: string;
  type: string; // task_completed, agent_alert, message, channel_post
  title: string;
  description: string;
  agentCodename: string;
  agentColor: string;
  timestamp: string;
  linkTo: string; // route to navigate to
};

// ── Voice Chat types ────────────────────────────────────────────────

export type AgentVoiceProfile = {
  agentId: string;
  voiceName: string; // ElevenLabs voice name
  personality: string; // description for display
  pitch: string; // low, mid, high — visual indicator
};

export type AgentSettings = {
  name: string;
  codename: string;
  department: string;
  role: string;
  color: string;
  avatarUrl: string | null;
  systemPrompt: string;
  voiceName: string;
  voicePersonality: string;
  voicePitch: string;
};

// Available ElevenLabs voices for the voice picker
export const AVAILABLE_VOICES = [
  { name: "daniel", label: "Daniel", gender: "male", style: "Authoritative, deep" },
  { name: "adam", label: "Adam", gender: "male", style: "Deep, narration" },
  { name: "charlie", label: "Charlie", gender: "male", style: "Casual, conversational" },
  { name: "josh", label: "Josh", gender: "male", style: "Young, energetic" },
  { name: "clyde", label: "Clyde", gender: "male", style: "War veteran, gruff" },
  { name: "liam", label: "Liam", gender: "male", style: "Young, friendly" },
  { name: "chris", label: "Chris", gender: "male", style: "Casual, mid-range" },
  { name: "fin", label: "Fin", gender: "male", style: "Irish, bold" },
  { name: "brian", label: "Brian", gender: "male", style: "Narration, deep" },
  { name: "bill", label: "Bill", gender: "male", style: "Trustworthy, calm" },
  { name: "george", label: "George", gender: "male", style: "British, warm" },
  { name: "james", label: "James", gender: "male", style: "Australian, calm" },
  { name: "rachel", label: "Rachel", gender: "female", style: "Calm, professional" },
  { name: "alice", label: "Alice", gender: "female", style: "British, confident" },
  { name: "charlotte", label: "Charlotte", gender: "female", style: "Seductive, calm" },
  { name: "emily", label: "Emily", gender: "female", style: "Calm, gentle" },
  { name: "lily", label: "Lily", gender: "female", style: "British, narration" },
  { name: "sarah", label: "Sarah", gender: "female", style: "Soft, news" },
  { name: "freya", label: "Freya", gender: "female", style: "Overdriven, expressive" },
  { name: "matilda", label: "Matilda", gender: "female", style: "Warm, friendly" },
];

export type VoiceCallState = {
  callId: string;
  type: 'individual' | 'group';
  status: 'ringing' | 'connected' | 'ended';
  agentIds: string[];
  startedAt: string;
  transcript: VoiceTranscriptEntry[];
};

export type VoiceTranscriptEntry = {
  id: string;
  speaker: string; // 'user' or agent codename
  text: string;
  timestamp: string;
};

export type GroupCallParticipant = {
  agentId: string;
  codename: string;
  color: string;
  voiceName: string;
  isSpeaking: boolean;
  hasRaisedHand: boolean;
};

// ── Users table (kept from template for Drizzle config) ─────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
