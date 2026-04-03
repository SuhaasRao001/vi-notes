import { useState } from "react";
import { KeystrokeEvent } from "../../types/keystroke";

export const useKeystrokeLogger = () => {
  const [events, setEvents] = useState<KeystrokeEvent[]>([]);

  const logKey = (key: string, action: "insert" | "delete") => {
    setEvents((prev) => [
      ...prev,
      {
        key,
        action,
        timestamp: Date.now(),
      },
    ]);
  };

  const reset = () => setEvents([]);

  return { events, logKey, reset };
};