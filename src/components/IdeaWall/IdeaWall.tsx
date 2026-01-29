import { useState, useEffect, useCallback } from "react";
import { Idea, IdeaCreate } from "../../types";
import StickyNote from "./StickyNote";
import AddIdeaForm from "./AddIdeaForm";
import "./IdeaWall.css";

const BASE_URL = "http://localhost:8000";

interface IdeaWallProps {
  onError: (message: string) => void;
}

function IdeaWall({ onError }: IdeaWallProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showForm, setShowForm] = useState(false);

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

  const createIdea = async (ideaData: IdeaCreate) => {
    try {
      const res = await fetch(`${BASE_URL}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ideaData),
      });
      if (!res.ok) throw new Error("Failed to create idea");
      const newIdea: Idea = await res.json();
      setIdeas((prev) => [...prev, newIdea]);
      setShowForm(false);
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
    } catch (err) {
      onError("Failed to delete idea");
      console.error(err);
    }
  };

  return (
    <div className="idea-wall">
      <div className="idea-wall-canvas">
        {ideas.length === 0 ? (
          <div className="empty-state">
            <h2>No ideas yet</h2>
            <p>Click the + button to add your first idea!</p>
          </div>
        ) : (
          ideas.map((idea) => (
            <StickyNote
              key={idea.id}
              idea={idea}
              onPositionChange={updatePosition}
              onVote={voteIdea}
              onDelete={deleteIdea}
            />
          ))
        )}
      </div>

      <button
        className="add-idea-btn"
        onClick={() => setShowForm(true)}
        title="Add new idea"
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
