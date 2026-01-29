import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Idea,
  IdeaCreate,
  Tag,
  TagCreate,
  AISuggestions,
  AISummary,
  IdeaConnection,
  IdeaConnectionCreate,
  IdeaGroup,
  IdeaGroupCreate,
} from "../../types";
import StickyNote from "./StickyNote";
import AddIdeaForm from "./AddIdeaForm";
import TagFilter from "../TagFilter";
import AIPanel from "../AIPanel";
import NoteTemplate from "./NoteTemplate";
import ConnectionsLayer from "./ConnectionsLayer";
import IdeaGroupComponent from "./IdeaGroup";
import PresentationMode from "../PresentationMode/PresentationMode";
import { useHistory, HistoryEntry } from "../../hooks/useHistory";
import { CanvasProvider, useCanvas } from "../../contexts/CanvasContext";
import { useMultiSelect } from "../../hooks/useMultiSelect";
import { useNoteAnimations } from "../../hooks/useNoteAnimations";
import { sounds } from "../../utils/sounds";
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

  // Presentation mode state
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationSortBy] = useState<"votes" | "position" | "created">(
    "votes"
  );
  const [prefillTitle, setPrefillTitle] = useState<string | undefined>();
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);

  // Connection state
  const [connections, setConnections] = useState<IdeaConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<number | null>(
    null
  );

  // Group state
  const [groups, setGroups] = useState<IdeaGroup[]>([]);
  const multiSelect = useMultiSelect();
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const groupNameInputRef = useRef<HTMLInputElement>(null);

  const history = useHistory();
  const ideasRef = useRef<Idea[]>(ideas);
  ideasRef.current = ideas;

  const canvas = useCanvas();
  const noteAnimations = useNoteAnimations();
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

  const fetchConnections = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBoardId !== null) {
        params.append("board_id", selectedBoardId.toString());
      }
      const url = `${BASE_URL}/connections${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data: IdeaConnection[] = await res.json();
      setConnections(data);
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    }
  }, [selectedBoardId]);

  const fetchGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBoardId !== null) {
        params.append("board_id", selectedBoardId.toString());
      }
      const url = `${BASE_URL}/groups${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data: IdeaGroup[] = await res.json();
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  }, [selectedBoardId]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Focus group name input when dialog opens
  useEffect(() => {
    if (showGroupDialog && groupNameInputRef.current) {
      groupNameInputRef.current.focus();
    }
  }, [showGroupDialog]);

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
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsConnecting((prev) => !prev);
        setConnectingSourceId(null);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsPresentationMode((prev) => !prev);
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        groupSelectedIdeas();
      } else if (e.key === "Delete" && selectedId !== null) {
        e.preventDefault();
        deleteIdea(selectedId);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isConnecting) {
          setIsConnecting(false);
          setConnectingSourceId(null);
        } else {
          setSelectedId(null);
          setShowForm(false);
        }
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
  }, [
    selectedId,
    handleUndo,
    handleRedo,
    canvas,
    isSpacePressed,
    isConnecting,
    deleteIdea,
    groupSelectedIdeas,
  ]);

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

      // Play create sound
      sounds.playCreate();

      // Check for milestone celebrations
      const newCount = ideas.length + 1;
      if ([10, 25, 50, 100].includes(newCount)) {
        // Large celebration confetti for milestones
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ["#ffd700", "#ffec8b", "#ffa500"],
        });
        sounds.playCelebration();
      } else {
        // Regular confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#fef08a", "#fda4af", "#93c5fd", "#86efac", "#c4b5fd"],
        });
      }
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

  const createConnection = async (connectionData: IdeaConnectionCreate) => {
    try {
      const res = await fetch(`${BASE_URL}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionData),
      });
      if (!res.ok) throw new Error("Failed to create connection");
      const newConnection: IdeaConnection = await res.json();
      setConnections((prev) => [...prev, newConnection]);
    } catch (err) {
      onError("Failed to create connection");
      console.error(err);
    }
  };

  const deleteConnection = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/connections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete connection");
      setConnections((prev) => prev.filter((conn) => conn.id !== id));
    } catch (err) {
      onError("Failed to delete connection");
      console.error(err);
    }
  };

  const toggleConnectionMode = useCallback(() => {
    setIsConnecting((prev) => !prev);
    setConnectingSourceId(null);
  }, []);

  // Real-time position update during drag (for connection lines)
  const handleDragMove = useCallback((id: number, x: number, y: number) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id ? { ...idea, position_x: x, position_y: y } : idea
      )
    );
  }, []);

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
    // Get current idea before update
    const currentIdea = ideas.find((idea) => idea.id === id);

    try {
      const res = await fetch(`${BASE_URL}/ideas/${id}/vote`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to vote");
      const updatedIdea: Idea = await res.json();
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? updatedIdea : idea))
      );

      // Play vote sound and bounce animation
      sounds.playVote();
      noteAnimations.bounce(id);

      // Gold confetti for reaching 10+ votes
      if (currentIdea && updatedIdea.votes >= 10 && currentIdea.votes < 10) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ffd700", "#daa520", "#ffb347"],
        });
      }
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

      // Play delete sound
      sounds.playDelete();
    } catch (err) {
      onError("Failed to delete idea");
      console.error(err);
    }
  };

  // Group handlers
  const createGroup = async (groupData: IdeaGroupCreate) => {
    try {
      const res = await fetch(`${BASE_URL}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupData),
      });
      if (!res.ok) throw new Error("Failed to create group");
      const newGroup: IdeaGroup = await res.json();
      setGroups((prev) => [...prev, newGroup]);
      await fetchIdeas();
    } catch (err) {
      onError("Failed to create group");
      console.error(err);
    }
  };

  const updateGroupPosition = async (id: number, x: number, y: number) => {
    try {
      await fetch(`${BASE_URL}/groups/${id}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position_x: x, position_y: y }),
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, position_x: x, position_y: y } : g
        )
      );
    } catch (err) {
      console.error("Failed to update group position:", err);
    }
  };

  const updateGroupSize = async (id: number, width: number, height: number) => {
    try {
      await fetch(`${BASE_URL}/groups/${id}/size`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width, height }),
      });
      setGroups((prev) =>
        prev.map((g) => (g.id === id ? { ...g, width, height } : g))
      );
    } catch (err) {
      console.error("Failed to update group size:", err);
    }
  };

  const toggleGroupCollapse = async (id: number) => {
    try {
      const group = groups.find((g) => g.id === id);
      if (!group) return;
      const res = await fetch(`${BASE_URL}/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_collapsed: !group.is_collapsed }),
      });
      if (!res.ok) throw new Error("Failed to toggle collapse");
      const updatedGroup: IdeaGroup = await res.json();
      setGroups((prev) => prev.map((g) => (g.id === id ? updatedGroup : g)));
    } catch (err) {
      console.error("Failed to toggle group collapse:", err);
    }
  };

  const deleteGroup = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/groups/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete group");
      setGroups((prev) => prev.filter((g) => g.id !== id));
      await fetchIdeas();
    } catch (err) {
      onError("Failed to delete group");
      console.error(err);
    }
  };

  const handleDragGroup = (groupId: number, deltaX: number, deltaY: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    setIdeas((prev) =>
      prev.map((idea) => {
        if (group.idea_ids.includes(idea.id)) {
          return {
            ...idea,
            position_x: idea.position_x + deltaX,
            position_y: idea.position_y + deltaY,
          };
        }
        return idea;
      })
    );

    group.idea_ids.forEach((ideaId) => {
      const idea = ideas.find((i) => i.id === ideaId);
      if (idea) {
        fetch(`${BASE_URL}/ideas/${ideaId}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_x: idea.position_x + deltaX,
            position_y: idea.position_y + deltaY,
          }),
        }).catch(console.error);
      }
    });
  };

  const groupSelectedIdeas = () => {
    if (multiSelect.selectedIds.length === 0) {
      onError("Select ideas with Ctrl+Click first");
      return;
    }
    setShowGroupDialog(true);
  };

  const handleCreateGroupSubmit = async () => {
    if (!groupName.trim()) {
      onError("Group name is required");
      return;
    }

    const selectedIdeas = ideas.filter((idea) =>
      multiSelect.selectedIds.includes(idea.id)
    );
    if (selectedIdeas.length === 0) return;

    const minX = Math.min(...selectedIdeas.map((i) => i.position_x)) - 20;
    const minY = Math.min(...selectedIdeas.map((i) => i.position_y)) - 60;
    const maxX =
      Math.max(...selectedIdeas.map((i) => i.position_x + i.width)) + 20;
    const maxY =
      Math.max(...selectedIdeas.map((i) => i.position_y + i.height)) + 20;

    const groupData: IdeaGroupCreate = {
      name: groupName.trim(),
      color: "#a78bfa",
      board_id: selectedBoardId,
      position_x: minX,
      position_y: minY,
      width: maxX - minX,
      height: maxY - minY,
      idea_ids: multiSelect.selectedIds,
    };

    await createGroup(groupData);
    setShowGroupDialog(false);
    setGroupName("");
    multiSelect.clearSelection();
  };

  const handleSelect = (id: number | null, ctrlKey: boolean = false) => {
    // If in connection mode, handle connection logic
    if (isConnecting && id !== null) {
      if (connectingSourceId === null) {
        setConnectingSourceId(id);
      } else if (connectingSourceId !== id) {
        createConnection({
          source_id: connectingSourceId,
          target_id: id,
          connection_type: "relates_to",
        });
        setConnectingSourceId(null);
        setIsConnecting(false);
      }
      return;
    }

    // Multi-select with Ctrl
    if (ctrlKey && id !== null) {
      multiSelect.toggleSelect(id, true);
      setSelectedId(null); // Clear single selection when multi-selecting
    } else {
      multiSelect.clearSelection();
      setSelectedId(id);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't deselect if we were panning
    if (isPanning) return;
    if (
      (e.target as HTMLElement).classList.contains("idea-wall-canvas") ||
      (e.target as HTMLElement).classList.contains("canvas-transform-layer")
    ) {
      setSelectedId(null);
      multiSelect.clearSelection();
      // Exit connection mode if clicking on empty canvas
      if (isConnecting) {
        setIsConnecting(false);
        setConnectingSourceId(null);
      }
    }
  };

  // Drag-to-create handlers
  const handleTemplateDragStart = () => {
    setIsDraggingTemplate(true);
  };

  const handleTemplateDragEnd = () => {
    setIsDraggingTemplate(false);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    if (isDraggingTemplate) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDraggingTemplate) return;

    const color = e.dataTransfer.getData("text/plain");
    if (!color || !COLORS.includes(color as (typeof COLORS)[number])) return;

    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert screen coordinates to canvas coordinates
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = canvas.screenToCanvas(screenX, screenY);

    // Create idea directly at drop position with selected color
    const rotation = Math.random() * 6 - 3;
    const ideaData: IdeaCreate = {
      title: "New Idea",
      color,
      position_x: canvasPos.x,
      position_y: canvasPos.y,
      rotation,
      board_id: selectedBoardId,
    };

    try {
      const res = await fetch(`${BASE_URL}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ideaData),
      });
      if (!res.ok) throw new Error("Failed to create idea");
      const newIdea: Idea = await res.json();
      setIdeas((prev) => [...prev, newIdea]);
      onBoardsChange();

      // Fire confetti
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

    setIsDraggingTemplate(false);
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
            <button
              className={`history-btn ${isConnecting ? "connecting-active" : ""}`}
              onClick={toggleConnectionMode}
              title="Connect notes (C)"
            >
              ⟷
            </button>
            <button
              className="history-btn group-btn"
              onClick={groupSelectedIdeas}
              disabled={multiSelect.selectedIds.length === 0}
              title={
                multiSelect.selectedIds.length === 0
                  ? "Ctrl+Click notes to select, then press G to group"
                  : `Group ${multiSelect.selectedIds.length} selected notes (G)`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="2" width="12" height="12" rx="2" />
                {multiSelect.selectedIds.length > 0 && (
                  <path
                    d="M4.5 8L7 10.5L11.5 5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
              {multiSelect.selectedIds.length > 0 && (
                <span className="selection-count">
                  {multiSelect.selectedIds.length}
                </span>
              )}
            </button>
          </div>
          <NoteTemplate
            onDragStart={handleTemplateDragStart}
            onDragEnd={handleTemplateDragEnd}
          />
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
            <button
              className="present-btn"
              onClick={() => setIsPresentationMode(true)}
              title="Present ideas (P)"
            >
              Present
            </button>
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
        className={`idea-wall-canvas ${isPanning || isSpacePressed ? "panning" : ""} ${isConnecting ? "connecting-mode" : ""} ${isDraggingTemplate ? "drag-over" : ""}`}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <div
          className="canvas-transform-layer"
          style={{
            transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Connections layer - renders behind notes */}
          <ConnectionsLayer
            connections={connections}
            ideas={filteredIdeas}
            isConnecting={isConnecting}
            connectingSourceId={connectingSourceId}
            canvasWidth={10000}
            canvasHeight={10000}
            onDeleteConnection={deleteConnection}
          />

          {/* Render groups */}
          {groups.map((group) => (
            <IdeaGroupComponent
              key={group.id}
              group={group}
              onPositionChange={updateGroupPosition}
              onSizeChange={updateGroupSize}
              onCollapse={toggleGroupCollapse}
              onDelete={deleteGroup}
              onDragGroup={handleDragGroup}
              zoom={canvas.zoom}
              panX={canvas.panX}
              panY={canvas.panY}
            />
          ))}

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
                isSelected={
                  selectedId === idea.id ||
                  multiSelect.selectedIds.includes(idea.id)
                }
                onPositionChange={updatePosition}
                onDragMove={handleDragMove}
                onSizeChange={updateSize}
                onContentChange={updateContent}
                onVote={voteIdea}
                onDelete={deleteIdea}
                onSelect={handleSelect}
                onTagsChange={updateIdeaTags}
                zoom={canvas.zoom}
                panX={canvas.panX}
                panY={canvas.panY}
                animationClass={noteAnimations.getAnimationClass(idea.id)}
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
          <kbd>C</kbd> Connect
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
        <span>
          <kbd>P</kbd> Present
        </span>
        <span>
          <kbd>Ctrl+Click</kbd> Select
        </span>
        <span>
          <kbd>G</kbd> Group
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

      {isPresentationMode && (
        <PresentationMode
          ideas={filteredIdeas}
          onExit={() => setIsPresentationMode(false)}
          sortBy={presentationSortBy}
        />
      )}

      {showGroupDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowGroupDialog(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Group</h2>
            <input
              ref={groupNameInputRef}
              type="text"
              className="group-name-input"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleCreateGroupSubmit();
                if (e.key === "Escape") setShowGroupDialog(false);
              }}
            />
            <div className="modal-buttons">
              <button onClick={handleCreateGroupSubmit}>Create</button>
              <button onClick={() => setShowGroupDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
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
