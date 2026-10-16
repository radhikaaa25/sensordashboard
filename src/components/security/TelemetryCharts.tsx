import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, Radio, BarChart3 } from "lucide-react";
import type { SecurityLogEntry } from "@/lib/security-types";

interface TelemetryChartsProps {
  distanceHistory: number[];
  logs: SecurityLogEntry[];
}

export function TelemetryCharts({
  distanceHistory,
  logs,
}: TelemetryChartsProps) {
  const chartData = distanceHistory.map((val, idx) => ({
    index: idx + 1,
    distance: Number(val.toFixed(1)),
  }));

  // Category statistics
  const categoryCounts = logs.reduce(
    (acc, cur) => {
      acc[cur.category] = (acc[cur.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Ultrasonic Distance Telemetry Scope */}
      <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h3 className="font-mono text-xs font-bold uppercase text-foreground">
              ULTRASONIC PROXIMITY WAVEFORM (HC-SR04)
            </h3>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            LAST {distanceHistory.length} READINGS
          </span>
        </div>

        <div className="mt-4 h-48 w-full font-mono text-xs">
          {distanceHistory.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Waiting for ultrasonic distance stream...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  domain={[0, 300]}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  unit="cm"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                  formatter={(val: number | string | undefined) => [`${val ?? 0} cm`, "Distance"]}
                  labelFormatter={(lbl) => `Sample #${lbl}`}
                />
                <ReferenceLine
                  y={50}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: "CRITICAL 50cm",
                    fill: "#f43f5e",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <ReferenceLine
                  y={150}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: "WARNING 150cm",
                    fill: "#f59e0b",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="distance"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#distGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Incident Breakdown by Category */}
      <div className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-mono text-xs font-bold uppercase text-foreground">
                INCIDENT DISTRIBUTION
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3 font-mono text-xs">
            {(
              [
                ["access", "Access & Door (MC-38)", "bg-emerald-500", "text-emerald-400"],
                ["motion", "Infrared Motion (PIR)", "bg-amber-500", "text-amber-400"],
                ["radar", "Radar Proximity (Sonar)", "bg-cyan-500", "text-cyan-400"],
                ["perimeter", "Perimeter Breach", "bg-rose-500", "text-rose-400"],
                ["patrol", "Guard Patrol & Check", "bg-purple-500", "text-purple-400"],
                ["system", "System & Link Events", "bg-sky-500", "text-sky-400"],
              ] as const
            ).map(([cat, label, barBg, textCol]) => {
              const count = categoryCounts[cat] || 0;
              const pct = logs.length > 0 ? Math.round((count / logs.length) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-bold ${textCol}`}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barBg} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
          <span>Total Logged Records:</span>
          <span className="font-bold text-foreground">{logs.length}</span>
        </div>
      </div>
    </div>
  );
}
