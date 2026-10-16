import { useState } from "react";
import {
  Sparkles,
  DoorOpen,
  Activity,
  Radar,
  RotateCcw,
  SlidersHorizontal,
  ClockAlert,
} from "lucide-react";

interface SimulationControlsProps {
  onSimulateDoor: () => void;
  onSimulateMotion: () => void;
  onSimulateProximity: (cm: number) => void;
  onSimulateStale: () => void;
  onResetSafe: () => void;
  doorOpen: boolean;
  motion: boolean;
  distance: number;
  isStale: boolean;
}

export function SimulationControls({
  onSimulateDoor,
  onSimulateMotion,
  onSimulateProximity,
  onSimulateStale,
  onResetSafe,
  doorOpen,
  motion,
  distance,
  isStale,
}: SimulationControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase text-primary">
            SECURITY LAB / HARDWARE TEST HARNESS
          </span>
          <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground">
            (Simulate real sensor events, 5m timeouts, & audit logging)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{isExpanded ? "HIDE CONTROLS" : "SHOW TEST TRIGGERS"}</span>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2 sm:grid-cols-5 font-mono text-xs">
          {/* Toggle Door */}
          <button
            type="button"
            onClick={onSimulateDoor}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 font-bold transition-all ${
              doorOpen
                ? "border-rose-500 bg-rose-500/20 text-rose-300"
                : "border-border bg-background/80 text-foreground hover:bg-muted"
            }`}
          >
            <DoorOpen className="h-4 w-4" />
            <span>{doorOpen ? "CLOSE DOOR" : "SIMULATE DOOR OPEN"}</span>
          </button>

          {/* Toggle Motion */}
          <button
            type="button"
            onClick={onSimulateMotion}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 font-bold transition-all ${
              motion
                ? "border-amber-500 bg-amber-500/20 text-amber-300"
                : "border-border bg-background/80 text-foreground hover:bg-muted"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>{motion ? "CLEAR MOTION" : "SIMULATE MOTION"}</span>
          </button>

          {/* Simulate Danger Proximity (35cm) */}
          <button
            type="button"
            onClick={() => onSimulateProximity(35.4)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background/80 p-2 font-bold text-foreground hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          >
            <Radar className="h-4 w-4 text-rose-400" />
            <span>APPROACH (35cm)</span>
          </button>

          {/* Simulate >= 5m Timeout Stale */}
          <button
            type="button"
            onClick={onSimulateStale}
            className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 font-bold transition-all ${
              isStale
                ? "border-amber-500 bg-amber-500/20 text-amber-300 animate-pulse"
                : "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            }`}
            title="Simulate last update >= 5 minutes ago to trigger auto-reset to 0"
          >
            <ClockAlert className="h-4 w-4 text-amber-400" />
            <span>{isStale ? "TIMEOUT ACTIVE (5m)" : "SIMULATE >5m STALE"}</span>
          </button>

          {/* Reset All to Safe */}
          <button
            type="button"
            onClick={onResetSafe}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-2 font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span>RESET TO SAFE (240cm)</span>
          </button>
        </div>
      )}
    </div>
  );
}
