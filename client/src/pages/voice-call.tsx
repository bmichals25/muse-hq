import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Keyboard,
  Settings,
  Send,
  ArrowLeft,
  X,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useVoiceChat, type TranscriptEntry, type VoiceChatState } from "@/hooks/use-voice-chat";
import type { Agent, AgentVoiceProfile } from "@shared/schema";

// ── Helpers ─────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Speech Recognition helper ───────────────────────────────────────

type SpeechRecognitionAPI = any;

function getSpeechRecognition(): SpeechRecognitionAPI | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

// ── Voice State Indicator ───────────────────────────────────────────

function VoiceStateIndicator({
  state,
  agentColor,
}: {
  state: VoiceChatState;
  agentColor: string;
}) {
  if (state === "listening") {
    return (
      <div className="flex items-center gap-2" data-testid="state-listening">
        <div className="flex items-end gap-0.5 h-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary"
              style={{
                animation: `vc-bar-bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
              }}
            />
          ))}
        </div>
        <span className="text-xs text-primary font-medium">Listening...</span>
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div className="flex items-center gap-2" data-testid="state-processing">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: agentColor,
            animation: "vc-dot-pulse 1s ease-in-out infinite",
          }}
        />
        <span className="text-xs font-medium" style={{ color: agentColor }}>
          Thinking...
        </span>
      </div>
    );
  }

  if (state === "speaking") {
    return (
      <div className="flex items-center gap-2" data-testid="state-speaking">
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-0.5 rounded-full"
              style={{
                backgroundColor: agentColor,
                animation: `vc-wave ${0.6 + i * 0.1}s ease-in-out ${i * 0.08}s infinite alternate`,
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: agentColor }}>
          Speaking...
        </span>
      </div>
    );
  }

  // Idle
  return (
    <div className="flex items-center gap-2" data-testid="state-idle">
      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      <span className="text-xs text-muted-foreground/50">Ready</span>
    </div>
  );
}

// ── Transcript View ─────────────────────────────────────────────────

function TranscriptView({
  transcript,
  interimText,
  agentColor,
  agentCodename,
}: {
  transcript: TranscriptEntry[];
  interimText: string;
  agentColor: string;
  agentCodename: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText]);

  if (transcript.length === 0 && !interimText) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        data-testid="transcript-empty"
      >
        <p className="text-xs text-muted-foreground/30">
          Conversation will appear here
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      data-testid="transcript-area"
    >
      {transcript.map((entry) => {
        const isUser = entry.speaker === "user";
        return (
          <div
            key={entry.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            data-testid={`transcript-${entry.id}`}
          >
            <div className={`max-w-[80%] ${isUser ? "text-right" : "text-left"}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                {!isUser && (
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: entry.color || agentColor }}
                  >
                    {entry.speaker}
                  </span>
                )}
                {isUser && (
                  <span className="text-[10px] font-semibold text-primary ml-auto">
                    You
                  </span>
                )}
                <span className="text-[9px] text-muted-foreground/40">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <div
                className={`text-sm rounded-lg px-3 py-2 inline-block ${
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#0F1320] border-l-2"
                }`}
                style={
                  !isUser
                    ? { borderLeftColor: entry.color || agentColor }
                    : undefined
                }
              >
                {entry.text}
                {entry.text.includes("[interrupted]") && (
                  <span className="text-[10px] text-muted-foreground/40 ml-1 italic">
                    interrupted
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {interimText && (
        <div className="flex justify-end" data-testid="interim-text">
          <div className="max-w-[80%] text-right">
            <div className="text-sm rounded-lg px-3 py-2 inline-block bg-primary/20 text-primary/70 italic">
              {interimText}
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}

// ── Text Input Fallback ─────────────────────────────────────────────

function TextInputFallback({
  onSend,
  agentCodename,
  disabled,
}: {
  onSend: (text: string) => void;
  agentCodename: string;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSend(trimmed);
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-[#0D1117] rounded-xl border border-[#1E293B]"
      data-testid="text-input-fallback"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
        }}
        placeholder={`Type a message to ${agentCodename}...`}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 outline-none"
        data-testid="text-input-field"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
        data-testid="text-send-btn"
      >
        <Send size={14} />
      </button>
    </div>
  );
}

// ── Inline Styles (keyframes) ───────────────────────────────────────

const VOICE_CALL_STYLES = `
@keyframes vc-bar-bounce {
  0% { height: 4px; }
  100% { height: 16px; }
}
@keyframes vc-dot-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.3); }
}
@keyframes vc-wave {
  0% { height: 4px; }
  100% { height: 14px; }
}
@keyframes vc-ring-pulse {
  0% { box-shadow: 0 0 0 0px var(--vc-ring-color); opacity: 1; }
  100% { box-shadow: 0 0 0 24px var(--vc-ring-color); opacity: 0; }
}
@keyframes vc-ring-idle {
  0%, 100% { box-shadow: 0 0 0 0px var(--vc-ring-color); }
  50% { box-shadow: 0 0 0 6px var(--vc-ring-color); }
}
@keyframes vc-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes vc-mic-glow {
  0%, 100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
}
`;

// ── Main Component ──────────────────────────────────────────────────

export default function VoiceCall() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId ?? "";
  const [, navigate] = useLocation();

  // ── Local State ──
  const [isMuted, setIsMuted] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [interrupted, setInterrupted] = useState(false);

  // ── Refs ──
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callActiveRef = useRef(false);
  const isMutedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ── Data Fetching ──
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  type VoiceProfileEnriched = AgentVoiceProfile & {
    codename: string;
    color: string;
    name: string;
    department: string;
  };

  const { data: voiceProfile } = useQuery<VoiceProfileEnriched>({
    queryKey: ["/api/voice/profiles", agentId],
    enabled: !!agentId,
  });

  const agent = agents?.find((a) => a.id === agentId);
  const agentColor = voiceProfile?.color || agent?.color || "#3B82F6";
  const agentCodename = voiceProfile?.codename || agent?.codename || "AGENT";
  const voiceName = voiceProfile?.voiceName || "daniel";

  // ── Voice Chat Hook ──
  const {
    state,
    transcript,
    interimText,
    isSupported,
    startCall: hookStartCall,
    endCall: hookEndCall,
    sendToAgent,
    handleInterruption,
    stopPlayback,
  } = useVoiceChat({
    autoListen: true,
    onInterruption: () => {
      setInterrupted(true);
      setTimeout(() => setInterrupted(false), 2000);
    },
  });

  // ── Speech Recognition (managed in component) ──

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    stopRecognition();

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;

          // Interruption: if agent is speaking and we detect user speech
          if (state === "speaking") {
            handleInterruption();
          }
        }
      }

      if (finalText.trim() && agentId) {
        sendToAgent(agentId, finalText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Voice call recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if call is still active and not muted
      if (callActiveRef.current && !isMutedRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start recognition:", err);
    }
  }, [stopRecognition, agentId, sendToAgent, handleInterruption, state]);

  // ── Call Controls ──

  const handleStartCall = useCallback(() => {
    setCallActive(true);
    setCallDuration(0);
    hookStartCall();

    // Start our own recognition
    if (isSupported && !showTextInput) {
      startRecognition();
    }

    // Duration timer
    durationTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, [hookStartCall, isSupported, showTextInput, startRecognition]);

  const handleEndCall = useCallback(() => {
    setCallActive(false);
    hookEndCall();
    stopRecognition();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    // Navigate back after a brief delay
    setTimeout(() => navigate(`/chat/${agentId}`), 800);
  }, [hookEndCall, stopRecognition, navigate, agentId]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        stopRecognition();
      } else if (callActive && isSupported && !showTextInput) {
        startRecognition();
      }
      return next;
    });
  }, [callActive, isSupported, showTextInput, stopRecognition, startRecognition]);

  const handleToggleTextInput = useCallback(() => {
    setShowTextInput((prev) => {
      const next = !prev;
      if (next) {
        stopRecognition();
      } else if (callActive && isSupported && !isMuted) {
        startRecognition();
      }
      return next;
    });
  }, [callActive, isSupported, isMuted, stopRecognition, startRecognition]);

  const handleTextSend = useCallback(
    (text: string) => {
      if (agentId) {
        sendToAgent(agentId, text);
      }
    },
    [agentId, sendToAgent],
  );

  // ── Auto-restart recognition when agent stops speaking ──
  useEffect(() => {
    if (
      state === "listening" &&
      callActive &&
      !isMuted &&
      !showTextInput &&
      isSupported &&
      !recognitionRef.current
    ) {
      startRecognition();
    }
  }, [state, callActive, isMuted, showTextInput, isSupported, startRecognition]);

  // ── Auto-start call on mount ──
  useEffect(() => {
    if (agent && !callActive) {
      handleStartCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopRecognition();
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [stopRecognition]);

  // ── Loading State ──
  if (!agents) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "#0A0E1A" }}
        data-testid="voice-call-loading"
      >
        <div className="w-40 h-40 rounded-full skeleton-shimmer" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#0A0E1A" }}
        data-testid="voice-call-not-found"
      >
        <p className="text-muted-foreground">Agent not found</p>
        <button
          onClick={() => navigate("/chat/pick")}
          className="text-sm text-primary hover:underline"
          data-testid="back-to-chat"
        >
          Back to Chat
        </button>
      </div>
    );
  }

  // ── Mic Permission Denied ──
  const showMicPrompt = !isSupported && !showTextInput;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: "#0A0E1A",
        "--vc-ring-color": `${agentColor}33`,
      } as React.CSSProperties}
      data-testid="voice-call-page"
    >
      <style>{VOICE_CALL_STYLES}</style>

      {/* ── Call Header ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        data-testid="call-header"
      >
        <button
          onClick={handleEndCall}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          data-testid="call-back-btn"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-medium text-muted-foreground/60 tracking-widest uppercase">
            {callActive ? "Connected" : "Connecting..."}
          </p>
          {callActive && (
            <p
              className="text-xs text-foreground/70 font-mono mt-0.5"
              data-testid="call-duration"
            >
              {formatDuration(callDuration)}
            </p>
          )}
        </div>

        <button
          onClick={() => navigate(`/agents/${agentCodename}`)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          data-testid="call-settings-btn"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── Agent Avatar (hero) ─────────────────────────────── */}
      <div
        className="flex flex-col items-center pt-6 pb-4 shrink-0"
        style={{ animation: "vc-fade-in 0.5s ease-out" }}
      >
        <div
          className="relative w-40 h-40 rounded-full flex items-center justify-center text-4xl font-bold text-white"
          style={{
            backgroundColor: `${agentColor}20`,
            border: `3px solid ${agentColor}`,
            animation:
              state === "speaking"
                ? "vc-ring-pulse 1.5s ease-out infinite"
                : "vc-ring-idle 3s ease-in-out infinite",
            ["--vc-ring-color" as string]: `${agentColor}40`,
          }}
          data-testid="agent-avatar"
        >
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agentCodename}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span style={{ color: agentColor }}>
              {agentCodename.charAt(0)}
            </span>
          )}

          {/* Interrupted flash */}
          {interrupted && (
            <div
              className="absolute inset-0 rounded-full border-2 border-red-500/50"
              style={{ animation: "vc-ring-pulse 0.5s ease-out" }}
            />
          )}
        </div>

        <h2
          className="text-lg font-semibold text-foreground mt-4"
          data-testid="agent-codename-display"
        >
          {agentCodename}
        </h2>
        <p className="text-xs text-muted-foreground/50 mt-0.5">
          {agent.name} · {agent.department}
        </p>
        <p
          className="text-[10px] text-muted-foreground/30 mt-1 italic"
          data-testid="voice-name-display"
        >
          Voice: {voiceName.charAt(0).toUpperCase() + voiceName.slice(1)}
        </p>

        {/* Voice State */}
        <div className="mt-3">
          <VoiceStateIndicator state={state} agentColor={agentColor} />
        </div>
      </div>

      {/* ── Transcript Area ─────────────────────────────────── */}
      <TranscriptView
        transcript={transcript}
        interimText={interimText}
        agentColor={agentColor}
        agentCodename={agentCodename}
      />

      {/* ── Text Input (when toggled or no speech support) ── */}
      {(showTextInput || showMicPrompt) && (
        <div className="px-4 pb-2 shrink-0">
          {showMicPrompt && (
            <p
              className="text-xs text-center text-muted-foreground/40 mb-2"
              data-testid="mic-unavailable-msg"
            >
              Speech recognition unavailable — use text input
            </p>
          )}
          <TextInputFallback
            onSend={handleTextSend}
            agentCodename={agentCodename}
            disabled={state === "processing"}
          />
        </div>
      )}

      {/* ── Controls Bar ────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-6 px-6 py-5 shrink-0"
        data-testid="controls-bar"
      >
        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors shadow-lg shadow-red-900/30"
          data-testid="end-call-btn"
        >
          <PhoneOff size={20} />
        </button>

        {/* Mic Toggle (center, large) */}
        <button
          onClick={handleToggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
            isMuted
              ? "bg-[#1E293B] shadow-none"
              : "bg-red-500"
          }`}
          style={
            !isMuted
              ? { animation: "vc-mic-glow 2s ease-in-out infinite" }
              : undefined
          }
          data-testid="mic-toggle-btn"
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {/* Text Input Toggle */}
        <button
          onClick={handleToggleTextInput}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            showTextInput
              ? "bg-primary text-primary-foreground"
              : "bg-[#1E293B] text-muted-foreground hover:text-foreground"
          }`}
          data-testid="text-toggle-btn"
        >
          <Keyboard size={20} />
        </button>
      </div>
    </div>
  );
}
