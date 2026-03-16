import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { AgentVoiceProfile } from "@shared/schema";

// ── Contextual agent response generator ─────────────────────────────

const AGENT_RESPONSE_TEMPLATES: Record<
  string,
  (userMessage: string) => string
> = {
  MUSE: (msg) => {
    if (msg.toLowerCase().includes("status") || msg.toLowerCase().includes("update"))
      return "All systems are nominal. Resumaid sprint is on track — FORGE is finishing Stripe, HERALD has the copy locked, VAULT delivered the keys. We're at 72% to launch.";
    if (msg.toLowerCase().includes("priorit"))
      return "Resumaid remains Priority 1. I've allocated 70% of studio capacity to it. Once checkout is live, we shift focus to landing page polish and launch-day marketing.";
    if (msg.toLowerCase().includes("block"))
      return "The main blocker was Stripe test keys — VAULT resolved that. Next risk is PDF export timeline. FORGE estimates one full day. I'm watching it closely.";
    return "Acknowledged. I'm coordinating across all agents to keep the sprint tight. Let me know if you want me to reprioritize anything or pull an agent onto a different task.";
  },
  SCOUT: (msg) => {
    if (msg.toLowerCase().includes("competitor") || msg.toLowerCase().includes("research"))
      return "I've analyzed 12 competitor resume builders in depth. Key finding: most charge $9–15/mo with generic output. Our GPT-tailored approach at $7.99 gives us a clear positioning edge. Want me to dig deeper into any specific competitor?";
    if (msg.toLowerCase().includes("market") || msg.toLowerCase().includes("trend"))
      return "The resume builder market is growing 18% YoY. AI-powered tools are capturing share from traditional templates. The window for differentiation is now — within 12 months every tool will have AI.";
    if (msg.toLowerCase().includes("trustedriders") || msg.toLowerCase().includes("rider"))
      return "For TrustedRiders, I'm evaluating Checkr and Persona for driver verification. Checkr is strongest for background checks, Persona for real-time ID. I'll have a full comparison by end of week.";
    return "I can run a deep-dive on anything you need — competitors, market sizing, tech trends, or user behavior patterns. Just point me in a direction.";
  },
  FORGE: (msg) => {
    if (msg.toLowerCase().includes("stripe") || msg.toLowerCase().includes("payment"))
      return "Stripe integration status: Checkout session flow is done, webhook handler is committed and tested. Success/cancel redirects are scaffolded. Now that VAULT dropped the test keys, I can verify the full end-to-end flow.";
    if (msg.toLowerCase().includes("pdf") || msg.toLowerCase().includes("export"))
      return "PDF export is next on my list. Plan: Puppeteer for server-side rendering, support for 3 resume templates initially. I estimate one solid day of work. Want me to start on it now or finish verifying Stripe first?";
    if (msg.toLowerCase().includes("deploy") || msg.toLowerCase().includes("ship"))
      return "NEXUS has the deploy pipeline ready — GitHub Actions to Vercel on main merge. Once I verify Stripe checkout end-to-end, we can ship the payment flow today.";
    return "I'm heads-down on Resumaid engineering. The codebase is solid — clean architecture, good test coverage. What do you need me to build next?";
  },
  HERALD: (msg) => {
    if (msg.toLowerCase().includes("copy") || msg.toLowerCase().includes("landing"))
      return 'The landing page hero is locked: "Build Your Perfect Resume in 3 Minutes — $7.99/mo". I\'m now working on feature blocks and the social proof section. Want to see a draft?';
    if (msg.toLowerCase().includes("launch") || msg.toLowerCase().includes("market"))
      return "Launch strategy: Day 1 push on Twitter, LinkedIn, and Product Hunt. I've drafted 12 tweet variations and a LinkedIn launch post. SCOUT's pricing data is the hook — we undercut everyone.";
    if (msg.toLowerCase().includes("brand") || msg.toLowerCase().includes("voice"))
      return "Resumaid's brand voice: confident, direct, benefit-first. No fluff. The target user is a job seeker who's frustrated with generic templates and wants something that actually works.";
    return "I'm all over the growth side. Copy, campaigns, launch strategy — you name it. What angle do you want me to focus on?";
  },
  VAULT: (msg) => {
    if (msg.toLowerCase().includes("stripe") || msg.toLowerCase().includes("key"))
      return "Stripe test keys are configured in .env along with the webhook signing secret. The account is fully verified. FORGE is unblocked. I'm also setting up the revenue dashboard for launch-day tracking.";
    if (msg.toLowerCase().includes("revenue") || msg.toLowerCase().includes("mrr") || msg.toLowerCase().includes("money"))
      return "Projection: $500 MRR by launch week 2 requires ~63 subscribers at $7.99/mo. Aggressive but achievable if HERALD's launch push converts at 3%+. I've built a real-time MRR tracker that hooks into Stripe webhooks.";
    if (msg.toLowerCase().includes("pricing") || msg.toLowerCase().includes("price"))
      return "$7.99/mo positions us below 8 of 12 competitors. I've modeled three tiers: Free (2 resumes/mo), Pro ($7.99, unlimited), and Team ($19.99, collaboration). Recommend launching with just Free and Pro to keep it simple.";
    return "Finance and revenue ops are my domain. Stripe config, pricing models, projections, MRR tracking — what do you need?";
  },
  NEXUS: (msg) => {
    if (msg.toLowerCase().includes("ci") || msg.toLowerCase().includes("pipeline") || msg.toLowerCase().includes("deploy"))
      return "All CI pipelines are green. Resumaid: GitHub Actions → lint → test → build → deploy to Vercel on main merge. The pipeline runs in ~2 minutes. We can ship anytime.";
    if (msg.toLowerCase().includes("museroom") || msg.toLowerCase().includes("restart"))
      return "PHOENIX flagged restart patterns in museroom-daw — audio context cleanup issue. I've got a fix ready (useEffect cleanup hook) but holding the deploy until after Resumaid launch to keep the pipeline clear.";
    if (msg.toLowerCase().includes("infra") || msg.toLowerCase().includes("monitor"))
      return "Infrastructure is stable across all repos. I'm monitoring deploy frequency, build times, and error rates. No anomalies. SENTINEL and I are keeping a close watch during the sprint.";
    return "DevOps is running smooth. Pipelines green, deploys fast, infrastructure stable. Need me to set up anything new?";
  },
  SENTINEL: (msg) => {
    if (msg.toLowerCase().includes("health") || msg.toLowerCase().includes("status"))
      return "Health check: all 8 agents reporting nominal. Studio throughput at 94% capacity. Task completion rate is 3.2 tasks/hour. No anomalies detected in the last 6 hours.";
    if (msg.toLowerCase().includes("forge") || msg.toLowerCase().includes("burnout"))
      return "FORGE is at 2.3x average throughput — highest in the studio. Output quality is still high, no error rate increase. I'm watching for burnout drift patterns. If throughput dips below 0.5, I'll flag immediately.";
    if (msg.toLowerCase().includes("alert") || msg.toLowerCase().includes("issue"))
      return "Active alerts: 1 — FORGE elevated throughput (monitoring, not critical). Resolved alerts: museroom-daw restart patterns (PHOENIX flagged, NEXUS has fix). No critical issues.";
    return "I'm monitoring all agent throughput, task completion rates, and system health. Everything is nominal. I'll flag any anomalies the moment they appear.";
  },
  PHOENIX: (msg) => {
    if (msg.toLowerCase().includes("resumaid") || msg.toLowerCase().includes("crash"))
      return "Resumaid-app is clean. I ran a full crash-loop audit — no restart patterns, no memory leaks, no unhandled promise rejections. It's launch-ready from a stability perspective.";
    if (msg.toLowerCase().includes("museroom") || msg.toLowerCase().includes("restart"))
      return "museroom-daw has 3 restart patterns. Root cause: AudioContext isn't being cleaned up on component unmount. The audio worklet keeps running after navigation, eventually hitting the browser's audio context limit and forcing a restart.";
    if (msg.toLowerCase().includes("scan") || msg.toLowerCase().includes("audit"))
      return "I can audit any repo for stability issues — crash loops, restart patterns, memory leaks, unhandled errors. Point me at a repo and I'll have results within the hour.";
    return "Stability and resilience are my focus. I scan for crash loops, restart patterns, and reliability issues across all repos. Resumaid is clean, museroom needs a fix. What else do you want me to check?";
  },
};

function generateAgentResponse(codename: string, userMessage: string): string {
  const generator = AGENT_RESPONSE_TEMPLATES[codename];
  if (generator) {
    return generator(userMessage);
  }
  return "Acknowledged. I'm processing your request and will follow up shortly.";
}

// ── Routes ──────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // ── Products ──

  app.get("/api/products", (_req, res) => {
    res.json(storage.getProducts());
  });

  app.get("/api/products/:slug", (req, res) => {
    const product = storage.getProduct(req.params.slug);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const tasks = storage.getTasksByProduct(product.id);

    // Collect agents assigned to this product's tasks
    const agentIds = Array.from(new Set(tasks.map((t) => t.agentId)));
    const agents = agentIds
      .map((id) => storage.getAgentById(id))
      .filter(Boolean);

    res.json({ ...product, tasks, agents });
  });

  // ── Agents ──

  app.get("/api/agents", (_req, res) => {
    res.json(storage.getAgents());
  });

  app.get("/api/agents/:codename", (req, res) => {
    const agent = storage.getAgent(req.params.codename);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const tasks = storage.getTasksByAgent(agent.id);
    const messages = storage.getAgentMessages(agent.id);

    res.json({ ...agent, tasks, messages });
  });

  // ── Tasks ──

  app.get("/api/tasks", (_req, res) => {
    res.json(storage.getTasks());
  });

  app.patch("/api/tasks/:id/status", (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const task = storage.updateTaskStatus(req.params.id, status);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  });

  // ── Metrics ──

  app.get("/api/metrics", (_req, res) => {
    res.json(storage.getMetrics());
  });

  // ── Briefing ──

  app.get("/api/briefing", (_req, res) => {
    res.json(storage.getBriefing());
  });

  // ── Recent Activity ──

  app.get("/api/recent-activity", (_req, res) => {
    res.json(storage.getRecentActivity());
  });

  // ── Unread Counts ──

  app.get("/api/unread", (_req, res) => {
    res.json(storage.getUnreadCounts());
  });

  app.post("/api/unread/chat/:agentId/read", (req, res) => {
    storage.markChatRead(req.params.agentId);
    res.json({ success: true });
  });

  app.post("/api/unread/channel/:channelId/read", (req, res) => {
    storage.markChannelRead(req.params.channelId);
    res.json({ success: true });
  });

  // ── Chat ──

  app.get("/api/chat/:agentId", (req, res) => {
    const messages = storage.getChatMessages(req.params.agentId);
    res.json(messages);
  });

  app.post("/api/chat/:agentId", (req, res) => {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const agentId = req.params.agentId;
    const agent = storage.getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Save user message
    const userMsg = storage.addChatMessage(agentId, "user", content);

    // Generate contextual agent response
    const responseText = generateAgentResponse(agent.codename, content);
    const agentMsg = storage.addChatMessage(agentId, "agent", responseText);

    res.json({ userMessage: userMsg, agentMessage: agentMsg });
  });

  // ── Channels ──

  app.get("/api/channels", (_req, res) => {
    const channels = storage.getChannels();

    const enriched = channels.map((ch) => {
      const messages = storage.getChannelMessages(ch.id);
      const lastMessage = messages.length
        ? messages[messages.length - 1]
        : null;

      const members = ch.memberAgentIds
        .map((id) => {
          const agent = storage.getAgentById(id);
          return agent
            ? { id: agent.id, codename: agent.codename, color: agent.color }
            : null;
        })
        .filter(Boolean);

      return {
        ...ch,
        messageCount: messages.length,
        lastMessage,
        members,
      };
    });

    res.json(enriched);
  });

  app.get("/api/channels/:channelId", (req, res) => {
    const channel = storage.getChannel(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const messages = storage.getChannelMessages(channel.id);

    const members = channel.memberAgentIds
      .map((id) => {
        const agent = storage.getAgentById(id);
        return agent
          ? {
              id: agent.id,
              codename: agent.codename,
              color: agent.color,
              name: agent.name,
            }
          : null;
      })
      .filter(Boolean);

    res.json({ ...channel, messages, members });
  });

  app.post("/api/channels/:channelId", (req, res) => {
    const { content, replyToId } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const channel = storage.getChannel(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    // User posts as "user-ben"
    const message = storage.addChannelMessage(
      channel.id,
      "user-ben",
      content,
      replyToId,
    );

    res.json(message);
  });

  // ── Agent Settings (edit name, avatar, voice, system prompt) ──

  app.patch("/api/agents/:id/settings", (req, res) => {
    const agentId = req.params.id;
    const { name, codename, department, role, color, avatarUrl, systemPrompt, voiceName, voicePersonality, voicePitch } = req.body;

    // Update agent fields
    const agent = storage.updateAgent(agentId, {
      ...(name !== undefined && { name }),
      ...(codename !== undefined && { codename }),
      ...(department !== undefined && { department }),
      ...(role !== undefined && { role }),
      ...(color !== undefined && { color }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(systemPrompt !== undefined && { systemPrompt }),
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Update voice profile if voice fields provided
    if (voiceName !== undefined || voicePersonality !== undefined || voicePitch !== undefined) {
      storage.updateVoiceProfile(agentId, {
        ...(voiceName !== undefined && { voiceName }),
        ...(voicePersonality !== undefined && { personality: voicePersonality }),
        ...(voicePitch !== undefined && { pitch: voicePitch }),
      });
    }

    const voiceProfile = storage.getVoiceProfile(agentId);

    res.json({
      ...agent,
      voice: voiceProfile ?? null,
    });
  });

  // ── Voice Profiles ──

  app.get("/api/voice/profiles", (_req, res) => {
    const profiles = storage.getVoiceProfiles();
    const agents = storage.getAgents();
    const enriched = profiles.map((p: AgentVoiceProfile) => {
      const agent = storage.getAgentById(p.agentId);
      return {
        ...p,
        codename: agent?.codename ?? "UNKNOWN",
        color: agent?.color ?? "#666",
        name: agent?.name ?? "Unknown Agent",
        department: agent?.department ?? "",
      };
    });
    res.json(enriched);
  });

  app.get("/api/voice/profiles/:agentId", (req, res) => {
    const profile = storage.getVoiceProfile(req.params.agentId);
    if (!profile) {
      return res.status(404).json({ message: "Voice profile not found" });
    }
    const agent = storage.getAgentById(req.params.agentId);
    res.json({
      ...profile,
      codename: agent?.codename ?? "UNKNOWN",
      color: agent?.color ?? "#666",
      name: agent?.name ?? "Unknown Agent",
      department: agent?.department ?? "",
    });
  });

  // ── Voice TTS (generates agent speech) ──

  app.post("/api/voice/speak", async (req, res) => {
    const { agentId, text } = req.body;
    if (!agentId || !text) {
      return res.status(400).json({ message: "agentId and text are required" });
    }

    const profile = storage.getVoiceProfile(agentId);
    if (!profile) {
      return res.status(404).json({ message: "Voice profile not found" });
    }

    try {
      // Use the sandbox audio generation API
      const { generateAudio } = await import("./audio-gen.js");
      const audioBase64 = await generateAudio(text, profile.voiceName);
      res.json({ audio: audioBase64, voice: profile.voiceName });
    } catch (err: any) {
      console.error("TTS error:", err.message);
      // Return a mock response so the UI works even without API keys
      res.json({ audio: null, voice: profile.voiceName, error: "TTS unavailable — using text fallback" });
    }
  });

  // ── Voice Chat (send message + get spoken response) ──

  app.post("/api/voice/chat", async (req, res) => {
    const { agentId, userMessage } = req.body;
    if (!agentId || !userMessage) {
      return res.status(400).json({ message: "agentId and userMessage are required" });
    }

    const agent = storage.getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const profile = storage.getVoiceProfile(agentId);

    // Generate contextual text response
    const responseText = generateAgentResponse(agent.codename, userMessage);

    // Try to generate audio
    let audioBase64: string | null = null;
    try {
      const { generateAudio } = await import("./audio-gen.js");
      audioBase64 = await generateAudio(responseText, profile?.voiceName ?? "daniel");
    } catch (err: any) {
      console.error("Voice chat TTS error:", err.message);
    }

    res.json({
      agentId,
      codename: agent.codename,
      responseText,
      audio: audioBase64,
      voice: profile?.voiceName ?? "daniel",
      timestamp: new Date().toISOString(),
    });
  });

  // ── Group Voice Chat (multiple agents respond) ──

  app.post("/api/voice/group-chat", async (req, res) => {
    const { agentIds, userMessage, topic } = req.body;
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ message: "agentIds array is required" });
    }

    const results: any[] = [];

    for (const agentId of agentIds) {
      const agent = storage.getAgentById(agentId);
      if (!agent) continue;

      const profile = storage.getVoiceProfile(agentId);
      const responseText = generateAgentResponse(agent.codename, userMessage || topic || "update");

      let audioBase64: string | null = null;
      try {
        const { generateAudio } = await import("./audio-gen.js");
        audioBase64 = await generateAudio(responseText, profile?.voiceName ?? "daniel");
      } catch (err: any) {
        console.error(`Group TTS error for ${agent.codename}:`, err.message);
      }

      results.push({
        agentId,
        codename: agent.codename,
        color: agent.color,
        responseText,
        audio: audioBase64,
        voice: profile?.voiceName ?? "daniel",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ responses: results });
  });

  return httpServer;
}
