export interface KeystrokeEvent {
  key: string;
  action: "insert" | "delete";
  timestamp: number;
  value: string;
}