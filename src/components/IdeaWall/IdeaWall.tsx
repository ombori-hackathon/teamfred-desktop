import { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Idea,
  IdeaCreate,
  Tag,
  TagCreate,
  AISuggestions,
  AISummary,
} from "../../types";
import StickyNote from "./StickyNote";
import AddIdeaForm from "./AddIdeaForm";
import TagFilter from "../TagFilter";
import AIPanel from "../AIPanel";
import "./IdeaWall.css";

const BASE_URL = "http://localhost:8001";

const COLORS = ["yellow", "pink", "blue", "green", "purple"] as const;

interface IdeaWallProps {
  onError: (message: string) => void;
  selectedBoardId: number | null;
  onBoardsChange: () => void;
}

function IdeaWall({ onError, selectedBoardId, onBoardsChange }: IdeaWallProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [prefillTitle, setPrefillTitle] = useState<string | undefined>();

  const fetchIdeas = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBoardId !== null) {
        params.append("board_id", selectedBoardId.toString());
      }
      const url = `${BASE_URL}/ideas${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch ideas");
      const data: Idea[] = await res.json();
      setIdeas(data);
    } catch (err) {
      onError("Failed to load ideas");
      console.error(err);
    }
  }, [onError, selectedBoardId]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/tags`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      const data: Tag[] = await res.json();
      setTags(data);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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
    const ideaWithRotation = {
      ...ideaData,
      rotation,
      board_id: selectedBoardId,
    };

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
      setPrefillTitle(undefined);
      onBoardsChange(); // Update board idea counts

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

  const createTag = async (tagData: TagCreate) => {
    try {
      const res = await fetch(`${BASE_URL}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagData),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      const newTag: Tag = await res.json();
      setTags((prev) => [...prev, newTag]);
    } catch (err) {
      onError("Failed to create tag");
      console.error(err);
    }
  };

  const deleteTag = async (tagId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/tags/${tagId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tag");
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
    } catch (err) {
      onError("Failed to delete tag");
      console.error(err);
    }
  };

  const toggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const updateIdeaTags = async (ideaId: number, tagIds: number[]) => {
    try {
      const res = await fetch(`${BASE_URL}/ideas/${ideaId}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: tagIds }),
      });
      if (!res.ok) throw new Error("Failed to update tags");
      const updatedIdea: Idea = await res.json();
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? updatedIdea : idea))
      );
    } catch (err) {
      console.error("Failed to update idea tags:", err);
    }
  };

  const getAISuggestions = async (): Promise<AISuggestions> => {
    if (selectedBoardId === null) {
      throw new Error("Select a board first");
    }
    const res = await fetch(`${BASE_URL}/ai/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: selectedBoardId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to get suggestions");
    }
    return res.json();
  };

  const getAISummary = async (): Promise<AISummary> => {
    if (selectedBoardId === null) {
      throw new Error("Select a board first");
    }
    const res = await fetch(`${BASE_URL}/ai/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: selectedBoardId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to summarize");
    }
    return res.json();
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPrefillTitle(suggestion);
    setShowForm(true);
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
      onBoardsChange(); // Update board idea counts
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
      // Tag filter
      if (selectedTagIds.length > 0) {
        const ideaTagIds = (idea.tags || []).map((t) => t.id);
        const hasAllTags = selectedTagIds.every((tagId) =>
          ideaTagIds.includes(tagId)
        );
        if (!hasAllTags) {
          return false;
        }
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = idea.title.toLowerCase().includes(query);
        const matchesDescription = idea.description
          ?.toLowerCase()
          .includes(query);
        const matchesTags = (idea.tags || []).some((tag) =>
          tag.name.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDescription && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [ideas, colorFilter, searchQuery, selectedTagIds]);

  return (
    <div className="idea-wall">
      <div className="idea-wall-toolbar">
        <div className="toolbar-row">
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
        <TagFilter
          tags={tags}
          selectedTagIds={selectedTagIds}
          onToggleTag={toggleTagFilter}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
        />
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
              onTagsChange={updateIdeaTags}
            />
          ))
        )}
      </div>

      <AIPanel
        boardId={selectedBoardId}
        onGetSuggestions={getAISuggestions}
        onSummarize={getAISummary}
        onUseSuggestion={handleUseSuggestion}
      />

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
          onCancel={() => {
            setShowForm(false);
            setPrefillTitle(undefined);
          }}
          tags={tags}
          prefillTitle={prefillTitle}
        />
      )}
    </div>
  );
}

export default IdeaWall;
