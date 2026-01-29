import { useState, useEffect } from "react";
import IdeaWall from "./components/IdeaWall/IdeaWall";
import { HealthResponse } from "./types";
import "./App.css";

const BASE_URL = "http://localhost:8001";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

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

  return (
    <div className="app">
      <header className="header">
        <h1>IdeaWall</h1>
        <div className="status">
          <span
            className={`status-dot ${apiStatus === "healthy" ? "healthy" : "offline"}`}
          />
          <span className="status-text">{apiStatus}</span>
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
          <IdeaWall onError={handleError} />
        )}
      </main>
    </div>
  );
}

export default App;
