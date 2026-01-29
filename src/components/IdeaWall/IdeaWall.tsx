import { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";
import { Idea, IdeaCreate } from "../../types";
import StickyNote from "./StickyNote";
import AddIdeaForm from "./AddIdeaForm";
import "./IdeaWall.css";

const BASE_URL = "http://localhost:8001";

const COLORS = ["yellow", "pink", "blue", "green", "purple"] as const;

interface IdeaWallProps {
  onError: (message: string) => void;
}

function IdeaWall({ onError }: IdeaWallProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/ideas`);
      if (!res.ok) throw new Error("Failed to fetch ideas");
      const data: Idea[] = await res.json();
      setIdeas(data);
    } catch (err) {
      onError("Failed to load ideas");
      console.error(err);
    }
  }, [onError]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowForm(true);
      } else if (e.key === "Delete" && selectedId !== null) {
        e.preventDefault();
        deleteIdea(selectedId);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedId(null);
        setShowForm(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const createIdea = async (ideaData: IdeaCreate) => {
    // Add random rotation between -3 and +3 degrees
    const rotation = Math.random() * 6 - 3;
    const ideaWithRotation = { ...ideaData, rotation };

    try {
      const res = await fetch(`${BASE_URL}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ideaWithRotation),
      });
      if (!res.ok) throw new Error("Failed to create idea");
      const newIdea: Idea = await res.json();
      setIdeas((prev) => [...prev, newIdea]);
      setShowForm(false);

      // Fire confetti!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#fef08a", "#fda4af", "#93c5fd", "#86efac", "#c4b5fd"],
      });
    } catch (err) {
      onError("Failed to create idea");
      console.error(err);
    }
  };

  const updatePosition = async (id: number, x: number, y: number) => {
    try {
      await fetch(`${BASE_URL}/ideas/${id}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position_x: x, position_y: y }),
      });
    } catch (err) {
      console.error("Failed to update position:", err);
    }
  };

  const updateSize = async (id: number, width: number, height: number) => {
    try {
      const res = await fetch(`${BASE_URL}/ideas/${id}/size`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width, height }),
      });
      if (!res.ok) throw new Error("Failed to update size");
      const updatedIdea: Idea = await res.json();
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? updatedIdea : idea))
      );
    } catch (err) {
      console.error("Failed to update size:", err);
    }
  };

  const updateContent = async (
    id: number,
    title: string,
    description: string | null
  ) => {
    try {
      const res = await fetch(`${BASE_URL}/ideas/${id}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Failed to update content");
      const updatedIdea: Idea = await res.json();
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? updatedIdea : idea))
      );
    } catch (err) {
      console.error("Failed to update content:", err);
    }
  };

  const voteIdea = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/ideas/${id}/vote`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to vote");
      const updatedIdea: Idea = await res.json();
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? updatedIdea : idea))
      );
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  const deleteIdea = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/ideas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      onError("Failed to delete idea");
      console.error(err);
    }
  };

  const handleSelect = (id: number | null) => {
    setSelectedId(id);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("idea-wall-canvas")) {
      setSelectedId(null);
    }
  };

  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      // Color filter
      if (colorFilter && idea.color !== colorFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = idea.title.toLowerCase().includes(query);
        const matchesDescription = idea.description
          ?.toLowerCase()
          .includes(query);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }
      return true;
    });
  }, [ideas, colorFilter, searchQuery]);

  return (
    <div className="idea-wall">
      <div className="idea-wall-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search ideas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="color-filter">
          <button
            className={`filter-btn filter-btn-clear ${!colorFilter ? "active" : ""}`}
            onClick={() => setColorFilter(null)}
            title="Show all colors"
          >
            All
          </button>
          {COLORS.map((color) => (
            <button
              key={color}
              className={`filter-btn filter-btn-${color} ${colorFilter === color ? "active" : ""}`}
              onClick={() => setColorFilter(color)}
              title={`Filter by ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="idea-wall-canvas" onClick={handleCanvasClick}>
        {filteredIdeas.length === 0 ? (
          <div className="empty-state">
            {ideas.length === 0 ? (
              <>
                <h2>No ideas yet</h2>
                <p>Click the + button or press N to add your first idea!</p>
              </>
            ) : (
              <>
                <h2>No matches</h2>
                <p>Try adjusting your search or filter</p>
              </>
            )}
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <StickyNote
              key={idea.id}
              idea={idea}
              isSelected={selectedId === idea.id}
              onPositionChange={updatePosition}
              onSizeChange={updateSize}
              onContentChange={updateContent}
              onVote={voteIdea}
              onDelete={deleteIdea}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      <div className="keyboard-hints">
        <span>
          <kbd>N</kbd> New idea
        </span>
        <span>
          <kbd>Delete</kbd> Remove selected
        </span>
        <span>
          <kbd>Esc</kbd> Deselect
        </span>
        <span>Double-click to edit</span>
      </div>

      <button
        className="add-idea-btn"
        onClick={() => setShowForm(true)}
        title="Add new idea (N)"
      >
        +
      </button>

      {showForm && (
        <AddIdeaForm
          onSubmit={createIdea}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default IdeaWall;
