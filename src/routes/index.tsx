import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  DoorOpen,
  DoorClosed,
  Ruler,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  isFirebaseConfigured,
  subscribeSensors,
  type SensorData,
} from "@/lib/firebase";
import { enableAlarmAudio, startAlarm, stopAlarm } from "@/lib/alarm";
import { Bell, BellOff } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IoT Sensor Dashboard — Live Monitor" },
      {
        name: "description",
        content:
          "Real-time dashboard for IoT sensors: PIR motion, ultrasonic distance, and MC38 door status streamed from Firebase.",
      },
      { property: "og:title", content: "IoT Sensor Dashboard — Live Monitor" },
      {
        property: "og:description",
        content:
          "Real-time dashboard for IoT sensors: PIR motion, ultrasonic distance, and MC38 door status streamed from Firebase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const MAX_DISTANCE = 300; // cm, typical HC-SR04 useful range cap for display
const HISTORY_LEN = 40;
// Alarm auto-arms outside store hours (default 6 PM → 9 AM local time)
function toMinutes(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isAfterHours(closeTime: string, openTime: string, now = new Date()) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const close = toMinutes(closeTime);
  const open = toMinutes(openTime);
  // Overnight window (e.g. 18:00 → 09:00) vs same-day window
  return close > open ? cur >= close || cur < open : cur >= close && cur < open;
}

function Dashboard() {
  const [data, setData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [motionEvents, setMotionEvents] = useState(0);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [triggerDoor, setTriggerDoor] = useState(true);
  const [triggerMotion, setTriggerMotion] = useState(false);
  const [triggerPerson, setTriggerPerson] = useState(true);
  const [closeTime, setCloseTime] = useState("18:00");
  const [openTime, setOpenTime] = useState("09:00");
  const [testing, setTesting] = useState(false);
  const [afterHours, setAfterHours] = useState(() =>
    isAfterHours("18:00", "09:00"),
  );
  const prevMotion = useRef(false);

  const personNear = Boolean(data?.personNear);
  const motion = Boolean(data?.motion);
  const doorOpen = Boolean(data?.doorOpen);
  const alarmArmed = alarmEnabled && afterHours;
  const alarmTriggered =
    testing ||
    (alarmArmed &&
      ((triggerPerson && personNear) ||
        (triggerDoor && doorOpen) ||
        (triggerMotion && motion)));

  // Re-check the store-hours window every 15 seconds so minute changes count
  useEffect(() => {
    const check = () => setAfterHours(isAfterHours(closeTime, openTime));
    check();
    const t = setInterval(check, 15_000);
    return () => clearInterval(t);
  }, [closeTime, openTime]);

  useEffect(() => {
    if (alarmTriggered) startAlarm();
    else stopAlarm();
    return stopAlarm;
  }, [alarmTriggered]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return subscribeSensors(
      (d) => {
        setData(d);
        setError(null);
        setHistory((h) => [...h, d.distance].slice(-HISTORY_LEN));
        if (d.motion && !prevMotion.current) setMotionEvents((c) => c + 1);
        prevMotion.current = d.motion;
      },
      (err) => setError(err.message),
    );
  }, []);

  const distancePct = data
    ? Math.min(100, (data.distance / MAX_DISTANCE) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                IoT Sensor Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                PIR motion · Ultrasonic distance · MC38 door
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!alarmEnabled) enableAlarmAudio();
              setAlarmEnabled((v) => !v);
            }}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
              alarmEnabled
                ? "border-warning/50 bg-warning/10 text-warning"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {alarmEnabled ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
            {alarmEnabled
              ? alarmTriggered
                ? "ALARM RINGING"
                : afterHours
                  ? "Alarm armed"
                  : `Alarm on (arms ${closeTime})`
              : "Alarm off"}
          </button>
          <button
            onClick={() => {
              enableAlarmAudio();
              setTesting(true);
              setTimeout(() => setTesting(false), 3000);
            }}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Test alarm
          </button>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <span>Triggers:</span>
            {(
              [
                ["Door", triggerDoor, setTriggerDoor],
                ["Motion", triggerMotion, setTriggerMotion],
                ["Person", triggerPerson, setTriggerPerson],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setter(e.target.checked)}
                  className="accent-primary"
                />
                <span className={value ? "text-foreground" : ""}>{label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <label htmlFor="close-time">Arms</label>
            <input
              id="close-time"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="rounded bg-transparent text-foreground outline-none"
            />
            <label htmlFor="open-time">to</label>
            <input
              id="open-time"
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="rounded bg-transparent text-foreground outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            {!isFirebaseConfigured ? (
              <>
                <WifiOff className="h-4 w-4 text-warning" />
                <span className="text-warning">Firebase not configured</span>
              </>
            ) : error ? (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="text-destructive">Connection error</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                <Wifi className="h-4 w-4 text-success" />
                <span>Live from Firebase</span>
              </>
            )}
          </div>
        </header>

        {!isFirebaseConfigured && (
          <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            Firebase isn't configured yet. Add your database URL to a .env file
            (see .env.example) — the dashboard will then show your live
            readings.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {/* Motion */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Motion (PIR)
              </h2>
              <Activity
                className={`h-5 w-5 ${data?.motion ? "text-warning" : "text-muted-foreground"}`}
              />
            </div>
            <p
              className={`mt-4 text-3xl font-bold ${data?.motion ? "text-warning" : ""}`}
            >
              {data ? (data.motion ? "Motion detected" : "No motion") : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {motionEvents} trigger{motionEvents === 1 ? "" : "s"} this session
              {data?.personNear ? " · person near" : ""}
            </p>
            <div
              className={`mt-4 h-1.5 rounded-full transition-colors ${data?.motion ? "bg-warning" : "bg-muted"}`}
            />
          </section>

          {/* Distance */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Distance (Ultrasonic)
              </h2>
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-bold text-primary">
              {data ? `${data.distance.toFixed(1)} cm` : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Range 0–{MAX_DISTANCE} cm
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${distancePct}%` }}
              />
            </div>
          </section>

          {/* Door */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Door (MC38)
              </h2>
              {data?.doorOpen ? (
                <DoorOpen className="h-5 w-5 text-destructive" />
              ) : (
                <DoorClosed className="h-5 w-5 text-success" />
              )}
            </div>
            <p
              className={`mt-4 text-3xl font-bold ${data?.doorOpen ? "text-destructive" : "text-success"}`}
            >
              {data ? (data.doorOpen ? "Open" : "Closed") : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Magnetic reed switch
            </p>
            <div
              className={`mt-4 h-1.5 rounded-full transition-colors ${data?.doorOpen ? "bg-destructive" : "bg-success"}`}
            />
          </section>
        </div>

        {/* Distance history sparkline */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Distance history
            </h2>
            <span className="text-xs text-muted-foreground">
              Last {HISTORY_LEN} readings
            </span>
          </div>
          <div className="mt-4 flex h-28 items-end gap-1">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Waiting for readings…
              </p>
            )}
            {history.map((d, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70 transition-all duration-300"
                style={{
                  height: `${Math.max(4, Math.min(100, (d / MAX_DISTANCE) * 100))}%`,
                }}
                title={`${d} cm`}
              />
            ))}
          </div>
        </section>

        <footer className="mt-6 text-xs text-muted-foreground">
          {data
            ? `Last update: ${new Date(data.updatedAt).toLocaleTimeString()}`
            : isFirebaseConfigured
              ? "Waiting for sensor readings…"
              : "No data source connected."}
        </footer>
      </div>
    </div>
  );
}
