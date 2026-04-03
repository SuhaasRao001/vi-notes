import type { KeystrokeEvent } from "../../types/keystroke";

export const replayEvents = (
  events: KeystrokeEvent[],
  onUpdate: (text: string) => void
) => {
  events.forEach((event, index) => {
    const delay =
      index === 0
        ? 0
        : event.timestamp - events[index - 1].timestamp;

    setTimeout(() => {
      onUpdate(event.value);
    }, delay);
  });
};