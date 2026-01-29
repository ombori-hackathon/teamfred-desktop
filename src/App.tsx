import { useState, useEffect, useCallback } from "react";
import IdeaWall from "./components/IdeaWall/IdeaWall";
import BoardSelector from "./components/BoardSelector";
import Timer from "./components/Timer/Timer";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { HealthResponse, Board, BoardCreate } from "./types";
import { sounds } from "./utils/sounds";
import "./App.css";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

function SoundToggle() {
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  const handleToggle = () => {
    const newState = sounds.toggle();
    setSoundEnabled(newState);
  };

  return (
    <button
      className="theme-toggle"
      onClick={handleToggle}
      title={`Sound ${soundEnabled ? "enabled" : "disabled"}`}
    >
      {soundEnabled ? "🔊" : "🔇"}
    </button>
  );
}

const BASE_URL = "http://localhost:8001";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [showTimer, setShowTimer] = useState(false);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/boards`);
      if (!res.ok) throw new Error("Failed to fetch boards");
      const data: Board[] = await res.json();
      setBoards(data);
    } catch (err) {
      console.error("Failed to fetch boards:", err);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (apiStatus === "healthy") {
      fetchBoards();
    }
  }, [apiStatus, fetchBoards]);

  const checkHealth = async () => {
    try {
      const healthRes = await fetch(`${BASE_URL}/health`);
      const health: HealthResponse = await healthRes.json();
      setApiStatus(health.status);
      setIsLoading(false);
    } catch {
      setApiStatus("offline");
      setErrorMessage("API not running");
      setIsLoading(false);
    }
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const handleCreateBoard = async (board: BoardCreate) => {
    try {
      const res = await fetch(`${BASE_URL}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(board),
      });
      if (!res.ok) throw new Error("Failed to create board");
      const newBoard: Board = await res.json();
      setBoards((prev) => [...prev, newBoard]);
      setSelectedBoardId(newBoard.id);
    } catch (err) {
      handleError("Failed to create board");
      console.error(err);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/boards/${boardId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete board");
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      if (selectedBoardId === boardId) {
        setSelectedBoardId(null);
      }
    } catch (err) {
      handleError("Failed to delete board");
      console.error(err);
    }
  };

  const toggleTimer = () => {
    setShowTimer((prev) => !prev);
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if 'T' is pressed (without modifiers)
      if (e.key === "t" || e.key === "T") {
        // Only trigger if not typing in an input/textarea
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          toggleTimer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>IdeaWall</h1>
        <div className="header-controls">
          {apiStatus === "healthy" && (
            <BoardSelector
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
              onCreateBoard={handleCreateBoard}
              onDeleteBoard={handleDeleteBoard}
            />
          )}
          <button
            className="theme-toggle"
            onClick={toggleTimer}
            title="Toggle timer (T)"
          >
            🕐
          </button>
          <SoundToggle />
          <ThemeToggle />
          <div className="status">
            <span
              className={`status-dot ${apiStatus === "healthy" ? "healthy" : "offline"}`}
            />
            <span className="status-text">{apiStatus}</span>
          </div>
        </div>
      </header>

      <main className="content">
        {errorMessage && <div className="error-toast">{errorMessage}</div>}
        {apiStatus === "offline" ? (
          <div className="error-container">
            <span className="error-icon">Warning</span>
            <p className="error-message">API not running</p>
            <p className="error-hint">
              Start API: cd services/api && uv run fastapi dev
            </p>
          </div>
        ) : isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <IdeaWall
            onError={handleError}
            selectedBoardId={selectedBoardId}
            onBoardsChange={fetchBoards}
          />
        )}
      </main>

      {showTimer && <Timer onClose={() => setShowTimer(false)} />}
    </div>
  );
}

function AppWithProviders() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithProviders;
