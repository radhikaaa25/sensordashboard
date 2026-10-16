import {
  DoorClosed,
  DoorOpen,
  Activity,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { SensorData } from "@/lib/firebase";

interface SensorZoneGridProps {
  data: SensorData | null;
  motionEvents: number;
  triggerDoor: boolean;
  triggerMotion: boolean;
  triggerPerson: boolean;
  onToggleDoorTrigger: (val: boolean) => void;
  onToggleMotionTrigger: (val: boolean) => void;
  onTogglePersonTrigger: (val: boolean) => void;
}

const MAX_DISTANCE = 300; // cm

export function SensorZoneGrid({
  data,
  motionEvents,
  triggerDoor,
  triggerMotion,
  triggerPerson,
  onToggleDoorTrigger,
  onToggleMotionTrigger,
  onTogglePersonTrigger,
}: SensorZoneGridProps) {
  const distance = data?.distance ?? 0;
  const distancePct = Math.min(100, Math.max(0, (distance / MAX_DISTANCE) * 100));

  const isDistCritical = distance > 0 && distance < 50;
  const isDistWarning = distance >= 50 && distance < 150;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Zone 1: MC-38 Magnetic Door Contact */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
          data?.doorOpen
            ? "border-rose-500/80 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
            : "border-border/80 bg-card/70"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-bold text-primary">
              ZONE 01
            </span>
            <h3 className="text-xs font-mono font-semibold uppercase text-muted-foreground">
              ACCESS PORTAL (MC-38)
            </h3>
          </div>
          {data?.doorOpen ? (
            <DoorOpen className="h-5 w-5 text-rose-500 animate-pulse" />
          ) : (
            <DoorClosed className="h-5 w-5 text-emerald-400" />
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <p
              className={`text-2xl font-black font-mono tracking-tight ${
                data?.doorOpen ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {data ? (data.doorOpen ? "BREACH / OPEN" : "CLOSED / SECURE") : "WAITING..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              Magnetic reed circuit: {data?.doorOpen ? "LOOP BROKEN" : "CONTINUOUS"}
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              data?.doorOpen ? "w-full bg-rose-500 animate-pulse" : "w-full bg-emerald-500"
            }`}
          />
        </div>

        {/* Trigger tripwire toggle */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-mono text-muted-foreground">
          <span>ALARM TRIPWIRE:</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={triggerDoor}
              onChange={(e) => onToggleDoorTrigger(e.target.checked)}
              className="accent-primary"
            />
            <span className={triggerDoor ? "text-foreground font-semibold" : ""}>
              {triggerDoor ? "ACTIVE" : "BYPASSED"}
            </span>
          </label>
        </div>
      </div>

      {/* Zone 2: PIR Motion Detector (HC-SR501) */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
          data?.motion
            ? "border-amber-500/80 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            : "border-border/80 bg-card/70"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-bold text-primary">
              ZONE 02
            </span>
            <h3 className="text-xs font-mono font-semibold uppercase text-muted-foreground">
              MOTION SENSOR (PIR)
            </h3>
          </div>
          <Activity
            className={`h-5 w-5 ${
              data?.motion ? "text-amber-400 animate-pulse" : "text-muted-foreground"
            }`}
          />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <p
              className={`text-2xl font-black font-mono tracking-tight ${
                data?.motion ? "text-amber-400" : "text-foreground"
              }`}
            >
              {data ? (data.motion ? "MOTION DETECTED" : "IDLE / NO MOTION") : "WAITING..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              {motionEvents} pulse{motionEvents === 1 ? "" : "s"} logged this session
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              data?.motion ? "w-full bg-amber-500" : "w-0 bg-transparent"
            }`}
          />
        </div>

        {/* Trigger tripwire toggle */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-mono text-muted-foreground">
          <span>ALARM TRIPWIRE:</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={triggerMotion}
              onChange={(e) => onToggleMotionTrigger(e.target.checked)}
              className="accent-primary"
            />
            <span className={triggerMotion ? "text-foreground font-semibold" : ""}>
              {triggerMotion ? "ACTIVE" : "BYPASSED"}
            </span>
          </label>
        </div>
      </div>

      {/* Zone 3: Ultrasonic Rangefinder (HC-SR04) */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
          isDistCritical
            ? "border-rose-500/80 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
            : isDistWarning
            ? "border-amber-500/60 bg-amber-950/20"
            : "border-border/80 bg-card/70"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-bold text-primary">
              ZONE 03
            </span>
            <h3 className="text-xs font-mono font-semibold uppercase text-muted-foreground">
              PROXIMITY (HC-SR04)
            </h3>
          </div>
          <Ruler
            className={`h-5 w-5 ${
              isDistCritical
                ? "text-rose-400"
                : isDistWarning
                ? "text-amber-400"
                : "text-primary"
            }`}
          />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-2 font-mono">
              <span
                className={`text-2xl font-black tracking-tight ${
                  isDistCritical
                    ? "text-rose-400"
                    : isDistWarning
                    ? "text-amber-400"
                    : "text-primary"
                }`}
              >
                {data ? `${distance.toFixed(1)} cm` : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({(distance / 100).toFixed(2)} m)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              {isDistCritical
                ? "CRITICAL PROXIMITY HAZARD"
                : isDistWarning
                ? "PERSON IN APPROACH ZONE"
                : "Clear Buffer Zone (>150cm)"}
            </p>
          </div>
        </div>

        {/* Dynamic gauge bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isDistCritical
                ? "bg-rose-500"
                : isDistWarning
                ? "bg-amber-400"
                : "bg-primary"
            }`}
            style={{ width: `${distancePct}%` }}
          />
        </div>

        {/* Trigger tripwire toggle */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-mono text-muted-foreground">
          <span>PROXIMITY TRIPWIRE:</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={triggerPerson}
              onChange={(e) => onTogglePersonTrigger(e.target.checked)}
              className="accent-primary"
            />
            <span className={triggerPerson ? "text-foreground font-semibold" : ""}>
              {triggerPerson ? "ACTIVE (<50cm)" : "BYPASSED"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
