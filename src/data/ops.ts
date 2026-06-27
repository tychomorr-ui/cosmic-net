import opsRaw from "./terminus-ops.json";

export type OpsEntry = {
  ts: string;
  level: "CMD" | "INFO" | "WARN" | "STANDBY" | string;
  subsystem: string;
  command: string;
  result: string;
  sessionId: string;
};

export const OPS_LOG: OpsEntry[] = opsRaw as OpsEntry[];

// Declared gateway domains, lifted from the artifact itself (sam.status).
// The /ops route binds each entry to live probes against these.
export const DECLARED_GATEWAYS = [
  { host: "tesseract.manus.space", url: "https://tesseract.manus.space" },
  { host: "nexinus.net", url: "https://nexinus.net" },
  { host: "valkyrie-nexinus.net", url: "https://valkyrie-nexinus.net" },
  { host: "xinus.one", url: "https://xinus.one" },
  { host: "monarch.xinus.one", url: "https://monarch.xinus.one/health" },
] as const;

export const OPS_ARTIFACT_NAME = "terminus-ops-2026-06-25.json";
