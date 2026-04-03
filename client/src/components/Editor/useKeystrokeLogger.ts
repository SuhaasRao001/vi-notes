import { useState } from "react";
import type { KeystrokeEvent } from "../../types/keystroke";

export const useKeystrokeLogger = () => {
  const [events, setEvents] = useState<KeystrokeEvent[]>([]);

  const logKey = (
    key: string,
    action: "insert" | "delete",
    value: string
  ) => {
    setEvents((prev) => [
      ...prev,
      {
        key,
        action,
        timestamp: Date.now(),
        value,
      },
    ]);
  };

  const reset = () => setEvents([]);

  return { events, logKey, reset };
};