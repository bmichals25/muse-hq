import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { X, Play, Pause, SkipForward, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BriefingData, Product, Task, Agent } from "@shared/schema";

// ── Types ───────────────────────────────────────────────────────────

type ProductDetail = Product & { tasks: Task[]; agents: Agent[] };

// ── Constants ───────────────────────────────────────────────────────

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const CIRCLE_RADIUS = 90;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// ── Web Audio Chime ─────────────────────────────────────────────────

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  } catch {
    // Silently fail if audio isn't available
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Skeleton ────────────────────────────────────────────────────────

function FocusSkeleton() {
  return (
    <div
      className="fixed inset-0 bg-background flex items-center justify-center"
      data-testid="focus-skeleton"
    >
      <div className="w-48 h-48 rounded-full skeleton-shimmer" />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function FocusMode() {
  const [, navigate] = useLocation();
  const [priorityIndex, setPriorityIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data Fetching ───────────────────────────────────────

  const { data: briefing, isLoading: loadingBriefing } =
    useQuery<BriefingData>({
      queryKey: ["/api/briefing"],
    });

  const currentPriority = briefing?.priorities[priorityIndex];

  const { data: product, isLoading: loadingProduct } =
    useQuery<ProductDetail>({
      queryKey: ["/api/products", currentPriority?.productSlug ?? ""],
      enabled: !!currentPriority,
    });

  // ── Task Completion Mutation ────────────────────────────

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}/status`, {
        status: "completed",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      if (currentPriority) {
        queryClient.invalidateQueries({
          queryKey: ["/api/products", currentPriority.productSlug],
        });
      }
    },
  });

  // ── Timer Logic ─────────────────────────────────────────

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, secondsLeft]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setIsComplete(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleCompleteTask = useCallback(() => {
    if (!product || !currentPriority) return;

    // Find a matching in-progress or pending task for this priority
    const matchingTask = product.tasks.find(
      (t) =>
        t.status === "in_progress" ||
        t.status === "pending",
    );

    if (matchingTask) {
      completeMutation.mutate(matchingTask.id);
    }

    // Move to next priority
    if (briefing && priorityIndex < briefing.priorities.length - 1) {
      setPriorityIndex((i) => i + 1);
      setSecondsLeft(FOCUS_DURATION);
      setIsComplete(false);
      setIsRunning(false);
    } else {
      setAllDone(true);
    }
  }, [product, currentPriority, briefing, priorityIndex, completeMutation]);

  const handleSkip = useCallback(() => {
    if (briefing && priorityIndex < briefing.priorities.length - 1) {
      setPriorityIndex((i) => i + 1);
      setSecondsLeft(FOCUS_DURATION);
      setIsComplete(false);
      setIsRunning(false);
    } else {
      setAllDone(true);
    }
  }, [briefing, priorityIndex]);

  const handleExit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // ── Loading / No data states ────────────────────────────

  if (loadingBriefing) return <FocusSkeleton />;
  if (!briefing || briefing.priorities.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-background flex items-center justify-center"
        data-testid="focus-no-priorities"
      >
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-foreground">
            No priorities set for today
          </p>
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
            data-testid="focus-exit-btn"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── All Done State ──────────────────────────────────────

  if (allDone) {
    return (
      <div
        className="fixed inset-0 bg-background flex items-center justify-center"
        data-testid="focus-all-done"
      >
        <div className="text-center space-y-6">
          <CheckCircle2 size={64} className="text-emerald-400 mx-auto" />
          <h1
            className="text-3xl font-bold text-foreground"
            data-testid="all-done-heading"
          >
            All priorities complete!
          </h1>
          <p className="text-sm text-muted-foreground">
            Great work. You've focused on all {briefing.priorities.length}{" "}
            priorities for today.
          </p>
          <button
            onClick={handleExit}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            data-testid="focus-done-exit"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Timer calculations ──────────────────────────────────

  const progress = 1 - secondsLeft / FOCUS_DURATION;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  const bgColor = product?.bgColor ?? "#0A0A0C";
  const accentColor = product?.accentColor ?? "#3B82F6";
  const fontFamily = product?.fontFamily ?? "inherit";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: bgColor }}
      data-testid="focus-mode"
    >
      {/* ── Close Button ──────────────────────────────────── */}
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        data-testid="focus-close"
      >
        <X size={20} />
      </button>

      {/* ── Step Indicator ────────────────────────────────── */}
      <div className="mb-8 text-center" data-testid="focus-step-indicator">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          Step {priorityIndex + 1} of {briefing.priorities.length}
        </span>
      </div>

      {/* ── Priority Title ────────────────────────────────── */}
      <h1
        className="text-2xl font-bold mb-2 text-center px-8"
        style={{ color: accentColor, fontFamily }}
        data-testid="focus-priority-title"
      >
        {currentPriority?.title}
      </h1>
      <p
        className="text-sm text-muted-foreground mb-10"
        data-testid="focus-product-name"
      >
        {product?.name ?? currentPriority?.productSlug}
        {currentPriority?.agentCodename && (
          <span className="ml-2 text-muted-foreground/50">
            · {currentPriority.agentCodename}
          </span>
        )}
      </p>

      {/* ── SVG Timer Circle ──────────────────────────────── */}
      <div className="relative mb-10" data-testid="focus-timer">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="110"
            cy="110"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-white/10"
          />
          {/* Progress circle */}
          <circle
            cx="110"
            cy="110"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke={accentColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            data-testid="focus-progress-ring"
          />
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-4xl font-mono font-bold text-foreground"
            data-testid="focus-time-display"
          >
            {formatTimer(secondsLeft)}
          </span>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────── */}
      <div className="flex items-center gap-4" data-testid="focus-controls">
        {isComplete ? (
          <>
            <button
              onClick={handleCompleteTask}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: accentColor, color: "#fff" }}
              data-testid="focus-complete-btn"
              disabled={completeMutation.isPending}
            >
              <CheckCircle2 size={16} />
              {completeMutation.isPending ? "Saving..." : "Mark Complete & Next"}
            </button>
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              data-testid="focus-skip-btn"
            >
              <SkipForward size={16} />
              Skip
            </button>
          </>
        ) : (
          <>
            {isRunning ? (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-white/10 text-foreground hover:bg-white/15 transition-colors"
                data-testid="focus-pause-btn"
              >
                <Pause size={16} />
                Pause
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: accentColor, color: "#fff" }}
                data-testid="focus-start-btn"
              >
                <Play size={16} />
                {secondsLeft < FOCUS_DURATION ? "Resume" : "Start Focus"}
              </button>
            )}
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              data-testid="focus-skip-btn"
            >
              <SkipForward size={16} />
              Skip
            </button>
          </>
        )}
      </div>

      {/* ── Session Progress ──────────────────────────────── */}
      <div
        className="absolute bottom-8 flex items-center gap-2"
        data-testid="focus-session-progress"
      >
        {briefing.priorities.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < priorityIndex
                ? "bg-emerald-400"
                : i === priorityIndex
                  ? "bg-foreground"
                  : "bg-white/20"
            }`}
            data-testid={`focus-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
