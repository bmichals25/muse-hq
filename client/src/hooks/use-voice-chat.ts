/**
 * useVoiceChat — Core hook for real-time voice conversations with agents.
 *
 * Architecture:
 * - Web Speech API for real-time STT (speech-to-text)
 * - Backend POST /api/voice/chat for agent response + TTS audio
 * - Interruption handling: user speech onset immediately stops agent playback
 * - Audio queue for sequential playback in group calls
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export type TranscriptEntry = {
  id: string;
  speaker: string; // "user" or agent codename
  text: string;
  timestamp: string;
  isInterim?: boolean;
  color?: string;
};

export type VoiceChatState = "idle" | "listening" | "processing" | "speaking";

interface UseVoiceChatOptions {
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onStateChange?: (state: VoiceChatState) => void;
  onInterruption?: () => void;
  autoListen?: boolean; // Re-start listening after agent finishes speaking
}

// Check if SpeechRecognition is available
function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const { onTranscriptUpdate, onStateChange, onInterruption, autoListen = true } = options;

  const [state, setState] = useState<VoiceChatState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<{ audio: string; codename: string; text: string; color?: string }[]>([]);
  const isPlayingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldResumeListeningRef = useRef(false);
  const stateRef = useRef<VoiceChatState>("idle");

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Notify transcript updates
  useEffect(() => {
    onTranscriptUpdate?.(transcript);
  }, [transcript, onTranscriptUpdate]);

  // Check browser support
  useEffect(() => {
    const SR = getSpeechRecognition();
    setIsSupported(!!SR);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopPlayback();
    };
  }, []);

  // ── Playback Controls ──

  const stopPlayback = useCallback(() => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    // Clear the queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    // Cancel any in-flight TTS requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Resume listening after agent finishes
      if (autoListen && shouldResumeListeningRef.current) {
        setState("listening");
        startRecognition();
      } else {
        setState("idle");
      }
      return;
    }

    const next = audioQueueRef.current.shift()!;
    isPlayingRef.current = true;
    setState("speaking");

    // Add to transcript
    const entry: TranscriptEntry = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker: next.codename,
      text: next.text,
      timestamp: new Date().toISOString(),
      color: next.color,
    };
    setTranscript((prev) => [...prev, entry]);

    if (next.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${next.audio}`);
      audioRef.current = audio;

      audio.onended = () => {
        audioRef.current = null;
        playNextInQueue();
      };

      audio.onerror = () => {
        audioRef.current = null;
        playNextInQueue();
      };

      audio.play().catch(() => {
        // Autoplay blocked — move to next
        audioRef.current = null;
        playNextInQueue();
      });
    } else {
      // No audio available — show text, then move to next after a delay
      setTimeout(() => playNextInQueue(), 1500);
    }
  }, [autoListen]);

  // ── Interruption Handler ──

  const handleInterruption = useCallback(() => {
    if (stateRef.current === "speaking" || isPlayingRef.current) {
      stopPlayback();
      onInterruption?.();
      setState("listening");
    }
  }, [stopPlayback, onInterruption]);

  // ── Speech Recognition ──

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    // Don't create a new one if already active
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;

          // ── INTERRUPTION DETECTION ──
          // If agent is speaking and we detect any interim speech, interrupt immediately
          if (stateRef.current === "speaking" || isPlayingRef.current) {
            handleInterruption();
          }
        }
      }

      if (interim) {
        setInterimText(interim);
      }

      if (final.trim()) {
        setInterimText("");
        // This final text will be handled by the caller
        return final.trim();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setMicPermission("denied");
      }
      // Don't stop on 'no-speech' — just keep listening
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (stateRef.current === "listening" && shouldResumeListeningRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setMicPermission("granted");
    } catch (err) {
      console.error("Failed to start recognition:", err);
    }
  }, [handleInterruption]);

  const stopListening = useCallback(() => {
    shouldResumeListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setInterimText("");
  }, []);

  // ── Public API ──

  const startCall = useCallback(() => {
    shouldResumeListeningRef.current = true;
    setState("listening");
    setTranscript([]);
    startRecognition();
  }, [startRecognition]);

  const endCall = useCallback(() => {
    shouldResumeListeningRef.current = false;
    stopListening();
    stopPlayback();
    setState("idle");
  }, [stopListening, stopPlayback]);

  // Send a message to a single agent and play audio response
  const sendToAgent = useCallback(
    async (agentId: string, userText: string) => {
      // Add user message to transcript
      const userEntry: TranscriptEntry = {
        id: `t-${Date.now()}-user`,
        speaker: "user",
        text: userText,
        timestamp: new Date().toISOString(),
      };
      setTranscript((prev) => [...prev, userEntry]);

      // Pause listening while processing
      stopListening();
      setState("processing");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await apiRequest("/api/voice/chat", {
          method: "POST",
          body: JSON.stringify({ agentId, userMessage: userText }),
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        const data = await res.json();

        if (controller.signal.aborted) return;

        // Queue the response for playback
        audioQueueRef.current.push({
          audio: data.audio,
          codename: data.codename,
          text: data.responseText,
        });

        playNextInQueue();
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Voice chat error:", err);
        setState("listening");
        if (autoListen) {
          shouldResumeListeningRef.current = true;
          startRecognition();
        }
      }
    },
    [stopListening, playNextInQueue, autoListen, startRecognition],
  );

  // Send a message to multiple agents (group call) and queue all responses
  const sendToGroup = useCallback(
    async (agentIds: string[], userText: string) => {
      const userEntry: TranscriptEntry = {
        id: `t-${Date.now()}-user`,
        speaker: "user",
        text: userText,
        timestamp: new Date().toISOString(),
      };
      setTranscript((prev) => [...prev, userEntry]);

      stopListening();
      setState("processing");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await apiRequest("/api/voice/group-chat", {
          method: "POST",
          body: JSON.stringify({ agentIds, userMessage: userText }),
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        const data = await res.json();

        if (controller.signal.aborted) return;

        // Queue all agent responses for sequential playback
        for (const response of data.responses) {
          audioQueueRef.current.push({
            audio: response.audio,
            codename: response.codename,
            text: response.responseText,
            color: response.color,
          });
        }

        playNextInQueue();
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Group voice chat error:", err);
        setState("listening");
        if (autoListen) {
          shouldResumeListeningRef.current = true;
          startRecognition();
        }
      }
    },
    [stopListening, playNextInQueue, autoListen, startRecognition],
  );

  return {
    // State
    state,
    transcript,
    interimText,
    isSupported,
    micPermission,

    // Controls
    startCall,
    endCall,
    sendToAgent,
    sendToGroup,
    handleInterruption,
    stopPlayback,

    // Low-level
    setTranscript,
  };
}
