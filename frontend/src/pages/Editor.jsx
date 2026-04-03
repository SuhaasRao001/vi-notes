import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

// ─── REPLAY MODAL ────────────────────────────────────────────────────────────
function ReplayModal({ session, onClose }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);
  const snapshots = session.snapshots || [];
  const total = snapshots.length;

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setFrame(f => {
          if (f >= total - 1) { setPlaying(false); return f; }
          return f + 1;
        });
      }, Math.max(16, 80 / speed));
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, total]);

  const currentText = snapshots[frame]?.text || '';
  const currentTime = snapshots[frame]?.timestamp;
  const startTime = snapshots[0]?.timestamp;
  const relMs = currentTime && startTime ? currentTime - startTime : 0;

  function fmtMs(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}.${String(ms % 1000).padStart(3, '0').slice(0, 1)}`;
  }

  function togglePlay() {
    if (frame >= total - 1) setFrame(0);
    setPlaying(p => !p);
  }

  const progressPct = total > 1 ? (frame / (total - 1)) * 100 : 0;
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  const pasteRanges = (session.pasteEvents || []).map(p => {
    const closest = snapshots.reduce((best, s, i) =>
      Math.abs(s.timestamp - p.timestamp) < Math.abs(snapshots[best].timestamp - p.timestamp) ? i : best, 0);
    return { frameIdx: closest, length: p.pastedLength };
  });
  const activePaste = pasteRanges.find(r => Math.abs(r.frameIdx - frame) < 3);

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.box} onClick={e => e.stopPropagation()}>
        <div style={modal.header}>
          <div style={modal.headerLeft}>
            <span style={modal.title}>⏱ Typing Replay</span>
            <span style={modal.sessionName}>
              {session.text?.startsWith('[') ? session.text.split('\n')[0].replace(/[\[\]]/g, '') : 'Untitled'}
            </span>
          </div>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={modal.statsBar}>
          <div style={modal.stat}><span style={modal.sLabel}>Frame</span><span style={modal.sVal}>{frame + 1} / {total}</span></div>
          <div style={modal.stat}><span style={modal.sLabel}>Time</span><span style={modal.sVal}>{fmtMs(relMs)}</span></div>
          <div style={modal.stat}><span style={modal.sLabel}>Words</span><span style={modal.sVal}>{wordCount}</span></div>
          <div style={modal.stat}><span style={modal.sLabel}>Chars</span><span style={modal.sVal}>{currentText.length}</span></div>
          {activePaste && <div style={modal.pasteBadge}>⚠ Paste ({activePaste.length} chars)</div>}
        </div>

        <div style={{ ...modal.textBox, borderColor: activePaste ? '#e8a02066' : '#2a2a2a' }}>
          {currentText || <span style={{ color: '#333' }}>[ empty ]</span>}
          <span style={modal.cursor}>|</span>
        </div>

        <div style={modal.progressWrap}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setFrame(Math.round(ratio * (total - 1)));
          }}
        >
          <div style={{ ...modal.progressFill, width: `${progressPct}%` }} />
          {pasteRanges.map((r, i) => (
            <div key={i} style={{ ...modal.pasteMark, left: `${(r.frameIdx / (total - 1)) * 100}%` }} title="Paste event" />
          ))}
        </div>

        <div style={modal.controls}>
          <button style={modal.ctrlBtn} onClick={() => { setPlaying(false); setFrame(0); }}>⏮</button>
          <button style={modal.ctrlBtn} onClick={() => setFrame(f => Math.max(0, f - 10))}>⏪</button>
          <button style={{ ...modal.ctrlBtn, ...modal.playBtn }} onClick={togglePlay}>
            {playing ? '⏸' : '▶'}
          </button>
          <button style={modal.ctrlBtn} onClick={() => setFrame(f => Math.min(total - 1, f + 10))}>⏩</button>
          <button style={modal.ctrlBtn} onClick={() => { setPlaying(false); setFrame(total - 1); }}>⏭</button>
          <div style={modal.speedWrap}>
            <span style={modal.sLabel}>Speed</span>
            {[0.5, 1, 2, 5, 10].map(s => (
              <button key={s} style={{ ...modal.speedBtn, ...(speed === s ? modal.speedBtnActive : {}) }}
                onClick={() => setSpeed(s)}>{s}×</button>
            ))}
          </div>
        </div>

        <input type="range" min={0} max={total - 1} value={frame}
          onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}
          style={modal.scrubber}
        />
      </div>
    </div>
  );
}

// ─── MAIN EDITOR ─────────────────────────────────────────────────────────────
export default function Editor() {
  const [view, setView] = useState('editor');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pasteEventsState, setPasteEventsState] = useState([]);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [replaySession, setReplaySession] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [pasteAlert, setPasteAlert] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const keystrokesRef = useRef([]);
  const pasteEventsRef = useRef([]);
  const snapshotsRef = useRef([]);
  const lastKeyTimeRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const navigate = useNavigate();
  const email = localStorage.getItem('email') || 'user';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  function handleKeyDown(e) {
    const now = Date.now();
    if (lastKeyTimeRef.current !== null) {
      keystrokesRef.current.push({ timeBetweenKeys: now - lastKeyTimeRef.current, timestamp: now });
    }
    lastKeyTimeRef.current = now;
    setKeystrokeCount(keystrokesRef.current.length);
  }

  function handleChange(e) {
    const newText = e.target.value;
    setText(newText);
    snapshotsRef.current.push({ text: newText, timestamp: Date.now() });
  }

  function handlePaste(e) {
    const pastedText = e.clipboardData.getData('text');
    const now = Date.now();
    pasteEventsRef.current.push({ timestamp: now, pastedLength: pastedText.length });
    setPasteEventsState([...pasteEventsRef.current]);
    setPasteAlert(`⚠ Paste detected — ${pastedText.length} characters`);
    setTimeout(() => setPasteAlert(''), 4000);
  }

  async function handleSave() {
    if (!text.trim()) { setSaveMsg('Nothing to save!'); setTimeout(() => setSaveMsg(''), 2000); return; }
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await axios.post(`${API}/sessions`, {
        text: title ? `[${title}]\n\n${text}` : text,
        keystrokes: keystrokesRef.current,
        snapshots: snapshotsRef.current,
        pasteEvents: pasteEventsRef.current,
        duration,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSaveMsg('✓ Session saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Save failed.');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function loadSessions() {
    try {
      const { data } = await axios.get(`${API}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      setSessions(data);
    } catch { setSessions([]); }
  }

  function switchToSessions() { setView('sessions'); loadSessions(); }
  function handleLogout() { localStorage.clear(); navigate('/login'); }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const avgTypingSpeed = keystrokesRef.current.length > 1
    ? Math.round(1000 / (keystrokesRef.current.reduce((a, k) => a + k.timeBetweenKeys, 0) / keystrokesRef.current.length))
    : 0;

  const humanScore = (() => {
    if (keystrokeCount < 5) return null;
    let score = 100;
    score -= pasteEventsRef.current.length * 15;
    const pastedChars = pasteEventsRef.current.reduce((a, e) => a + e.pastedLength, 0);
    score -= (charCount > 0 ? pastedChars / charCount : 0) * 40;
    return Math.max(0, Math.min(100, Math.round(score)));
  })();

  const scoreColor = humanScore === null ? '#555' : humanScore >= 75 ? '#4caf6e' : humanScore >= 40 ? '#e8a020' : '#e05050';

  return (
    <div style={styles.page}>
      {replaySession && <ReplayModal session={replaySession} onClose={() => setReplaySession(null)} />}

      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.logo}>Vi-Notes</span>
          <button style={view === 'editor' ? styles.tabActive : styles.tab} onClick={() => setView('editor')}>✍ Editor</button>
          <button style={view === 'sessions' ? styles.tabActive : styles.tab} onClick={switchToSessions}>📁 My Sessions</button>
        </div>
        <div style={styles.navRight}>
          <span style={styles.emailBadge}>{email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {view === 'editor' && (
        <div style={styles.editorLayout}>
          <div style={styles.writingPane}>
            <input style={styles.titleInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title (optional)" />
            <textarea
              style={styles.textarea}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Start writing here..."
              autoFocus spellCheck
            />
            {pasteAlert && <div style={styles.pasteAlert}>{pasteAlert}</div>}
          </div>

          <div style={styles.statsPane}>
            <div style={styles.statsHeader}>Live Stats</div>
            {[['Words', wordCount], ['Characters', charCount], ['Keystrokes', keystrokeCount], ['Session Time', fmtTime(elapsed)], ['Avg Key Speed', avgTypingSpeed > 0 ? `${avgTypingSpeed}/s` : '—']].map(([label, val]) => (
              <div key={label} style={styles.statCard}>
                <div style={styles.statLabel}>{label}</div>
                <div style={styles.statValue}>{val}</div>
              </div>
            ))}

            <div style={{ ...styles.statCard, borderColor: pasteEventsRef.current.length > 0 ? '#e8a02044' : '#2a2a2a' }}>
              <div style={styles.statLabel}>Paste Events</div>
              <div style={{ ...styles.statValue, color: pasteEventsRef.current.length > 0 ? '#e8a020' : '#e8e4dc' }}>{pasteEventsRef.current.length}</div>
              {pasteEventsRef.current.map((p, i) => (
                <div key={i} style={styles.pasteRow}>Paste {i + 1}: {p.pastedLength} chars · {new Date(p.timestamp).toLocaleTimeString()}</div>
              ))}
            </div>

            <div style={{ ...styles.statCard, borderColor: scoreColor + '44' }}>
              <div style={styles.statLabel}>Authenticity Score</div>
              <div style={{ ...styles.statValue, color: scoreColor, fontSize: 32 }}>{humanScore === null ? '—' : `${humanScore}%`}</div>
              <div style={styles.scoreBar}><div style={{ ...styles.scoreBarFill, width: `${humanScore || 0}%`, background: scoreColor }} /></div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>{humanScore === null ? 'Start typing to see score' : humanScore >= 75 ? 'Looks genuinely human' : humanScore >= 40 ? 'Some suspicious patterns' : 'High AI involvement suspected'}</div>
            </div>

            <button style={styles.saveBtn} onClick={handleSave}>Save Session</button>
            {saveMsg && <div style={{ textAlign: 'center', fontSize: 13, color: saveMsg.startsWith('✓') ? '#4caf6e' : '#e05050', marginTop: 8 }}>{saveMsg}</div>}
          </div>
        </div>
      )}

      {view === 'sessions' && (
        <div style={styles.sessionsLayout}>
          <div style={styles.sessionsList}>
            <div style={styles.sessionsHeader}>Saved Sessions ({sessions.length})</div>
            {sessions.length === 0 && <div style={styles.emptyMsg}>No sessions yet.</div>}
            {sessions.map(s => {
              const firstLine = s.text?.startsWith('[') ? s.text.split('\n')[0].replace(/[\[\]]/g, '') : 'Untitled';
              const preview = (s.text || '').replace(/^\[.*?\]\n\n/, '').slice(0, 80);
              const wc = s.text?.trim().split(/\s+/).length || 0;
              const hasReplay = s.snapshots?.length > 1;
              return (
                <div key={s._id} style={{ ...styles.sessionCard, ...(selectedSession?._id === s._id ? styles.sessionCardActive : {}) }} onClick={() => setSelectedSession(s)}>
                  <div style={styles.sessionTitle}>{firstLine}</div>
                  <div style={styles.sessionPreview}>{preview}...</div>
                  <div style={styles.sessionMeta}>
                    {wc} words · {s.keystrokes?.length || 0} keystrokes · {s.pasteEvents?.length || 0} pastes · {fmtTime(s.duration || 0)}
                    <br />{new Date(s.createdAt).toLocaleString()}
                  </div>
                  {hasReplay
                    ? <button style={styles.replayBtn} onClick={e => { e.stopPropagation(); setReplaySession(s); }}>▶ Replay Typing</button>
                    : <div style={styles.noReplay}>No replay data</div>
                  }
                </div>
              );
            })}
          </div>

          <div style={styles.sessionDetail}>
            {!selectedSession ? (
              <div style={styles.emptyMsg}>← Select a session to view details</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={styles.detailTitle}>
                    {selectedSession.text?.startsWith('[') ? selectedSession.text.split('\n')[0].replace(/[\[\]]/g, '') : 'Untitled'}
                  </div>
                  {selectedSession.snapshots?.length > 1 && (
                    <button style={styles.bigReplayBtn} onClick={() => setReplaySession(selectedSession)}>▶ Watch Replay</button>
                  )}
                </div>

                <div style={styles.detailGrid}>
                  {[
                    ['Words', selectedSession.text?.trim().split(/\s+/).length || 0, null],
                    ['Keystrokes', selectedSession.keystrokes?.length || 0, null],
                    ['Paste Events', selectedSession.pasteEvents?.length || 0, selectedSession.pasteEvents?.length > 0 ? '#e8a020' : '#4caf6e'],
                    ['Duration', fmtTime(selectedSession.duration || 0), null],
                    ['Snapshots', selectedSession.snapshots?.length || 0, null],
                  ].map(([label, val, color]) => (
                    <div key={label} style={styles.detailStat}>
                      <span style={styles.dLabel}>{label}</span>
                      <span style={{ ...styles.dVal, ...(color ? { color } : {}) }}>{val}</span>
                    </div>
                  ))}
                </div>

                {selectedSession.pasteEvents?.length > 0 && (
                  <div style={styles.pasteList}>
                    <div style={styles.pasteListHeader}>⚠ Paste Events Detected</div>
                    {selectedSession.pasteEvents.map((p, i) => (
                      <div key={i} style={styles.pasteRow2}>Paste {i + 1}: {p.pastedLength} characters at {new Date(p.timestamp).toLocaleTimeString()}</div>
                    ))}
                  </div>
                )}

                <div style={styles.detailTextLabel}>Content</div>
                <div style={styles.detailText}>{selectedSession.text?.replace(/^\[.*?\]\n\n/, '')}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0c0c0c', color: '#e8e4dc', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #1e1e1e', background: '#0f0f0f' },
  navLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontSize: 18, fontWeight: 700, marginRight: 16, letterSpacing: '-0.5px' },
  tab: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, color: '#666', padding: '6px 14px', fontSize: 13, cursor: 'pointer' },
  tabActive: { background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 4, color: '#e8e4dc', padding: '6px 14px', fontSize: 13, cursor: 'pointer' },
  emailBadge: { fontSize: 12, color: '#555', background: '#1a1a1a', padding: '4px 10px', borderRadius: 20, border: '1px solid #2a2a2a' },
  logoutBtn: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, color: '#555', padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  editorLayout: { display: 'flex', flex: 1 },
  writingPane: { flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 48px', position: 'relative' },
  titleInput: { background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a2a', color: '#e8e4dc', fontSize: 22, fontFamily: 'Georgia, serif', marginBottom: 24, padding: '8px 0', outline: 'none' },
  textarea: { flex: 1, minHeight: '70vh', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#d8d4cc', fontSize: 17, lineHeight: 1.85, fontFamily: 'Georgia, serif' },
  pasteAlert: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2a1a00', border: '1px solid #e8a02066', borderRadius: 6, padding: '10px 20px', color: '#e8a020', fontSize: 14, zIndex: 100 },
  statsPane: { width: 260, borderLeft: '1px solid #1e1e1e', padding: '24px 20px', background: '#0f0f0f', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' },
  statsHeader: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#444', marginBottom: 4 },
  statCard: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6, padding: '12px 14px' },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  pasteRow: { fontSize: 11, color: '#e8a020', marginTop: 4 },
  scoreBar: { height: 4, background: '#2a2a2a', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },
  saveBtn: { background: '#e8e4dc', color: '#0c0c0c', border: 'none', borderRadius: 6, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: 4 },
  sessionsLayout: { display: 'flex', flex: 1 },
  sessionsList: { width: 320, borderRight: '1px solid #1e1e1e', overflowY: 'auto', padding: 20 },
  sessionsHeader: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 },
  emptyMsg: { color: '#444', fontSize: 14, padding: '40px 20px', textAlign: 'center' },
  sessionCard: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6, padding: 14, marginBottom: 10, cursor: 'pointer' },
  sessionCardActive: { border: '1px solid #e8e4dc44', background: '#1a1a1a' },
  sessionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  sessionPreview: { fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 6 },
  sessionMeta: { fontSize: 11, color: '#444', lineHeight: 1.6, marginBottom: 8 },
  replayBtn: { background: '#1a2a1a', border: '1px solid #4caf6e44', borderRadius: 4, color: '#4caf6e', padding: '5px 10px', fontSize: 12, cursor: 'pointer', width: '100%' },
  noReplay: { fontSize: 11, color: '#333', textAlign: 'center', padding: '4px 0' },
  sessionDetail: { flex: 1, padding: '40px 48px', overflowY: 'auto' },
  detailTitle: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' },
  bigReplayBtn: { background: '#1a2a1a', border: '1px solid #4caf6e66', borderRadius: 6, color: '#4caf6e', padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 },
  detailStat: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  dLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  dVal: { fontSize: 20, fontWeight: 700 },
  pasteList: { background: '#1a0f00', border: '1px solid #e8a02033', borderRadius: 6, padding: 16, marginBottom: 24 },
  pasteListHeader: { color: '#e8a020', fontSize: 13, fontWeight: 600, marginBottom: 8 },
  pasteRow2: { fontSize: 12, color: '#c8882a', marginBottom: 4 },
  detailTextLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#444', marginBottom: 12 },
  detailText: { color: '#c8c4bc', fontSize: 16, lineHeight: 1.85, whiteSpace: 'pre-wrap' },
};

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 16, padding: 28, maxHeight: '90vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' },
  sessionName: { fontSize: 13, color: '#555', background: '#1a1a1a', padding: '3px 10px', borderRadius: 20 },
  closeBtn: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, color: '#666', padding: '4px 10px', cursor: 'pointer', fontSize: 14 },
  statsBar: { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  sLabel: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  sVal: { fontSize: 16, fontWeight: 700 },
  pasteBadge: { background: '#2a1a00', border: '1px solid #e8a02066', borderRadius: 4, color: '#e8a020', padding: '3px 10px', fontSize: 12 },
  textBox: { background: '#0c0c0c', border: '1px solid #2a2a2a', borderRadius: 6, padding: '20px 24px', minHeight: 200, maxHeight: 300, overflowY: 'auto', fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#d8d4cc', fontFamily: 'Georgia, serif', transition: 'border-color 0.3s' },
  cursor: { display: 'inline-block', animation: 'blink 1s step-end infinite', color: '#e8e4dc' },
  progressWrap: { height: 6, background: '#1e1e1e', borderRadius: 3, cursor: 'pointer', position: 'relative', overflow: 'visible' },
  progressFill: { height: '100%', background: '#4caf6e', borderRadius: 3, pointerEvents: 'none', transition: 'width 0.05s linear' },
  pasteMark: { position: 'absolute', top: -3, width: 3, height: 12, background: '#e8a020', borderRadius: 2, transform: 'translateX(-50%)' },
  controls: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ctrlBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, color: '#e8e4dc', padding: '8px 14px', fontSize: 16, cursor: 'pointer' },
  playBtn: { background: '#1a2a1a', borderColor: '#4caf6e44', color: '#4caf6e', padding: '8px 20px' },
  speedWrap: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  speedBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, color: '#666', padding: '5px 10px', fontSize: 12, cursor: 'pointer' },
  speedBtnActive: { background: '#1e2e1e', borderColor: '#4caf6e66', color: '#4caf6e' },
  scrubber: { width: '100%', accentColor: '#4caf6e', cursor: 'pointer' },
};