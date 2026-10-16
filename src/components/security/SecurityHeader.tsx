import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  WifiOff,
  BellRing,
  AlertTriangle,
  Flame,
  Sparkles,
} from "lucide-react";
import type { SecurityMode, ThreatLevel } from "@/lib/security-types";

interface SecurityHeaderProps {
  mode: SecurityMode;
  threatLevel: ThreatLevel;
  alarmActive: boolean;
  soundEnabled: boolean;
  isConnected: boolean;
  connectionError: string | null;
  onModeChange: (mode: SecurityMode) => void;
  onToggleSound: () => void;
  onTestSiren: () => void;
  onTriggerEmergency: () => void;
}

export function SecurityHeader({
  mode,
  threatLevel,
  alarmActive,
  soundEnabled,
  isConnected,
  connectionError,
  onModeChange,
  onToggleSound,
  onTestSiren,
  onTriggerEmergency,
}: SecurityHeaderProps) {
  const [time, setTime] = useState("");
  const [utcTime, setUtcTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setUtcTime(
        now.toUTCString().slice(17, 25) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const threatColor = {
    NORMAL: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    ELEVATED: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    BREACH:
      "text-rose-400 bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]",
  }[threatLevel];

  return (
    <header className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-2xl backdrop-blur-md">
      {/* Top row: Brand + Threat Matrix + Time HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        {/* Brand & System Tag */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all ${
              alarmActive
                ? "border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-bounce"
                : "border-primary/40 bg-primary/10 text-primary shadow-inner"
            }`}
          >
            {alarmActive ? (
              <ShieldAlert className="h-7 w-7" />
            ) : mode === "DISARMED" ? (
              <Shield className="h-6 w-6 text-muted-foreground" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                SENTINEL SOC <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-primary/20 text-primary">v2.4.0</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-mono text-primary">
                <Radio className="h-3 w-3 animate-pulse" />
                ACTIVE SURVEILLANCE
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              PERIMETER DEFENSE // TRI-SENSOR TELEMETRY & BREACH DETECTION
            </p>
          </div>
        </div>

        {/* Threat Level HUD & Realtime Clock */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Threat Level Pill */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all ${threatColor}`}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  threatLevel === "BREACH"
                    ? "animate-ping bg-rose-500"
                    : threatLevel === "HIGH"
                    ? "animate-ping bg-orange-400"
                    : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  threatLevel === "BREACH"
                    ? "bg-rose-500"
                    : threatLevel === "HIGH"
                    ? "bg-orange-500"
                    : threatLevel === "ELEVATED"
                    ? "bg-amber-400"
                    : "bg-emerald-500"
                }`}
              />
            </span>
            <span>THREAT LEVEL: {threatLevel}</span>
          </div>

          {/* Clock HUD */}
          <div className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-1 text-right font-mono">
            <div className="text-base font-bold tracking-wider text-foreground">
              {time || "00:00:00"}
            </div>
            <div className="text-[10px] text-muted-foreground">{utcTime}</div>
          </div>
        </div>
      </div>

      {/* Bottom row: Arming Modes + Sound + Test Siren + Emergency Broadcast */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Mode selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/50 p-1 text-xs">
          <span className="px-2 text-[11px] font-mono font-semibold uppercase text-muted-foreground">
            ARM STATE:
          </span>
          {(
            [
              ["ARMED_AWAY", "Armed (Away)", "hover:border-emerald-500/50"],
              ["ARMED_PERIMETER", "Perimeter", "hover:border-blue-500/50"],
              ["ARMED_DOOR", "Door Only", "hover:border-cyan-500/50"],
              ["DISARMED", "Disarmed", "hover:border-amber-500/50"],
              ["MAINTENANCE", "Maint.", "hover:border-purple-500/50"],
            ] as const
          ).map(([val, label]) => {
            const isSelected = mode === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => onModeChange(val)}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-all ${
                  isSelected
                    ? val === "DISARMED"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : val === "MAINTENANCE"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                      : "bg-primary text-primary-foreground font-semibold shadow-md"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Action Controls & Hardware Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Mute/Enable */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? "Mute Buzzer" : "Enable Siren Audio"}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-medium transition-all ${
              soundEnabled
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border/80 bg-background/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-primary" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            <span>{soundEnabled ? "SIREN AUDIO ON" : "MUTED"}</span>
          </button>

          {/* Test Siren Button */}
          <button
            type="button"
            onClick={onTestSiren}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/50 px-3 py-1.5 text-xs font-mono text-muted-foreground transition-all hover:border-warning/50 hover:bg-warning/10 hover:text-warning"
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>TEST SIREN</span>
          </button>

          {/* Emergency Alarm Override / Panic */}
          <button
            type="button"
            onClick={onTriggerEmergency}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold tracking-wider transition-all ${
              alarmActive
                ? "border-rose-500 bg-rose-600 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.7)]"
                : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{alarmActive ? "SILENCE SIREN" : "MANUAL SIREN"}</span>
          </button>

          {/* Firebase Connection Pill */}
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-mono">
            {!isConnected ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">OFFLINE / LOCAL</span>
              </>
            ) : connectionError ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive">LINK ERR</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">FIREBASE RTDB LIVE</span>
                <span className="text-[10px] text-muted-foreground border-l border-border pl-1.5">24ms</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
