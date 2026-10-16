import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  isFirebaseConfigured,
  subscribeSensors,
  type SensorData,
} from "@/lib/firebase";
import { enableAlarmAudio, startAlarm, stopAlarm } from "@/lib/alarm";
import type {
  SecurityLogEntry,
  SecurityMode,
  ThreatLevel,
} from "@/lib/security-types";
import {
  createLogEntry,
  getInitialSecurityLogs,
} from "@/lib/security-logs";
import { SecurityHeader } from "@/components/security/SecurityHeader";
import { SecurityKpiBar } from "@/components/security/SecurityKpiBar";
import { SensorZoneGrid } from "@/components/security/SensorZoneGrid";
import { SecurityLogCenter } from "@/components/security/SecurityLogCenter";
import { TelemetryCharts } from "@/components/security/TelemetryCharts";
import { SimulationControls } from "@/components/security/SimulationControls";
import { ShieldAlert, Clock, AlertTriangle, ClockAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel SOC — Realtime Security & IoT Surveillance Dashboard" },
      {
        name: "description",
        content:
          "Enterprise Security Operations Center (SOC) dashboard: Real-time PIR motion, ultrasonic distance sonar, MC-38 door breach detection, and full incident audit logging.",
      },
      {
        property: "og:title",
        content: "Sentinel SOC — Realtime Security & Surveillance",
      },
      {
        property: "og:description",
        content:
          "Enterprise IoT surveillance and intrusion detection dashboard connected to Firebase Realtime Database.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const HISTORY_LEN = 35;
const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

function toMinutes(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isAfterHours(closeTime: string, openTime: string, now = new Date()) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const close = toMinutes(closeTime);
  const open = toMinutes(openTime);
  return close > open ? cur >= close || cur < open : cur >= close && cur < open;
}

function Dashboard() {
  // Live hardware state from Firebase
  const [data, setData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([
    240, 245, 238, 242, 241, 239, 240, 244, 243, 240,
  ]);
  const [motionEvents, setMotionEvents] = useState(3);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Security operational mode
  const [securityMode, setSecurityMode] = useState<SecurityMode>("ARMED_AWAY");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualSirenOverride, setManualSirenOverride] = useState(false);

  // Tripwire triggers
  const [triggerDoor, setTriggerDoor] = useState(true);
  const [triggerMotion, setTriggerMotion] = useState(true);
  const [triggerPerson, setTriggerPerson] = useState(true);

  // Schedule auto-arming
  const [closeTime, setCloseTime] = useState("18:00");
  const [openTime, setOpenTime] = useState("09:00");
  const [afterHours, setAfterHours] = useState(() =>
    isAfterHours("18:00", "09:00")
  );

  // Security Incident Audit Logs
  const [logs, setLogs] = useState<SecurityLogEntry[]>(() =>
    getInitialSecurityLogs()
  );

  // State refs to detect rising/falling edges for logging
  const prevMotionRef = useRef<boolean>(false);
  const prevDoorRef = useRef<boolean>(false);
  const prevDistanceRef = useRef<number>(240);
  const prevAlarmStateRef = useRef<boolean>(false);
  const prevStaleRef = useRef<boolean>(false);

  // Interval to update currentTime every 2 seconds for fresh 5-minute timeout evaluation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Check schedule every 15s
  useEffect(() => {
    const check = () => setAfterHours(isAfterHours(closeTime, openTime));
    check();
    const t = setInterval(check, 15_000);
    return () => clearInterval(t);
  }, [closeTime, openTime]);

  // Check if last updated time is >= 5 minutes (300,000 ms)
  const isStale = Boolean(data && currentTime - data.updatedAt >= STALE_TIMEOUT_MS);

  // If last updated time is >= 5 minutes (or no data), reset all values to 0
  const activeData = useMemo(() => {
    if (!data) return null;
    if (isStale) {
      return {
        ...data,
        distance: 0,
        motion: false,
        doorOpen: false,
        personNear: false,
      };
    }
    return data;
  }, [data, isStale]);

  // Derived sensor values (reset to 0 when stale or missing)
  const currentDistance = activeData?.distance ?? 0;
  const isDoorOpen = Boolean(activeData?.doorOpen);
  const isMotion = Boolean(activeData?.motion);
  const isPersonNear = Boolean(activeData?.personNear || (currentDistance > 0 && currentDistance < 50));

  // Sensors are considered inactive if:
  // - No telemetry data has been received (!data)
  // - Telemetry is stale >= 5 minutes (isStale)
  // - Readings are at baseline 0/idle (currentDistance === 0 && !isMotion && !isDoorOpen)
  const areSensorsInactive =
    !data ||
    isStale ||
    (currentDistance === 0 && !isMotion && !isDoorOpen);

  // Append new log entry helper — do NOT log anything if sensors are inactive
  const addLog = useCallback(
    (entry: SecurityLogEntry) => {
      // Allow manual operator entries
      const isManual = entry.code.startsWith("MAN-");
      if (areSensorsInactive && !isManual) {
        // Sensors are inactive: completely suppress automatic logging
        return;
      }
      setLogs((prev) => [entry, ...prev]);
    },
    [areSensorsInactive]
  );

  // Determine if tripwires are armed based on mode & schedule
  const isArmed =
    securityMode === "ARMED_AWAY" ||
    securityMode === "ARMED_DOOR" ||
    (securityMode === "ARMED_PERIMETER" && afterHours);

  // Perimeter breach conditions (When in Door Only mode, motion and radar are bypassed)
  const isPerimeterBreached =
    (triggerDoor && isDoorOpen) ||
    (triggerMotion && isMotion && securityMode !== "ARMED_PERIMETER" && securityMode !== "ARMED_DOOR") ||
    (triggerPerson && isPersonNear && securityMode !== "ARMED_DOOR");

  const alarmTriggered =
    manualSirenOverride ||
    (isArmed && isPerimeterBreached);

  // Threat level matrix
  const threatLevel: ThreatLevel = useMemo(() => {
    if (alarmTriggered) return "BREACH";
    if (isDoorOpen) return "HIGH";
    if (securityMode !== "ARMED_DOOR") {
      if (currentDistance > 0 && currentDistance < 50) return "HIGH";
      if (isMotion || (currentDistance >= 50 && currentDistance < 150)) return "ELEVATED";
    }
    return "NORMAL";
  }, [alarmTriggered, isDoorOpen, isMotion, currentDistance, securityMode]);

  // Audio siren control
  useEffect(() => {
    if (alarmTriggered && soundEnabled) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return stopAlarm;
  }, [alarmTriggered, soundEnabled]);

  // Detect and log alarm trigger edge (suppressed if sensors are inactive)
  useEffect(() => {
    if (areSensorsInactive) return;
    if (alarmTriggered && !prevAlarmStateRef.current) {
      addLog(
        createLogEntry({
          code: "ALM-911",
          severity: "CRITICAL",
          category: "perimeter",
          zone: "Perimeter Alert System",
          message: manualSirenOverride
            ? "MANUAL EMERGENCY SIREN INITIATED BY OPERATOR"
            : "TRIPWIRE BREACH ACTIVATED: AUDIBLE SIREN SOUNDING",
          details: `Threat: ${threatLevel} | Door: ${isDoorOpen ? "OPEN" : "CLOSED"} | Motion: ${
            isMotion ? "ACTIVE" : "IDLE"
          } | Range: ${currentDistance.toFixed(1)}cm`,
        })
      );
    } else if (!alarmTriggered && prevAlarmStateRef.current) {
      addLog(
        createLogEntry({
          code: "ALM-900",
          severity: "NOTICE",
          category: "perimeter",
          zone: "Perimeter Alert System",
          message: "Perimeter alarm silenced & restored to monitoring state",
        })
      );
    }
    prevAlarmStateRef.current = alarmTriggered;
  }, [alarmTriggered, manualSirenOverride, threatLevel, isDoorOpen, isMotion, currentDistance, addLog]);

  // Subscribe to Firebase RTDB
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    return subscribeSensors(
      (newData) => {
        setData(newData);
        setError(null);

        // If telemetry packet is stale (>= 5 minutes), sensors are inactive — do not log!
        const isPacketStale = Date.now() - newData.updatedAt >= STALE_TIMEOUT_MS;
        if (isPacketStale) {
          prevMotionRef.current = newData.motion;
          prevDoorRef.current = newData.doorOpen;
          prevDistanceRef.current = newData.distance;
          return;
        }

        setHistory((h) => [...h, newData.distance].slice(-HISTORY_LEN));

        // 1. Motion Edge Detection
        if (newData.motion && !prevMotionRef.current) {
          setMotionEvents((c) => c + 1);
          addLog(
            createLogEntry({
              code: "PIR-042",
              severity: isArmed ? "CRITICAL" : "NOTICE",
              category: "motion",
              zone: "Zone 02 - PIR Motion Detector",
              message: isArmed
                ? "UNAUTHORIZED INTRUDER MOTION DETECTED WHILE ARMED"
                : "Infrared motion pulse logged in lobby sector",
              details: `PIR sensor triggered. Session count: ${motionEvents + 1}.`,
              telemetry: {
                motion: true,
                distanceCm: newData.distance,
                doorOpen: newData.doorOpen,
              },
            })
          );
        }
        prevMotionRef.current = newData.motion;

        // 2. Door Edge Detection
        if (newData.doorOpen !== prevDoorRef.current) {
          if (newData.doorOpen) {
            addLog(
              createLogEntry({
                code: "SEC-101",
                severity: isArmed ? "CRITICAL" : "WARNING",
                category: "access",
                zone: "Zone 01 - Main Entrance (MC-38)",
                message: isArmed
                  ? "PERIMETER BREACH: DOOR CONTACT OPENED DURING ARMED STATE"
                  : "Access portal opened — circuit loop broken",
                details: "Magnetic switch MC-38 contacts disengaged.",
                telemetry: {
                  doorOpen: true,
                  distanceCm: newData.distance,
                  motion: newData.motion,
                },
              })
            );
          } else {
            addLog(
              createLogEntry({
                code: "SEC-102",
                severity: "INFO",
                category: "access",
                zone: "Zone 01 - Main Entrance (MC-38)",
                message: "Access portal closed & magnetic contact engaged",
                details: "Circuit integrity restored (Closed loop).",
                telemetry: {
                  doorOpen: false,
                  distanceCm: newData.distance,
                },
              })
            );
          }
          prevDoorRef.current = newData.doorOpen;
        }

        // 3. Distance Proximity Edge Detection (<50cm threshold)
        if (newData.distance > 0 && newData.distance < 50 && prevDistanceRef.current >= 50) {
          addLog(
            createLogEntry({
              code: "RAD-077",
              severity: isArmed ? "CRITICAL" : "WARNING",
              category: "radar",
              zone: "Zone 03 - Ultrasonic Radar (HC-SR04)",
              message: `Intrusion into critical proximity buffer (${newData.distance.toFixed(1)} cm)`,
              details: "Ultrasonic echo return collapsed below 50cm safety boundary.",
              telemetry: {
                distanceCm: newData.distance,
                personNear: true,
              },
            })
          );
        }
        prevDistanceRef.current = newData.distance;
      },
      (err) => {
        setError(err.message);
        addLog(
          createLogEntry({
            code: "NET-500",
            severity: "WARNING",
            category: "system",
            zone: "Firebase Client",
            message: `Telemetry stream disrupted: ${err.message}`,
          })
        );
      }
    );
  }, [isArmed, motionEvents, addLog]);

  // Security mode change handler
  const handleModeChange = (newMode: SecurityMode) => {
    setSecurityMode(newMode);
    addLog(
      createLogEntry({
        code: "SYS-301",
        severity: newMode === "DISARMED" ? "WARNING" : "NOTICE",
        category: "system",
        zone: "Security Console",
        message: `Security arming mode updated to: ${newMode}`,
        details: `Operator changed arm state. Scheduled after-hours active: ${
          afterHours ? "YES" : "NO"
        }.`,
      })
    );
  };

  // Sound toggle
  const handleToggleSound = () => {
    if (!soundEnabled) enableAlarmAudio();
    setSoundEnabled((v) => !v);
  };

  // Test Siren
  const handleTestSiren = () => {
    enableAlarmAudio();
    startAlarm();
    addLog(
      createLogEntry({
        code: "TST-001",
        severity: "NOTICE",
        category: "system",
        zone: "Acoustic Siren Module",
        message: "Manual acoustic siren diagnostic pulse executed (3s)",
      })
    );
    setTimeout(() => {
      stopAlarm();
    }, 3000);
  };

  // Manual emergency panic trigger
  const handleTriggerEmergency = () => {
    enableAlarmAudio();
    setManualSirenOverride((v) => !v);
  };

  // Acknowledge critical log
  const handleAcknowledgeLog = (id: string) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, acknowledged: true } : l))
    );
  };

  // Simulation test handlers (for instant interactive testing)
  const handleSimulateDoor = () => {
    const nextDoor = !isDoorOpen;
    setData((d) => ({
      distance: d?.distance ?? 240,
      motion: d?.motion ?? false,
      personNear: d?.personNear ?? false,
      doorOpen: nextDoor,
      updatedAt: Date.now(),
    }));
    addLog(
      createLogEntry({
        code: nextDoor ? "SIM-010" : "SIM-011",
        severity: nextDoor && isArmed ? "CRITICAL" : "NOTICE",
        category: "access",
        zone: "Zone 01 - Access Portal",
        message: nextDoor
          ? "SIMULATION: Door contact pulled OPEN"
          : "SIMULATION: Door contact engaged CLOSED",
      })
    );
  };

  const handleSimulateMotion = () => {
    const nextMotion = !isMotion;
    setData((d) => ({
      distance: d?.distance ?? 240,
      motion: nextMotion,
      personNear: d?.personNear ?? false,
      doorOpen: d?.doorOpen ?? false,
      updatedAt: Date.now(),
    }));
    if (nextMotion) setMotionEvents((c) => c + 1);
    addLog(
      createLogEntry({
        code: nextMotion ? "SIM-020" : "SIM-021",
        severity: nextMotion && isArmed ? "CRITICAL" : "NOTICE",
        category: "motion",
        zone: "Zone 02 - Motion Sensor",
        message: nextMotion
          ? "SIMULATION: Motion detector triggered ACTIVE"
          : "SIMULATION: Motion cleared to IDLE",
      })
    );
  };

  const handleSimulateProximity = (cm: number) => {
    setData((d) => ({
      distance: cm,
      motion: d?.motion ?? false,
      personNear: cm < 50,
      doorOpen: d?.doorOpen ?? false,
      updatedAt: Date.now(),
    }));
    setHistory((h) => [...h, cm].slice(-HISTORY_LEN));
    addLog(
      createLogEntry({
        code: "SIM-030",
        severity: cm < 50 && isArmed ? "CRITICAL" : "WARNING",
        category: "radar",
        zone: "Zone 03 - Ultrasonic Radar",
        message: `SIMULATION: Target approach simulated at ${cm.toFixed(1)} cm`,
      })
    );
  };

  const handleSimulateStale = () => {
    const fiveMinsAndFiveSecAgo = Date.now() - (5 * 60 * 1000 + 5000);
    setData({
      distance: 0,
      motion: false,
      doorOpen: false,
      personNear: false,
      updatedAt: fiveMinsAndFiveSecAgo,
    });
  };

  const handleResetSafe = () => {
    setData({
      distance: 240,
      motion: false,
      personNear: false,
      doorOpen: false,
      updatedAt: Date.now(),
    });
    setManualSirenOverride(false);
    stopAlarm();
    addLog(
      createLogEntry({
        code: "SIM-001",
        severity: "INFO",
        category: "system",
        zone: "Simulation Lab",
        message: "SIMULATION: All sensors restored to baseline safe conditions (fresh timestamp)",
      })
    );
  };

  const criticalCount = logs.filter((l) => l.severity === "CRITICAL").length;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Alarm Banner if ringing */}
        {alarmTriggered && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-rose-500 bg-rose-600/20 px-6 py-4 shadow-[0_0_30px_rgba(244,63,94,0.5)] animate-pulse backdrop-blur-md">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-rose-500 animate-bounce" />
              <div>
                <h2 className="text-lg font-black tracking-wider text-rose-400 font-mono">
                  CRITICAL SECURITY ALARM IN EFFECT
                </h2>
                <p className="text-xs text-rose-300 font-mono">
                  Perimeter breach detected in active armed sector · Acoustic alarm sounding
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setManualSirenOverride(false);
                setSecurityMode("DISARMED");
                stopAlarm();
              }}
              className="rounded-xl bg-rose-600 px-5 py-2.5 font-mono text-xs font-black text-white hover:bg-rose-700 shadow-lg"
            >
              DISARM & SILENCE SIREN
            </button>
          </div>
        )}

        {/* 1. Header with System HUD */}
        <SecurityHeader
          mode={securityMode}
          threatLevel={threatLevel}
          alarmActive={alarmTriggered}
          soundEnabled={soundEnabled}
          isConnected={isFirebaseConfigured}
          connectionError={error}
          onModeChange={handleModeChange}
          onToggleSound={handleToggleSound}
          onTestSiren={handleTestSiren}
          onTriggerEmergency={handleTriggerEmergency}
        />

        {/* Stale Timeout Warning Banner (>= 5 minutes) */}
        {isStale && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-xs font-mono text-amber-300 shadow-md">
            <div className="flex items-center gap-2">
              <ClockAlert className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
              <span>
                <strong>SENSOR TIMEOUT WARNING:</strong> No telemetry received for &ge; 5 minutes (last received {data ? new Date(data.updatedAt).toLocaleTimeString() : "—"}). All sensor values have automatically reset to 0.
              </span>
            </div>
            <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/40">
              VALUES RESET TO 0
            </span>
          </div>
        )}

        {/* Firebase Config Notice if missing */}
        {!isFirebaseConfigured && (
          <div className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-3 text-xs font-mono text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Firebase connection parameters not fully set in .env. Interactive simulation & test controls below are active for testing!
            </span>
          </div>
        )}

        {/* 2. KPI Metrics Bar */}
        <SecurityKpiBar
          isPerimeterBreached={isPerimeterBreached}
          activeSensorsCount={isStale ? 0 : 3}
          criticalEventsCount={criticalCount}
          totalLogsCount={logs.length}
          currentDistance={currentDistance}
          doorOpen={isDoorOpen}
          motionDetected={isMotion}
          isAfterHours={afterHours}
          armScheduleText={`Auto-arms ${closeTime} to ${openTime}`}
        />

        {/* 3. Schedule & Arming Window Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 px-5 py-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">AUTOMATED SURVEILLANCE SCHEDULE:</span>
            <span className="text-muted-foreground">Arms automatically outside operating hours</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="close-time" className="text-muted-foreground">Close:</label>
            <input
              id="close-time"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-foreground"
            />
            <label htmlFor="open-time" className="text-muted-foreground">Open:</label>
            <input
              id="open-time"
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-foreground"
            />
            <span
              className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                afterHours
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {afterHours ? "AFTER-HOURS (ARMED)" : "BUSINESS HOURS (DISARMED)"}
            </span>
          </div>
        </div>

        {/* 4. Physical Sensor Zones Grid */}
        <SensorZoneGrid
          data={activeData}
          motionEvents={motionEvents}
          triggerDoor={triggerDoor}
          triggerMotion={triggerMotion}
          triggerPerson={triggerPerson}
          onToggleDoorTrigger={setTriggerDoor}
          onToggleMotionTrigger={setTriggerMotion}
          onTogglePersonTrigger={setTriggerPerson}
        />

        {/* 5. Telemetry & Analytics Charts */}
        <TelemetryCharts
          distanceHistory={history}
          logs={logs}
        />

        {/* 6. Comprehensive Security Incident & Audit Logs */}
        <SecurityLogCenter
          logs={logs}
          sensorsInactive={areSensorsInactive}
          onAddLog={addLog}
          onClearLogs={() => setLogs([])}
          onAcknowledgeLog={handleAcknowledgeLog}
        />

        {/* 7. Hardware Test Harness / Simulation Controls */}
        <SimulationControls
          onSimulateDoor={handleSimulateDoor}
          onSimulateMotion={handleSimulateMotion}
          onSimulateProximity={handleSimulateProximity}
          onSimulateStale={handleSimulateStale}
          onResetSafe={handleResetSafe}
          doorOpen={isDoorOpen}
          motion={isMotion}
          distance={currentDistance}
          isStale={isStale}
        />

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between border-t border-border/50 pt-4 text-xs font-mono text-muted-foreground">
          <div>
            SENTINEL SECURITY SYSTEM · Firebase RTDB Connected:{" "}
            {isFirebaseConfigured ? "YES" : "STANDALONE"}
          </div>
          <div>
            {data
              ? isStale
                ? `Last Packet: ${new Date(data.updatedAt).toLocaleTimeString()} (TIMEOUT >= 5m — all values reset to 0)`
                : `Last Packet: ${new Date(data.updatedAt).toLocaleTimeString()} (Active)`
              : "Monitoring sensor loop..."}
          </div>
        </footer>
      </div>
    </div>
  );
}
