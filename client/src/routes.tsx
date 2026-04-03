import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import ReplayPage from "./pages/ReplayPage";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <header
          style={{
            background: "rgba(0, 0, 0, 0.1)",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h1 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: 28, fontWeight: 700 }}>
              Vi Notes
            </h1>
            <p style={{ margin: "0 0 16px 0", color: "rgba(255, 255, 255, 0.8)", fontSize: 14 }}>
              Keystroke Logger & Replay System
            </p>
            <nav style={{ display: "flex", gap: "16px" }}>
              <Link
                to="/"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.2)",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
              >
                ✏️ Editor
              </Link>
              <Link
                to="/replay"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.2)",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
              >
                ▶️ Replay
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ minHeight: "calc(100vh - 160px)" }}>
          <Routes>
            <Route path="/" element={<EditorPage />} />
            <Route path="/replay" element={<ReplayPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default AppRoutes;