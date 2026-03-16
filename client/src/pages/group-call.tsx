import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Mic,
  MicOff,
  PhoneOff,
  Hand,
  Send,
  ChevronDown,
  ChevronUp,
  Check,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  useVoiceChat,
  type TranscriptEntry,
  type VoiceChatState,
} from "@/hooks/use-voice-chat";
import type { Agent, AgentVoiceProfile } from "@shared/schema";

// ── Constants ────────────────────────────────────────────────────────

const PRESETS: { label: string; agentIds: string[] }[] = [
  { label: "All Agents", agentIds: ["a-1", "a-2", "a-3", "a-4", "a-5", "a-6", "a-7", "a-8"] },
  { label: "Resumaid Team", agentIds: ["a-1", "a-3", "a-4", "a-5"] },
  { label: "Ops Team", agentIds: ["a-1", "a-6", "a-7", "a-8"] },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getSpeechRecognitionCtor(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className ?? ""}`} />;
}

function GroupCallSkeleton() {
  return (
    <div
      className="h-screen bg-background flex items-center justify-center"
      data-testid="group-call-skeleton"
    >
      <div className="space-y-6 w-[600px]">
        <SkeletonBlock className="h-8 w-48 mx-auto" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
        <SkeletonBlock className="h-12 w-48 mx-auto" />
      </div>
    </div>
  );
}

// ── Agent Selection Phase ────────────────────────────────────────────

function AgentSelection({
  agents,
  profiles,
  selected,
  onToggle,
  onStart,
}: {
  agents: Agent[];
  profiles: AgentVoiceProfile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onStart: () => void;
}) {
  const [, navigate] = useLocation();
  const profileMap = new Map(profiles.map((p) => [p.agentId, p]));

  const applyPreset = (ids: string[]) => {
    for (const agent of agents) {
      if (ids.includes(agent.id) && !selected.has(agent.id)) {
        onToggle(agent.id);
      } else if (!ids.includes(agent.id) && selected.has(agent.id)) {
        onToggle(agent.id);
      }
    }
  };

  return (
    <div
      className="h-screen bg-background flex flex-col items-center justify-center px-6"
      data-testid="agent-selection-phase"
    >
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="back-button"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="max-w-[640px] w-full">
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold text-foreground mb-2"
            data-testid="selection-title"
          >
            Start a Roundtable
          </h1>
          <p className="text-sm text-muted-foreground">
            Select agents to join the voice roundtable
          </p>
        </div>

        {/* Presets */}
        <div
          className="flex items-center justify-center gap-2 mb-6"
          data-testid="preset-buttons"
        >
          {PRESETS.map((preset) => {
            const allSelected = preset.agentIds.every((id) => selected.has(id));
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.agentIds)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  allSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`preset-${preset.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Agent Grid */}
        <div
          className="grid grid-cols-4 gap-3 mb-8"
          data-testid="agent-selection-grid"
        >
          {agents.map((agent) => {
            const isSelected = selected.has(agent.id);
            const profile = profileMap.get(agent.id);

            return (
              <button
                key={agent.id}
                onClick={() => onToggle(agent.id)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-card-border bg-card hover:border-muted-foreground/30"
                }`}
                data-testid={`agent-select-${agent.codename}`}
              >
                {/* Checkbox indicator */}
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary"
                      : "border border-card-border"
                  }`}
                >
                  {isSelected && (
                    <Check size={12} className="text-primary-foreground" />
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.codename.slice(0, 2)}
                </div>

                {/* Info */}
                <div className="text-center">
                  <div className="text-xs font-semibold text-foreground">
                    {agent.codename}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {agent.department}
                  </div>
                  {profile && (
                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                      {profile.voiceName}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Start button */}
        <div className="flex justify-center">
          <button
            onClick={onStart}
            disabled={selected.size < 2}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
            data-testid="start-roundtable"
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Start Roundtable
              {selected.size > 0 && (
                <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">
                  {selected.size}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Active Call Phase ────────────────────────────────────────────────

function ActiveCall({
  agents,
  profiles,
  selectedIds,
  onEnd,
  onChangeAgents,
}: {
  agents: Agent[];
  profiles: AgentVoiceProfile[];
  selectedIds: string[];
  onEnd: () => void;
  onChangeAgents: () => void;
}) {
  const [duration, setDuration] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [interimText, setInterimText] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [currentSpeakerText, setCurrentSpeakerText] = useState("");

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const profileMap = new Map(profiles.map((p) => [p.agentId, p]));
  const selectedAgents = selectedIds
    .map((id) => agentMap.get(id))
    .filter(Boolean) as Agent[];

  // Voice chat hook
  const {
    state: voiceState,
    transcript,
    sendToGroup,
    stopPlayback,
    endCall: endVoiceCall,
    startCall: startVoiceCall,
    handleInterruption,
  } = useVoiceChat({
    autoListen: false, // We manage recognition ourselves
    onStateChange: (s: VoiceChatState) => {
      // Track current speaker from transcript changes
      if (s === "idle" || s === "listening") {
        setCurrentSpeaker(null);
        setCurrentSpeakerText("");
      }
    },
  });

  // Track current speaker from transcript changes
  useEffect(() => {
    if (transcript.length > 0) {
      const last = transcript[transcript.length - 1];
      if (last.speaker !== "user") {
        setCurrentSpeaker(last.speaker);
        setCurrentSpeakerText(last.text);
      }
    }
  }, [transcript]);

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Start voice call on mount
  useEffect(() => {
    startVoiceCall();
    return () => {
      endVoiceCall();
      stopRecognition();
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // ── Speech Recognition (managed in component) ──

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR || !micEnabled) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;

          // Interrupt agent if speaking
          if (voiceState === "speaking") {
            handleInterruption();
          }
        }
      }

      if (interim) {
        setInterimText(interim);
      }

      if (finalText.trim()) {
        setInterimText("");
        handleFinalText(finalText.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should be listening
      if (isListeningRef.current && micEnabled) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
    } catch (err) {
      console.error("Failed to start recognition:", err);
    }
  }, [micEnabled, voiceState, handleInterruption]);

  const stopRecognition = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setInterimText("");
  }, []);

  // Start/stop recognition based on mic state
  useEffect(() => {
    if (micEnabled) {
      startRecognition();
    } else {
      stopRecognition();
    }
  }, [micEnabled]);

  // ── Handlers ──

  const handleFinalText = useCallback(
    (text: string) => {
      if (handRaised) {
        // Send to all agents, then lower hand
        sendToGroup(selectedIds, text);
        setHandRaised(false);
      } else {
        // Normal roundtable — send to group
        sendToGroup(selectedIds, text);
      }
    },
    [handRaised, selectedIds, sendToGroup],
  );

  const handleRaiseHand = useCallback(() => {
    if (handRaised) {
      // Lower hand
      setHandRaised(false);
    } else {
      // Raise hand — stop all agent audio
      stopPlayback();
      setHandRaised(true);
      setCurrentSpeaker(null);
      setCurrentSpeakerText("");
    }
  }, [handRaised, stopPlayback]);

  const handleEndCall = useCallback(() => {
    stopRecognition();
    endVoiceCall();
    onEnd();
  }, [stopRecognition, endVoiceCall, onEnd]);

  const handleTextSend = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setTextInput("");
    sendToGroup(selectedIds, trimmed);
    if (handRaised) {
      setHandRaised(false);
    }
  }, [textInput, selectedIds, sendToGroup, handRaised]);

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  // ── Render helpers ──

  const getAgentByCodename = (codename: string): Agent | undefined =>
    agents.find((a) => a.codename === codename);

  const isSpeaking = (agentId: string): boolean => {
    if (voiceState !== "speaking") return false;
    const agent = agentMap.get(agentId);
    return agent ? agent.codename === currentSpeaker : false;
  };

  return (
    <div
      className="h-screen bg-background flex flex-col"
      data-testid="active-call-phase"
    >
      {/* ── Header ────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-card-border"
        data-testid="call-header"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Roundtable</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {selectedAgents.length} agents
          </span>
          {handRaised && (
            <span
              className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full animate-roundtable-hand-pulse"
              data-testid="floor-indicator"
            >
              You have the floor
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span
            className="text-sm font-mono text-muted-foreground"
            data-testid="call-timer"
          >
            {formatDuration(duration)}
          </span>
          <div
            className={`w-2 h-2 rounded-full ${
              voiceState === "speaking"
                ? "bg-green-400 animate-pulse"
                : voiceState === "processing"
                  ? "bg-yellow-400 animate-pulse"
                  : voiceState === "listening"
                    ? "bg-blue-400"
                    : "bg-muted-foreground/40"
            }`}
            data-testid="call-status-dot"
          />
        </div>
      </div>

      {/* ── Agent Grid (center) ───────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 min-h-0">
        <div
          className="flex flex-wrap justify-center gap-6 max-w-[600px]"
          data-testid="agent-circle-grid"
        >
          {/* User circle */}
          <div className="flex flex-col items-center gap-2" data-testid="user-circle">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-lg font-bold border-[3px] transition-all ${
                handRaised
                  ? "border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.4)] animate-roundtable-glow"
                  : micEnabled
                    ? "border-primary shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                    : "border-muted-foreground/30"
              }`}
              style={{
                backgroundColor: "hsl(217 91% 60% / 0.15)",
                color: "hsl(217 91% 60%)",
              }}
            >
              BM
            </div>
            <div className="text-center">
              <div className="text-[11px] font-semibold text-foreground">
                You
              </div>
              {interimText && (
                <div className="text-[9px] text-primary/70 max-w-[80px] truncate">
                  {interimText}
                </div>
              )}
            </div>
          </div>

          {/* Agent circles */}
          {selectedAgents.map((agent) => {
            const speaking = isSpeaking(agent.id);
            const profile = profileMap.get(agent.id);

            return (
              <div
                key={agent.id}
                className="flex flex-col items-center gap-2"
                data-testid={`agent-circle-${agent.codename}`}
              >
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-lg font-bold text-white border-[3px] transition-all ${
                    speaking
                      ? "animate-roundtable-speaking scale-110"
                      : "opacity-80"
                  }`}
                  style={{
                    backgroundColor: agent.color,
                    borderColor: speaking ? agent.color : "transparent",
                    boxShadow: speaking
                      ? `0 0 24px ${agent.color}80, 0 0 48px ${agent.color}40`
                      : "none",
                  }}
                >
                  {agent.codename.slice(0, 2)}
                </div>
                <div className="text-center">
                  <div
                    className={`text-[11px] font-semibold transition-colors ${
                      speaking ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {agent.codename}
                  </div>
                  {profile && (
                    <div className="text-[9px] text-muted-foreground/50">
                      {profile.voiceName}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Current Speaker Panel ───────────────────── */}
        {currentSpeaker && currentSpeakerText && (
          <div
            className="mt-8 max-w-[500px] w-full text-center"
            data-testid="current-speaker-panel"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{
                  backgroundColor:
                    getAgentByCodename(currentSpeaker)?.color ?? "#6B7280",
                }}
              />
              <span
                className="text-sm font-semibold"
                style={{
                  color:
                    getAgentByCodename(currentSpeaker)?.color ?? "#6B7280",
                }}
              >
                {currentSpeaker}
              </span>
            </div>
            <p
              className="text-sm text-foreground/80 leading-relaxed"
              data-testid="current-speaker-text"
            >
              {currentSpeakerText}
            </p>
          </div>
        )}

        {/* Processing indicator */}
        {voiceState === "processing" && (
          <div
            className="mt-6 flex items-center gap-2"
            data-testid="processing-indicator"
          >
            <div className="flex gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Agents are thinking...
            </span>
          </div>
        )}
      </div>

      {/* ── Transcript Panel (collapsible) ────────────── */}
      <div
        className={`shrink-0 border-t border-card-border bg-card transition-all ${
          transcriptOpen ? "max-h-[240px]" : "max-h-[40px]"
        }`}
        data-testid="transcript-panel"
      >
        <button
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="transcript-toggle"
        >
          <span className="font-medium">
            Transcript ({transcript.length})
          </span>
          {transcriptOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronUp size={14} />
          )}
        </button>

        {transcriptOpen && (
          <div
            className="overflow-y-auto px-4 pb-2 space-y-1.5"
            style={{ maxHeight: "192px" }}
            data-testid="transcript-messages"
          >
            {transcript.map((entry) => {
              const isUser = entry.speaker === "user";
              const agent = isUser
                ? null
                : getAgentByCodename(entry.speaker);
              const color = isUser
                ? "hsl(217 91% 60%)"
                : entry.color || agent?.color || "#6B7280";

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-2"
                  data-testid={`transcript-entry-${entry.id}`}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <span
                      className="text-[10px] font-semibold mr-1.5"
                      style={{ color }}
                    >
                      {isUser ? "You" : entry.speaker}
                    </span>
                    <span
                      className={`text-[11px] ${
                        isUser
                          ? "text-foreground/90"
                          : "text-foreground/70"
                      }`}
                    >
                      {entry.text}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* ── Controls Bar ──────────────────────────────── */}
      <div
        className="shrink-0 border-t border-card-border px-4 py-3 bg-card"
        data-testid="call-controls"
      >
        <div className="flex items-center gap-3 max-w-[700px] mx-auto">
          {/* Mic toggle */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={`p-3 rounded-full transition-all ${
              micEnabled
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-destructive/20 text-destructive hover:bg-destructive/30"
            }`}
            data-testid="mic-toggle"
          >
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Raise/Lower Hand */}
          <button
            onClick={handleRaiseHand}
            className={`p-3 rounded-full transition-all ${
              handRaised
                ? "bg-orange-400/20 text-orange-400 animate-roundtable-hand-pulse"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
            data-testid="raise-hand"
          >
            <Hand size={18} />
          </button>

          {/* Text input fallback */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleTextKeyDown}
              placeholder={
                handRaised
                  ? "Type your message (you have the floor)..."
                  : "Type a message..."
              }
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
              data-testid="text-input"
            />
            <button
              onClick={handleTextSend}
              disabled={!textInput.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground transition-colors disabled:opacity-30"
              data-testid="text-send"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Change agents */}
          <button
            onClick={onChangeAgents}
            className="p-3 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            data-testid="change-agents"
          >
            <Users size={18} />
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-all"
            data-testid="end-call"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function GroupCall() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<"selection" | "active">("selection");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: profiles, isLoading: loadingProfiles } = useQuery<
    AgentVoiceProfile[]
  >({
    queryKey: ["/api/voice/profiles"],
  });

  // Pre-populate from URL params
  useEffect(() => {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf("?");
    if (queryIdx === -1) return;

    const params = new URLSearchParams(hash.slice(queryIdx + 1));
    const agentsParam = params.get("agents");
    if (agentsParam) {
      const ids = agentsParam.split(",").filter(Boolean);
      if (ids.length > 0) {
        setSelectedIds(new Set(ids));
        if (ids.length >= 2) {
          setPhase("active");
        }
      }
    }
  }, []);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStart = useCallback(() => {
    if (selectedIds.size >= 2) {
      setPhase("active");
    }
  }, [selectedIds]);

  const handleEnd = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleChangeAgents = useCallback(() => {
    setPhase("selection");
  }, []);

  if (loadingAgents || loadingProfiles || !agents || !profiles) {
    return <GroupCallSkeleton />;
  }

  if (phase === "selection") {
    return (
      <AgentSelection
        agents={agents}
        profiles={profiles}
        selected={selectedIds}
        onToggle={handleToggle}
        onStart={handleStart}
      />
    );
  }

  return (
    <ActiveCall
      agents={agents}
      profiles={profiles}
      selectedIds={Array.from(selectedIds)}
      onEnd={handleEnd}
      onChangeAgents={handleChangeAgents}
    />
  );
}
