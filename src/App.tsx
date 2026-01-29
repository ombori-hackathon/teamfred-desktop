import { useState, useEffect, useCallback } from "react";
import IdeaWall from "./components/IdeaWall/IdeaWall";
import BoardSelector from "./components/BoardSelector";
import { HealthResponse, Board, BoardCreate } from "./types";
import "./App.css";

const BASE_URL = "http://localhost:8001";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

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
    </div>
  );
}

export default App;
