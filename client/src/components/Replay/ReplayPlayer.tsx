import React, { useEffect, useRef, useState } from "react";
import type { KeystrokeEvent } from "../../types/keystroke";

type SavedSession = {
  id: string;
  name: string;
  createdAt: number;
  events: KeystrokeEvent[];
};

const detectPaste = (events: KeystrokeEvent[]) => {
  if (events.length < 5) return false;
  let fastBursts = 0;
  for (let i = 1; i < events.length; i++) {
    const interval = events[i].timestamp - events[i - 1].timestamp;
    if (interval < 50) fastBursts++;
  }
  return fastBursts > events.length * 0.3;
};

const ReplayPlayer = () => {
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => {
    const stored = localStorage.getItem("savedSessions");
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });
  const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Select a session to replay");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const setSelection = (session: SavedSession) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    playingRef.current = false;
    pausedRef.current = false;
    currentIndexRef.current = 0;

    setSelectedSession(session);
    setText(session.events.length ? session.events[0].value : "");
    setCurrentIndex(0);
    setStatus(`Selected: ${session.name}`);
    setIsPlaying(false);
    setIsPaused(false);
  };

  const scheduleNext = () => {
    if (!selectedSession) return;

    const events = selectedSession.events;
    const index = currentIndexRef.current;

    if (index >= events.length) {
      setStatus("Replay complete");
      setIsPlaying(false);
      playingRef.current = false;
      return;
    }

    const event = events[index];
    const prev = index > 0 ? events[index - 1] : null;
    const delay = prev ? Math.max(event.timestamp - prev.timestamp, 35) : 35;
    const adjustedDelay = delay / playbackSpeed;

    timerRef.current = window.setTimeout(() => {
      if (!playingRef.current || pausedRef.current) return;

      setText(event.value);
      setCurrentIndex((prevIndex) => prevIndex + 1);
      currentIndexRef.current += 1;

      if (currentIndexRef.current < events.length) {
        scheduleNext();
      } else {
        setStatus("Replay complete");
        setIsPlaying(false);
        playingRef.current = false;
      }
    }, adjustedDelay);
  };

  const startReplay = () => {
    if (!selectedSession) {
      return alert("Please select a session first");
    }

    if (!selectedSession.events.length) {
      return alert("This session has no events.");
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    playingRef.current = true;
    pausedRef.current = false;
    currentIndexRef.current = 0;

    setText(selectedSession.events[0].value);
    setCurrentIndex(0);
    setStatus("Replaying...");
    setIsPlaying(true);
    setIsPaused(false);

    scheduleNext();
  };

  const pauseReplay = () => {
    if (!isPlaying || !selectedSession) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    pausedRef.current = true;
    playingRef.current = false;
    setIsPaused(true);
    setIsPlaying(false);
    setStatus("Paused");
  };

  const resumeReplay = () => {
    if (!selectedSession || !isPaused) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    pausedRef.current = false;
    playingRef.current = true;
    setIsPaused(false);
    setIsPlaying(true);
    setStatus("Replaying...");

    scheduleNext();
  };

  const resetReplay = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    playingRef.current = false;
    pausedRef.current = false;
    currentIndexRef.current = 0;
    setText(selectedSession?.events[0]?.value || "");
    setStatus(selectedSession ? "Ready" : "Select a session first");
  };

  const deleteSession = (id: string) => {
    const filtered = savedSessions.filter((s) => s.id !== id);
    localStorage.setItem("savedSessions", JSON.stringify(filtered));
    setSavedSessions(filtered);
    if (selectedSession?.id === id) {
      setSelectedSession(null);
      setText("");
      setStatus("Select a session to replay");
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", padding: "2rem" }}>
      <h2 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: 24 }}>Replay Dashboard</h2>
      <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "20px", fontSize: 14 }}>{status}</p>

      <div style={{ display: "flex", gap: "20px" }}>
        <div
          style={{
            width: "35%",
            background: "#fff",
            border: "2px solid #e0e0e0",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "#333", fontSize: 18 }}>
            Saved Sessions ({savedSessions.length})
          </h3>
          {!savedSessions.length && (
            <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>
              No sessions saved yet.<br />Use the Editor to create one.
            </p>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {savedSessions.map((s) => (
              <li
                key={s.id}
                onClick={() => setSelection(s)}
                style={{
                  cursor: "pointer",
                  background: selectedSession?.id === s.id ? "#f3f4ff" : "transparent",
                  border: selectedSession?.id === s.id ? "2px solid #667eea" : "1px solid #eee",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "8px",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  if (selectedSession?.id !== s.id) {
                    e.currentTarget.style.background = "#f9f9f9";
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedSession?.id !== s.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ fontWeight: 600, color: "#333", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  {s.name}
                  {detectPaste(s.events) && (
                    <span style={{ background: "#fff3cd", color: "#856404", padding: "2px 6px", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                      🔍 Paste
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                  {new Date(s.createdAt).toLocaleString()} • {s.events.length} events
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  style={{
                    fontSize: 12,
                    color: "#d32f2f",
                    border: "1px solid #d32f2f",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    background: "#fff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#ffebee";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "#333", fontSize: 18 }}>Replay Controls</h3>
          <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={startReplay}
              disabled={!selectedSession || isPlaying}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: !selectedSession || isPlaying ? "#e0e0e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: !selectedSession || isPlaying ? "#999" : "#fff",
                cursor: !selectedSession || isPlaying ? "not-allowed" : "pointer",
              }}
            >
              ▶️ Play
            </button>
            <button
              onClick={pauseReplay}
              disabled={!isPlaying}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: !isPlaying ? "#e0e0e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: !isPlaying ? "#999" : "#fff",
                cursor: !isPlaying ? "not-allowed" : "pointer",
              }}
            >
              ⏸ Pause
            </button>
            <button
              onClick={resumeReplay}
              disabled={!isPaused}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: !isPaused ? "#e0e0e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: !isPaused ? "#999" : "#fff",
                cursor: !isPaused ? "not-allowed" : "pointer",
              }}
            >
              ▶️ Resume
            </button>
            <button
              onClick={resetReplay}
              disabled={!selectedSession}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: !selectedSession ? "#e0e0e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: !selectedSession ? "#999" : "#fff",
                cursor: !selectedSession ? "not-allowed" : "pointer",
              }}
            >
              🔄 Reset
            </button>
          </div>

          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#333", minWidth: 80 }}>
              ⚡ Speed: {playbackSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              style={{ flex: 1, cursor: "pointer" }}
            />
          </div>

          <div
            style={{
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              minHeight: 180,
              padding: "14px",
              whiteSpace: "pre-wrap",
              background: "#f9f9f9",
              fontFamily: "monospace",
              fontSize: 14,
              overflowY: "auto",
              color: "#333",
              wordBreak: "break-word",
            }}
          >
            {text || "(no text currently replayed)"}
          </div>

          <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
            <strong>Event position:</strong> {currentIndex} / {selectedSession?.events.length || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplayPlayer;