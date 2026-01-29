import { useState } from "react";
import { AISuggestions, AISummary } from "../../types";
import "./AIPanel.css";

interface AIPanelProps {
  boardId: number | null;
  onGetSuggestions: () => Promise<AISuggestions>;
  onSummarize: () => Promise<AISummary>;
  onUseSuggestion: (suggestion: string) => void;
}

function AIPanel({
  boardId,
  onGetSuggestions,
  onSummarize,
  onUseSuggestion,
}: AIPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [activeTab, setActiveTab] = useState<"suggestions" | "summary">(
    "suggestions"
  );

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onGetSuggestions();
      setSuggestions(result.suggestions);
      setActiveTab("suggestions");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get suggestions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onSummarize();
      setSummary(result);
      setActiveTab("summary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="ai-panel-toggle"
        onClick={() => setIsOpen(true)}
        title="AI Assistant"
      >
        <span className="ai-icon">AI</span>
      </button>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3>AI Assistant</h3>
        <button className="ai-panel-close" onClick={() => setIsOpen(false)}>
          ×
        </button>
      </div>

      {!boardId && (
        <div className="ai-panel-notice">Select a board to use AI features</div>
      )}

      {boardId && (
        <>
          <div className="ai-panel-actions">
            <button
              className="ai-action-btn"
              onClick={handleGetSuggestions}
              disabled={isLoading}
            >
              <span className="ai-action-icon">💡</span>
              Get Suggestions
            </button>
            <button
              className="ai-action-btn"
              onClick={handleSummarize}
              disabled={isLoading}
            >
              <span className="ai-action-icon">📊</span>
              Summarize Board
            </button>
          </div>

          {isLoading && (
            <div className="ai-panel-loading">
              <div className="ai-spinner" />
              <span>Thinking...</span>
            </div>
          )}

          {error && <div className="ai-panel-error">{error}</div>}

          {!isLoading && !error && (suggestions.length > 0 || summary) && (
            <div className="ai-panel-tabs">
              <button
                className={`ai-tab ${activeTab === "suggestions" ? "active" : ""}`}
                onClick={() => setActiveTab("suggestions")}
              >
                Suggestions
              </button>
              <button
                className={`ai-tab ${activeTab === "summary" ? "active" : ""}`}
                onClick={() => setActiveTab("summary")}
              >
                Summary
              </button>
            </div>
          )}

          {!isLoading &&
            !error &&
            activeTab === "suggestions" &&
            suggestions.length > 0 && (
              <div className="ai-panel-content">
                <p className="ai-content-hint">Click to use as new idea</p>
                <div className="ai-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="ai-suggestion"
                      onClick={() => onUseSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {!isLoading && !error && activeTab === "summary" && summary && (
            <div className="ai-panel-content">
              <div className="ai-summary">
                <div className="ai-summary-section">
                  <h4>Summary</h4>
                  <p>{summary.summary}</p>
                </div>

                {summary.themes.length > 0 && (
                  <div className="ai-summary-section">
                    <h4>Key Themes</h4>
                    <div className="ai-themes">
                      {summary.themes.map((theme, index) => (
                        <span key={index} className="ai-theme">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {summary.top_priority && (
                  <div className="ai-summary-section">
                    <h4>Top Priority</h4>
                    <p className="ai-priority">{summary.top_priority}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIPanel;
