import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { useHistory, HistoryEntry } from "../../hooks/useHistory";
import { CanvasProvider, useCanvas } from "../../contexts/CanvasContext";
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

  const history = useHistory();
  const ideasRef = useRef<Idea[]>(ideas);
  ideasRef.current = ideas;

  const canvas = useCanvas();
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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

  // Apply history entry (for undo/redo)
  const applyHistoryEntry = useCallback(
    async (entry: HistoryEntry, isUndo: boolean) => {
      const value = isUndo ? entry.before : entry.after;

      switch (entry.type) {
        case "position": {
          const pos = value as { x: number; y: number };
          // Update local state immediately
          setIdeas((prev) =>
            prev.map((idea) =>
              idea.id === entry.ideaId
                ? { ...idea, position_x: pos.x, position_y: pos.y }
                : idea
            )
          );
          // Sync to backend
          await fetch(`${BASE_URL}/ideas/${entry.ideaId}/position`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position_x: pos.x, position_y: pos.y }),
          }).catch(console.error);
          break;
        }
        case "size": {
          const size = value as { width: number; height: number };
          setIdeas((prev) =>
            prev.map((idea) =>
              idea.id === entry.ideaId
                ? { ...idea, width: size.width, height: size.height }
                : idea
            )
          );
          await fetch(`${BASE_URL}/ideas/${entry.ideaId}/size`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(size),
          }).catch(console.error);
          break;
        }
        case "content": {
          const content = value as {
            title: string;
            description: string | null;
          };
          setIdeas((prev) =>
            prev.map((idea) =>
              idea.id === entry.ideaId
                ? {
                    ...idea,
                    title: content.title,
                    description: content.description,
                  }
                : idea
            )
          );
          await fetch(`${BASE_URL}/ideas/${entry.ideaId}/content`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(content),
          }).catch(console.error);
          break;
        }
        case "tags": {
          const tagIds = value as number[];
          const res = await fetch(`${BASE_URL}/ideas/${entry.ideaId}/tags`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag_ids: tagIds }),
          }).catch(console.error);
          if (res && res.ok) {
            const updatedIdea: Idea = await res.json();
            setIdeas((prev) =>
              prev.map((idea) =>
                idea.id === entry.ideaId ? updatedIdea : idea
              )
            );
          }
          break;
        }
      }
    },
    []
  );

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (entry) {
      applyHistoryEntry(entry, true);
    }
  }, [history, applyHistoryEntry]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (entry) {
      applyHistoryEntry(entry, false);
    }
  }, [history, applyHistoryEntry]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track space key for panning
      if (e.code === "Space" && !isSpacePressed) {
        // Only enable space-panning when not typing
        if (
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)
        ) {
          e.preventDefault();
          setIsSpacePressed(true);
        }
        return;
      }

      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        (e.ctrlKey && e.shiftKey && e.key === "Z") ||
        (e.ctrlKey && e.key === "y")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Reset zoom: Ctrl+0
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        canvas.resetZoom();
        return;
      }

      // Zoom in: Ctrl++ or Ctrl+=
      if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        canvas.zoomIn();
        return;
      }

      // Zoom out: Ctrl+-
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        canvas.zoomOut();
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

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedId, handleUndo, handleRedo, canvas, isSpacePressed]);

  // Wheel zoom handler - must use native event listener with passive: false
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        canvas.setZoom(canvas.zoom + delta);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [canvas]);

  // Pan handlers
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button or space+click for panning
      if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: canvas.panX,
          panY: canvas.panY,
        };
      }
    },
    [isSpacePressed, canvas.panX, canvas.panY]
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      canvas.setPan(panStart.current.panX + dx, panStart.current.panY + dy);
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, canvas]);

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

  const updateIdeaTags = async (
    ideaId: number,
    tagIds: number[],
    oldTagIds?: number[]
  ) => {
    // Track history if we have old tag IDs
    if (oldTagIds !== undefined) {
      history.push({
        type: "tags",
        ideaId: ideaId,
        before: oldTagIds,
        after: tagIds,
      });
    }

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
      if (res.status === 503) {
        throw new Error("AI not configured");
      }
      const error = await res.json().catch(() => ({}));
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
      if (res.status === 503) {
        throw new Error("AI not configured");
      }
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to summarize");
    }
    return res.json();
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPrefillTitle(suggestion);
    setShowForm(true);
  };

  const updatePosition = async (
    id: number,
    x: number,
    y: number,
    oldX?: number,
    oldY?: number
  ) => {
    // Track history if we have old position
    if (oldX !== undefined && oldY !== undefined) {
      history.push({
        type: "position",
        ideaId: id,
        before: { x: oldX, y: oldY },
        after: { x, y },
      });
    }

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

  const updateSize = async (
    id: number,
    width: number,
    height: number,
    oldWidth?: number,
    oldHeight?: number
  ) => {
    // Track history if we have old size
    if (oldWidth !== undefined && oldHeight !== undefined) {
      history.push({
        type: "size",
        ideaId: id,
        before: { width: oldWidth, height: oldHeight },
        after: { width, height },
      });
    }

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
    description: string | null,
    oldTitle?: string,
    oldDescription?: string | null
  ) => {
    // Track history if we have old content
    if (oldTitle !== undefined) {
      history.push({
        type: "content",
        ideaId: id,
        before: { title: oldTitle, description: oldDescription ?? null },
        after: { title, description },
      });
    }

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
    // Don't deselect if we were panning
    if (isPanning) return;
    if (
      (e.target as HTMLElement).classList.contains("idea-wall-canvas") ||
      (e.target as HTMLElement).classList.contains("canvas-transform-layer")
    ) {
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
          <div className="history-buttons">
            <button
              className="history-btn"
              onClick={handleUndo}
              disabled={!history.canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              className="history-btn"
              onClick={handleRedo}
              disabled={!history.canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷
            </button>
          </div>
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

      <div
        ref={canvasContainerRef}
        className={`idea-wall-canvas ${isPanning || isSpacePressed ? "panning" : ""}`}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
      >
        <div
          className="canvas-transform-layer"
          style={{
            transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
            transformOrigin: "0 0",
          }}
        >
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
                zoom={canvas.zoom}
                panX={canvas.panX}
                panY={canvas.panY}
              />
            ))
          )}
        </div>

        {/* Zoom controls */}
        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={canvas.zoomOut}
            title="Zoom out (Ctrl+-)"
          >
            −
          </button>
          <span className="zoom-level">{Math.round(canvas.zoom * 100)}%</span>
          <button
            className="zoom-btn"
            onClick={canvas.zoomIn}
            title="Zoom in (Ctrl++)"
          >
            +
          </button>
          <button
            className="zoom-btn zoom-reset"
            onClick={canvas.resetZoom}
            title="Reset zoom (Ctrl+0)"
          >
            ⟲
          </button>
        </div>
      </div>

      <AIPanel
        boardId={selectedBoardId}
        onGetSuggestions={getAISuggestions}
        onSummarize={getAISummary}
        onUseSuggestion={handleUseSuggestion}
      />

      <div className="keyboard-hints">
        <span>
          <kbd>N</kbd> New
        </span>
        <span>
          <kbd>Ctrl+Z</kbd> Undo
        </span>
        <span>
          <kbd>Ctrl+Shift+Z</kbd> Redo
        </span>
        <span>
          <kbd>Ctrl+Scroll</kbd> Zoom
        </span>
        <span>
          <kbd>Space+Drag</kbd> Pan
        </span>
        <span>
          <kbd>Ctrl+0</kbd> Reset
        </span>
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

function IdeaWallWithCanvas(props: IdeaWallProps) {
  return (
    <CanvasProvider>
      <IdeaWall {...props} />
    </CanvasProvider>
  );
}

export default IdeaWallWithCanvas;
