export type SeverityLevel = "CRITICAL" | "WARNING" | "NOTICE" | "INFO";

export type EventCategory =
  | "perimeter"
  | "access"
  | "motion"
  | "radar"
  | "system"
  | "patrol"
  | "dispatch";

export type SecurityMode =
  | "ARMED_AWAY"
  | "ARMED_PERIMETER"
  | "ARMED_DOOR"
  | "DISARMED"
  | "MAINTENANCE";

export type ThreatLevel = "NORMAL" | "ELEVATED" | "HIGH" | "BREACH";

export interface SecurityLogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  code: string;
  severity: SeverityLevel;
  category: EventCategory;
  zone: string;
  message: string;
  details?: string;
  telemetry?: {
    distanceCm?: number;
    motion?: boolean;
    doorOpen?: boolean;
    personNear?: boolean;
  };
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface SecurityStats {
  totalEvents: number;
  criticalCount: number;
  warningCount: number;
  motionCount: number;
  doorBreaches: number;
  uptimeHours: number;
}
