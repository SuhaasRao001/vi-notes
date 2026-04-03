import React, { useState } from "react";
import { useKeystrokeLogger } from "./useKeystrokeLogger";

const Editor = () => {
  const [text, setText] = useState("");
  const { events, logKey } = useKeystrokeLogger();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    if (value.length > text.length) {
      logKey(value[value.length - 1], "insert");
    } else {
      logKey("Backspace", "delete");
    }

    setText(value);
  };

  const saveSession = () => {
    localStorage.setItem("session", JSON.stringify(events));
    alert("Session saved!");
  };

  return (
    <div>
      <h2>Editor</h2>
      <textarea
        value={text}
        onChange={handleChange}
        rows={10}
        cols={50}
      />
      <br />
      <button onClick={saveSession}>Save Session</button>
    </div>
  );
};

export default Editor;