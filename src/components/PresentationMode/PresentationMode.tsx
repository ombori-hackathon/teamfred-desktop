import { useState, useEffect } from "react";
import { Idea } from "../../types";
import "./PresentationMode.css";

interface PresentationModeProps {
  ideas: Idea[];
  onExit: () => void;
  sortBy: "votes" | "position" | "created";
}

function PresentationMode({
  ideas,
  onExit,
  sortBy: initialSortBy,
}: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortBy, setSortBy] = useState<"votes" | "position" | "created">(
    initialSortBy
  );

  // Sort ideas based on sortBy
  const sortedIdeas = [...ideas].sort((a, b) => {
    switch (sortBy) {
      case "votes":
        return b.votes - a.votes;
      case "position":
        // Sort by position left-to-right, then top-to-bottom
        if (a.position_x !== b.position_x) {
          return a.position_x - b.position_x;
        }
        return a.position_y - b.position_y;
      case "created":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      default:
        return 0;
    }
  });

  const currentIdea = sortedIdeas[currentIndex];

  const goNext = () => {
    if (currentIndex < sortedIdeas.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ": // Space key
          e.preventDefault();
          setCurrentIndex((prev) =>
            prev < sortedIdeas.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Escape":
          e.preventDefault();
          onExit();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sortedIdeas.length, onExit]);

  // Reset index when ideas change significantly
  useEffect(() => {
    if (currentIndex >= sortedIdeas.length) {
      setCurrentIndex(Math.max(0, sortedIdeas.length - 1));
    }
  }, [sortedIdeas.length, currentIndex]);

  if (sortedIdeas.length === 0) {
    return (
      <div className="presentation-mode">
        <button
          className="presentation-exit-btn"
          onClick={onExit}
          title="Exit presentation (Esc)"
        >
          ✕
        </button>
        <div className="presentation-empty">
          <h2>No ideas to present</h2>
          <p>Add some ideas first!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="presentation-mode">
      {/* Header with sort dropdown */}
      <div className="presentation-header">
        <div className="presentation-sort">
          <label htmlFor="presentation-sort-select">Sort by:</label>
          <select
            id="presentation-sort-select"
            className="presentation-sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as "votes" | "position" | "created");
              setCurrentIndex(0); // Reset to first idea when sorting changes
            }}
          >
            <option value="votes">Votes (Descending)</option>
            <option value="position">Position (Left to Right)</option>
            <option value="created">Created Date</option>
          </select>
        </div>
      </div>

      {/* Exit button */}
      <button
        className="presentation-exit-btn"
        onClick={onExit}
        title="Exit presentation (Esc)"
      >
        ✕
      </button>

      {/* Previous navigation */}
      {currentIndex > 0 && (
        <button
          className="presentation-nav-btn presentation-nav-prev"
          onClick={goPrevious}
          title="Previous (Left Arrow)"
        >
          ‹
        </button>
      )}

      {/* Card */}
      <div className="presentation-card-container">
        <div className={`presentation-card ${currentIdea.color}`}>
          <div className="presentation-card-header">
            <h1 className="presentation-card-title">{currentIdea.title}</h1>
            <div className="presentation-card-vote">
              <span className="vote-star">★</span>
              <span className="vote-count">{currentIdea.votes}</span>
            </div>
          </div>

          {currentIdea.description && (
            <p className="presentation-card-description">
              {currentIdea.description}
            </p>
          )}

          {currentIdea.tags && currentIdea.tags.length > 0 && (
            <div className="presentation-card-tags">
              {currentIdea.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="presentation-card-tag"
                  style={{
                    backgroundColor: tag.color,
                    color: "#fff",
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Next navigation */}
      {currentIndex < sortedIdeas.length - 1 && (
        <button
          className="presentation-nav-btn presentation-nav-next"
          onClick={goNext}
          title="Next (Right Arrow or Space)"
        >
          ›
        </button>
      )}

      {/* Progress indicator */}
      <div className="presentation-progress">
        {currentIndex + 1} / {sortedIdeas.length}
      </div>
    </div>
  );
}

export default PresentationMode;
