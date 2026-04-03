import { KeystrokeEvent } from "../../types/keystroke";

export const replayEvents = (
  events: KeystrokeEvent[],
  onUpdate: (text: string) => void
) => {
  let text = "";

  events.forEach((event, index) => {
    const delay =
      index === 0
        ? 0
        : event.timestamp - events[index - 1].timestamp;

    setTimeout(() => {
      if (event.action === "insert") {
        text += event.key;
      } else {
        text = text.slice(0, -1);
      }

      onUpdate(text);
    }, delay);
  });
};