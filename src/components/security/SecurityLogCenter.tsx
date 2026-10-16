import { useState, useMemo, useRef, useEffect } from "react";
import {
  ListFilter,
  Search,
  Download,
  Trash2,
  PlusCircle,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  CheckCheck,
  FileSpreadsheet,
  FileCode,
  Radio,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import type {
  SecurityLogEntry,
  SeverityLevel,
  EventCategory,
} from "@/lib/security-types";
import {
  exportLogsToCsv,
  exportLogsToJson,
  createLogEntry,
} from "@/lib/security-logs";

interface SecurityLogCenterProps {
  logs: SecurityLogEntry[];
  sensorsInactive?: boolean;
  onAddLog: (entry: SecurityLogEntry) => void;
  onClearLogs: () => void;
  onAcknowledgeLog: (id: string) => void;
}

export function SecurityLogCenter({
  logs,
  sensorsInactive = false,
  onAddLog,
  onClearLogs,
  onAcknowledgeLog,
}: SecurityLogCenterProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "critical" | "access" | "motion_radar" | "system"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Manual log form state
  const [manualCategory, setManualCategory] = useState<EventCategory>("patrol");
  const [manualSeverity, setManualSeverity] = useState<SeverityLevel>("INFO");
  const [manualZone, setManualZone] = useState("Station Guard Patrol");
  const [manualMessage, setManualMessage] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: logs.length,
      critical: logs.filter((l) => l.severity === "CRITICAL").length,
      access: logs.filter((l) => l.category === "access" || l.category === "perimeter").length,
      motion_radar: logs.filter((l) => l.category === "motion" || l.category === "radar").length,
      system: logs.filter((l) => l.category === "system" || l.category === "patrol" || l.category === "dispatch").length,
    };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Tab filter
      if (activeTab === "critical" && log.severity !== "CRITICAL") return false;
      if (activeTab === "access" && log.category !== "access" && log.category !== "perimeter") return false;
      if (activeTab === "motion_radar" && log.category !== "motion" && log.category !== "radar") return false;
      if (activeTab === "system" && !["system", "patrol", "dispatch"].includes(log.category)) return false;

      // Severity filter
      if (severityFilter !== "ALL" && log.severity !== severityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          log.message.toLowerCase().includes(q) ||
          log.zone.toLowerCase().includes(q) ||
          log.code.toLowerCase().includes(q) ||
          (log.details && log.details.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, activeTab, severityFilter, searchQuery]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMessage.trim()) return;

    const newLog = createLogEntry({
      code: `MAN-${Math.floor(100 + Math.random() * 900)}`,
      severity: manualSeverity,
      category: manualCategory,
      zone: manualZone,
      message: manualMessage,
      details: "Manual entry submitted by security desk console operator.",
    });

    onAddLog(newLog);
    setManualMessage("");
    setShowAddModal(false);
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-rose-400 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="h-3 w-3" />
            CRITICAL
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            WARNING
          </span>
        );
      case "NOTICE":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-500/20 px-2 py-0.5 text-[11px] font-mono font-medium text-sky-400 border border-sky-500/30">
            <Info className="h-3 w-3" />
            NOTICE
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground border border-border/40">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xl">
      {/* Title & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            <h2 className="text-base font-extrabold uppercase tracking-tight text-foreground font-mono">
              SECURITY AUDIT & INCIDENT LOGS
            </h2>
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              {filteredLogs.length} / {logs.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground font-mono">
              Mission-critical event streaming · Tamper & perimeter tripwire tracking
            </p>
            {sensorsInactive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                LOGGING PAUSED (SENSORS INACTIVE)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LOGGING ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Global actions: Clear Logs, Add manual note, Export CSV/JSON */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Clear Logs Button */}
          <button
            type="button"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs font-mono font-bold text-destructive hover:bg-destructive hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm"
            title="Clear all event logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>CLEAR LOGS</span>
          </button>

          {/* Manual Entry button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-mono font-semibold text-primary transition-all hover:bg-primary/20"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ ADD LOG NOTE</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportLogsToCsv(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/50 px-2.5 py-1.5 text-xs font-mono text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            title="Download full incident logs as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={() => exportLogsToJson(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/50 px-2.5 py-1.5 text-xs font-mono text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            title="Download full logs as JSON"
          >
            <FileCode className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap rounded-xl border border-border/60 bg-background/60 p-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ALL ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("critical")}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              activeTab === "critical"
                ? "bg-rose-500 text-white font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            CRITICAL ({counts.critical})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              activeTab === "access"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ACCESS & DOORS ({counts.access})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("motion_radar")}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              activeTab === "motion_radar"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            MOTION / RADAR ({counts.motion_radar})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              activeTab === "system"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            SYSTEM & PATROL ({counts.system})
          </button>
        </div>

        {/* Search input + Severity filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs by keyword/code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64 rounded-lg border border-border/80 bg-background/60 py-1.5 pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Severity selector */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="CRITICAL">CRITICAL ONLY</option>
            <option value="WARNING">WARNING ONLY</option>
            <option value="NOTICE">NOTICE ONLY</option>
            <option value="INFO">INFO ONLY</option>
          </select>
        </div>
      </div>

      {/* Manual Entry Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-mono text-sm font-bold uppercase text-foreground">
                + LOG MANUAL INCIDENT / OPERATOR PATROL NOTE
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground font-mono text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">
                  SEVERITY:
                </label>
                <div className="flex gap-2 font-mono text-xs">
                  {(["INFO", "NOTICE", "WARNING", "CRITICAL"] as SeverityLevel[]).map(
                    (sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setManualSeverity(sev)}
                        className={`rounded px-3 py-1 font-bold transition-all ${
                          manualSeverity === sev
                            ? sev === "CRITICAL"
                              ? "bg-rose-500 text-white"
                              : sev === "WARNING"
                              ? "bg-amber-500 text-black"
                              : sev === "NOTICE"
                              ? "bg-sky-500 text-white"
                              : "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {sev}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">
                  CATEGORY & SOURCE ZONE:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as EventCategory)}
                    className="rounded border border-border bg-background p-2 font-mono text-xs"
                  >
                    <option value="patrol">Guard Patrol</option>
                    <option value="perimeter">Perimeter Defense</option>
                    <option value="access">Access Control</option>
                    <option value="system">System Maintenance</option>
                    <option value="dispatch">Dispatch Call</option>
                  </select>
                  <input
                    type="text"
                    value={manualZone}
                    onChange={(e) => setManualZone(e.target.value)}
                    placeholder="Sector / Zone name..."
                    className="rounded border border-border bg-background p-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">
                  INCIDENT / PATROL DESCRIPTION:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Patrol guard verified perimeter fence and door magnetic contacts intact."
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  className="w-full rounded border border-border bg-background p-2 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-border bg-background px-4 py-2 font-mono text-xs text-muted-foreground hover:bg-muted"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-md"
                >
                  LOG INCIDENT NOW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div
        ref={scrollRef}
        className="mt-4 max-h-[360px] overflow-y-auto rounded-xl border border-border/60 bg-background/50 divide-y divide-border/40 font-mono text-xs"
      >
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono">
            {logs.length === 0 ? (
              <>
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-400/80 mb-2" />
                <p className="font-bold text-foreground text-sm">Event logs have been cleared.</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {sensorsInactive
                    ? "Sensors are inactive — automatic logging is paused until active sensor signals resume."
                    : "Awaiting next sensor trigger or operator log entry..."}
                </p>
              </>
            ) : (
              <>
                <Radio className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p>No security events matching current criteria.</p>
              </>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => {
            return (
              <div
                key={log.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 transition-colors hover:bg-muted/30 ${
                  log.severity === "CRITICAL"
                    ? "bg-rose-950/20"
                    : log.severity === "WARNING"
                    ? "bg-amber-950/10"
                    : ""
                }`}
              >
                {/* Left side: Time, Code, Badge, Zone */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {log.timeString}
                  </span>
                  <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-bold text-foreground border border-border/60">
                    {log.code}
                  </span>
                  {getSeverityBadge(log.severity)}
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary font-semibold">
                    {log.zone}
                  </span>
                </div>

                {/* Center / Message */}
                <div className="flex-1 sm:px-3">
                  <p className="font-semibold text-foreground text-xs leading-relaxed">
                    {log.message}
                  </p>
                  {log.details && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {log.details}
                    </p>
                  )}
                </div>

                {/* Right side: Acknowledgement status / action */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {log.severity === "CRITICAL" && !log.acknowledged ? (
                    <button
                      type="button"
                      onClick={() => onAcknowledgeLog(log.id)}
                      className="rounded bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-600 shadow-sm"
                    >
                      ACKNOWLEDGE
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckCheck className="h-3 w-3 text-emerald-400" />
                      LOGGED
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
