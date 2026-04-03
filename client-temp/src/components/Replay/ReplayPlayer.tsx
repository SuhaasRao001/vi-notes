import React, { useState } from "react";
import { replayEvents } from "./replayUtils";
import { KeystrokeEvent } from "../../types/keystroke";

const ReplayPlayer = () => {
  const [text, setText] = useState("");

  const startReplay = () => {
    const stored = localStorage.getItem("session");
    if (!stored) return alert("No session found");

    const events: KeystrokeEvent[] = JSON.parse(stored);
    replayEvents(events, setText);
  };

  return (
    <div>
      <h2>Replay</h2>
      <button onClick={startReplay}>Start Replay</button>
      <div
        style={{
          border: "1px solid black",
          padding: "10px",
          minHeight: "100px",
          marginTop: "10px",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default ReplayPlayer;