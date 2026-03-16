import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { AVAILABLE_VOICES } from "@shared/schema";
import type { Agent, AgentMessage, AgentVoiceProfile, Task } from "@shared/schema";
import {
  ArrowLeft,
  Save,
  Volume2,
  User,
  Mic,
  Brain,
  Palette,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// ── Types ───────────────────────────────────────────────────────────

type AgentDetail = Agent & { tasks: Task[]; messages: AgentMessage[] };

type VoiceProfile = AgentVoiceProfile & {
  codename: string;
  color: string;
  name: string;
  department: string;
};

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function SettingsSkeleton() {
  return (
    <div className="px-6 py-8 space-y-8 max-w-4xl mx-auto" data-testid="settings-skeleton">
      <SkeletonBlock className="h-4 w-40" />
      <div className="flex items-center gap-4">
        <SkeletonBlock className="w-24 h-24 rounded-full" />
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-9 w-full" />
        </div>
      </div>
      <SkeletonBlock className="h-40" />
      <div className="grid grid-cols-4 gap-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function AgentSettings() {
  const params = useParams<{ codename: string }>();
  const codename = params.codename ?? "";
  const { toast } = useToast();

  // ── Queries ──

  const { data: agent, isLoading: loadingAgent } = useQuery<AgentDetail>({
    queryKey: ["/api/agents", codename],
  });

  const { data: voiceProfile, isLoading: loadingVoice } = useQuery<VoiceProfile>({
    queryKey: ["/api/voice/profiles", agent?.id ?? ""],
    enabled: !!agent?.id,
  });

  // ── Form State ──

  const [name, setName] = useState("");
  const [codenameField, setCodenameField] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [color, setColor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [voicePersonality, setVoicePersonality] = useState("");
  const [voicePitch, setVoicePitch] = useState("mid");

  // Pre-populate form when data loads
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setCodenameField(agent.codename);
      setDepartment(agent.department);
      setRole(agent.role);
      setColor(agent.color);
      setAvatarUrl(agent.avatarUrl ?? "");
      setSystemPrompt(agent.systemPrompt);
    }
  }, [agent]);

  useEffect(() => {
    if (voiceProfile) {
      setVoiceName(voiceProfile.voiceName);
      setVoicePersonality(voiceProfile.personality);
      setVoicePitch(voiceProfile.pitch);
    }
  }, [voiceProfile]);

  // ── Change Detection ──

  const hasChanges = agent
    ? name !== agent.name ||
      codenameField !== agent.codename ||
      department !== agent.department ||
      role !== agent.role ||
      color !== agent.color ||
      avatarUrl !== (agent.avatarUrl ?? "") ||
      systemPrompt !== agent.systemPrompt ||
      voiceName !== (voiceProfile?.voiceName ?? "") ||
      voicePersonality !== (voiceProfile?.personality ?? "") ||
      voicePitch !== (voiceProfile?.pitch ?? "mid")
    : false;

  // ── Save Mutation ──

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/agents/${agent!.id}/settings`, {
        name,
        codename: codenameField,
        department,
        role,
        color,
        avatarUrl: avatarUrl || null,
        systemPrompt,
        voiceName,
        voicePersonality,
        voicePitch,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", codename] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/voice/profiles"] });
      toast({
        title: "Settings saved",
        description: `${codenameField}'s configuration has been updated.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── Loading ──

  if (loadingAgent || loadingVoice || !agent) return <SettingsSkeleton />;

  const selectedVoice = AVAILABLE_VOICES.find((v) => v.name === voiceName);

  return (
    <div className="min-h-screen pb-24" data-testid="agent-settings">
      <div className="px-6 py-8 space-y-8 max-w-4xl mx-auto">
        {/* ── Back Link ──────────────────────────────────────── */}
        <Link href={`/agents/${codename}`}>
          <span
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            data-testid="back-to-agent"
          >
            <ArrowLeft size={14} />
            Back to {codename}
          </span>
        </Link>

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: color || agent.color }}
          >
            {codenameField.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {codenameField} Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure identity, personality, and voice
            </p>
          </div>
        </div>

        {/* ── Section 1: Identity ─────────────────────────────── */}
        <div
          className="bg-card border border-card-border rounded-lg p-6"
          data-testid="section-identity"
        >
          <SectionHeader
            icon={User}
            title="Identity"
            subtitle="How the agent appears across the system"
          />

          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: color || agent.color }}
                data-testid="settings-avatar"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={codenameField}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  codenameField.slice(0, 2)
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">96 × 96</span>
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Agent name"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Codename
                  </label>
                  <Input
                    value={codenameField}
                    onChange={(e) => setCodenameField(e.target.value.toUpperCase())}
                    placeholder="CODENAME"
                    className="uppercase font-mono"
                    data-testid="input-codename"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Department
                  </label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department"
                    data-testid="input-department"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Role
                  </label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Role description"
                    data-testid="input-role"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    <Palette size={12} className="inline mr-1" />
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-md border border-card-border shrink-0 cursor-pointer"
                      style={{ backgroundColor: color }}
                      data-testid="color-swatch"
                    />
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#3B82F6"
                      className="font-mono text-xs"
                      data-testid="input-color"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Avatar URL
                  </label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://... (optional)"
                    className="text-xs"
                    data-testid="input-avatar-url"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Personality & Behavior ───────────────── */}
        <div
          className="bg-card border border-card-border rounded-lg p-6"
          data-testid="section-personality"
        >
          <SectionHeader
            icon={Brain}
            title="Personality & Behavior"
            subtitle="Define how the agent thinks, speaks, and responds"
          />

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                System Prompt
              </label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are an AI agent that..."
                rows={6}
                className="font-mono text-xs leading-relaxed"
                data-testid="input-system-prompt"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                This defines how the agent thinks, speaks, and behaves in all interactions.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Role Description
              </label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Primary role and responsibilities"
                data-testid="input-role-desc"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Voice Configuration ──────────────────── */}
        <div
          className="bg-card border border-card-border rounded-lg p-6"
          data-testid="section-voice"
        >
          <SectionHeader
            icon={Mic}
            title="Voice Configuration"
            subtitle="Choose how the agent sounds in voice calls"
          />

          {/* Voice Grid */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
            data-testid="voice-grid"
          >
            {AVAILABLE_VOICES.map((voice) => {
              const isSelected = voiceName === voice.name;
              return (
                <button
                  key={voice.name}
                  onClick={() => setVoiceName(voice.name)}
                  className={`relative text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-2 bg-card shadow-lg"
                      : "border-card-border bg-card/50 hover:bg-card hover:border-muted-foreground/30"
                  }`}
                  style={
                    isSelected
                      ? { borderColor: color || agent.color }
                      : undefined
                  }
                  data-testid={`voice-card-${voice.name}`}
                >
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: color || agent.color }}
                    >
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      {voice.label}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        voice.gender === "male"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-pink-500/15 text-pink-400"
                      }`}
                    >
                      {voice.gender === "male" ? "M" : "F"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {voice.style}
                  </p>

                  {/* Preview Voice button on selected card */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({
                          title: "Voice preview coming soon",
                          description: `Preview for "${voice.label}" is not yet available.`,
                        });
                      }}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors text-foreground"
                      data-testid="btn-preview-voice"
                    >
                      <Volume2 size={10} />
                      Preview Voice
                    </button>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pitch Selector */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Pitch
            </label>
            <div className="flex gap-2" data-testid="pitch-selector">
              {(["low", "mid", "high"] as const).map((pitch) => (
                <button
                  key={pitch}
                  onClick={() => setVoicePitch(pitch)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    voicePitch === pitch
                      ? "text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    voicePitch === pitch
                      ? { backgroundColor: color || agent.color }
                      : undefined
                  }
                  data-testid={`pitch-${pitch}`}
                >
                  {pitch.charAt(0).toUpperCase() + pitch.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Personality */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Voice Personality
            </label>
            <Input
              value={voicePersonality}
              onChange={(e) => setVoicePersonality(e.target.value)}
              placeholder="e.g., Calm and analytical with a hint of dry humor"
              data-testid="input-voice-personality"
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">
              Describes the speaking style and tone for text-to-speech synthesis.
            </p>
          </div>

          {/* Current selection summary */}
          {selectedVoice && (
            <div
              className="mt-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50"
              data-testid="voice-selection-summary"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color || agent.color}20` }}
              >
                <Mic size={14} style={{ color: color || agent.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground">
                  {selectedVoice.label}
                </span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {selectedVoice.style} · {voicePitch} pitch
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Save Bar ────────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 border-t transition-all duration-200 ${
          hasChanges
            ? "bg-card/95 backdrop-blur-sm border-card-border"
            : "bg-card/60 border-transparent"
        }`}
        data-testid="save-bar"
      >
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasChanges ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400 font-medium">
                  Unsaved changes
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/50">
                No changes
              </span>
            )}
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              hasChanges
                ? "text-white hover:opacity-90 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
            style={
              hasChanges
                ? { backgroundColor: color || agent.color }
                : undefined
            }
            data-testid="btn-save"
          >
            <Save size={14} />
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
