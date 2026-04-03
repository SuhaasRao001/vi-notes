import React, { useMemo, useState } from "react";
import { useKeystrokeLogger } from "./useKeystrokeLogger";
import type { KeystrokeEvent } from "../../types/keystroke";

const calculateStats = (events: KeystrokeEvent[]) => {
  if (!events.length) return null;
  const duration = events[events.length - 1].timestamp - events[0].timestamp;
  const charCount = events[events.length - 1].value.length;
  const wpm = charCount > 0 ? Math.round(((charCount / 5) / (duration / 60000)) * 10) / 10 : 0;
  const avgSpeed = events.length > 0 ? Math.round((duration / events.length) * 10) / 10 : 0;
  return { duration: Math.round(duration), charCount, wpm, avgSpeed };
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

const Editor = () => {
  const [text, setText] = useState("");
  const [sessionName, setSessionName] = useState("");
  const { events, logKey, reset } = useKeystrokeLogger();
  const stats = useMemo(() => calculateStats(events), [events]);
  const hasPaste = useMemo(() => detectPaste(events), [events]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    if (value.length > text.length) {
      logKey(value[value.length - 1], "insert", value);
    } else if (value.length < text.length) {
      logKey("Backspace", "delete", value);
    }

    setText(value);
  };

  const saveSession = () => {
    if (!events.length) {
      return alert("Type some text first before saving a session.");
    }

    const stored = localStorage.getItem("savedSessions");
    const sessions = stored ? JSON.parse(stored) : [];

    const session = {
      id: `${Date.now()}`,
      name: sessionName.trim() || `Session ${sessions.length + 1}`,
      createdAt: Date.now(),
      events,
    };

    localStorage.setItem("savedSessions", JSON.stringify([session, ...sessions]));
    alert(`Saved session "${session.name}" (${events.length} events)`);

    setSessionName("");
    reset();
    setText("");
  };

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "2rem", background: "#fff", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}>
      <h2 style={{ margin: "0 0 8px 0", color: "#333", fontSize: 24 }}>Text Editor</h2>
      <p style={{ color: "#666", marginBottom: "20px", fontSize: 14 }}>
        Type freely and every keystroke is recorded. Save your session to replay it later.
      </p>
      <textarea
        value={text}
        onChange={handleChange}
        rows={14}
        placeholder="Start typing here..."
        style={{ 
          width: "100%", 
          minHeight: 300, 
          fontSize: 15, 
          lineHeight: 1.6,
          padding: "12px",
          border: "2px solid #e0e0e0",
          borderRadius: "8px",
          fontFamily: "monospace",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <input
          type="text"
          placeholder="Session name (optional)"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          style={{ 
            flex: 1, 
            padding: "10px 12px", 
            fontSize: 14,
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={saveSession}
          style={{ 
            padding: "10px 24px", 
            fontWeight: 700,
            fontSize: 14,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Save Session
        </button>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <p style={{ margin: 0, color: "#888", fontSize: 13 }}>
          <strong>{events.length}</strong> events
        </p>
        {hasPaste && (
          <span style={{ background: "#fff3cd", color: "#856404", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
            🔍 Paste Detected
          </span>
        )}
        {stats && (
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#666" }}>
            <span><strong>{stats.wpm}</strong> WPM</span>
            <span><strong>{(stats.duration / 1000).toFixed(1)}s</strong> duration</span>
            <span><strong>{stats.charCount}</strong> chars</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;