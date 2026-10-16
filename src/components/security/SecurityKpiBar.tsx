import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Clock,
  Radar,
  Activity,
  AlertOctagon,
} from "lucide-react";

interface SecurityKpiBarProps {
  isPerimeterBreached: boolean;
  activeSensorsCount: number;
  criticalEventsCount: number;
  totalLogsCount: number;
  currentDistance: number;
  doorOpen: boolean;
  motionDetected: boolean;
  isAfterHours: boolean;
  armScheduleText: string;
}

export function SecurityKpiBar({
  isPerimeterBreached,
  activeSensorsCount,
  criticalEventsCount,
  totalLogsCount,
  currentDistance,
  doorOpen,
  motionDetected,
  isAfterHours,
  armScheduleText,
}: SecurityKpiBarProps) {
  const isDistanceCritical = currentDistance > 0 && currentDistance < 50;
  const isDistanceWarning = currentDistance >= 50 && currentDistance < 150;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Perimeter Integrity */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
          isPerimeterBreached
            ? "border-rose-500/80 bg-rose-950/30 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            : "border-border/80 bg-card/70"
        }`}
      >
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>PERIMETER STATUS</span>
          {isPerimeterBreached ? (
            <ShieldAlert className="h-4 w-4 text-rose-500 animate-bounce" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-black tracking-tight ${
              isPerimeterBreached ? "text-rose-400 animate-pulse" : "text-emerald-400"
            }`}
          >
            {isPerimeterBreached ? "BREACHED" : "SECURE"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isPerimeterBreached ? "bg-rose-500 animate-ping" : "bg-emerald-400"
            }`}
          />
          <span>{isPerimeterBreached ? "Tripwire Compromised" : "Perimeter Sealed"}</span>
        </div>
      </div>

      {/* 2. Sensor Tripwires */}
      <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>TRIPWIRE SENSORS</span>
          <Radio className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-foreground">
            {activeSensorsCount}/3
          </span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">ONLINE</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <span className={doorOpen ? "text-rose-400 font-bold" : "text-emerald-400"}>
            DOOR {doorOpen ? "OPEN" : "OK"}
          </span>
          <span>·</span>
          <span className={motionDetected ? "text-amber-400 font-bold" : "text-emerald-400"}>
            PIR {motionDetected ? "ACTV" : "OK"}
          </span>
          <span>·</span>
          <span className="text-primary font-semibold">RADAR</span>
        </div>
      </div>

      {/* 3. Incidents / Logs Counter */}
      <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>INCIDENT LOGS</span>
          <AlertOctagon className="h-4 w-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-foreground">
            {totalLogsCount}
          </span>
          {criticalEventsCount > 0 ? (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-xs font-mono font-bold text-rose-400">
              {criticalEventsCount} CRIT
            </span>
          ) : (
            <span className="text-xs font-mono text-emerald-400 font-semibold">0 CRIT</span>
          )}
        </div>
        <div className="mt-1 text-[11px] font-mono text-muted-foreground">
          Real-time Audit Stream Active
        </div>
      </div>

      {/* 4. Ultrasonic Proximity Radar Reading */}
      <div
        className={`rounded-2xl border p-4 transition-all ${
          isDistanceCritical
            ? "border-rose-500/80 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
            : isDistanceWarning
            ? "border-amber-500/60 bg-amber-950/20"
            : "border-border/80 bg-card/70"
        }`}
      >
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>PROXIMITY RADAR</span>
          <Radar
            className={`h-4 w-4 ${
              isDistanceCritical
                ? "text-rose-400 animate-spin"
                : isDistanceWarning
                ? "text-amber-400"
                : "text-primary"
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span
            className={`text-2xl font-black tracking-tight ${
              isDistanceCritical
                ? "text-rose-400"
                : isDistanceWarning
                ? "text-amber-400"
                : "text-primary"
            }`}
          >
            {currentDistance > 0 ? currentDistance.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">cm</span>
        </div>
        <div className="mt-1 text-[11px] font-mono">
          {isDistanceCritical ? (
            <span className="font-bold text-rose-400">CRITICAL INTRUSION ZONE</span>
          ) : isDistanceWarning ? (
            <span className="font-semibold text-amber-400">PROXIMITY WARNING</span>
          ) : (
            <span className="text-emerald-400">CLEAR ZONE (&gt;150cm)</span>
          )}
        </div>
      </div>

      {/* 5. Schedule & Guard Patrol status */}
      <div className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-2xl border border-border/80 bg-card/70 p-4">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>AUTO-ARM PROTOCOL</span>
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-black tracking-tight text-foreground font-mono">
            {isAfterHours ? "AFTER-HOURS" : "STANDARD"}
          </span>
        </div>
        <div className="mt-1 text-[11px] font-mono text-muted-foreground truncate" title={armScheduleText}>
          {armScheduleText}
        </div>
      </div>
    </div>
  );
}
