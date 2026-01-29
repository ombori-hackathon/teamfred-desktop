import { useState, useRef, useEffect } from "react";
import { Idea } from "../../types";
import TagChips from "../TagChips";
import "./StickyNote.css";

interface StickyNoteProps {
  idea: Idea;
  isSelected: boolean;
  onPositionChange: (
    id: number,
    x: number,
    y: number,
    oldX?: number,
    oldY?: number
  ) => void;
  onDragMove?: (id: number, x: number, y: number) => void; // Real-time position during drag
  onSizeChange: (
    id: number,
    width: number,
    height: number,
    oldWidth?: number,
    oldHeight?: number
  ) => void;
  onContentChange: (
    id: number,
    title: string,
    description: string | null,
    oldTitle?: string,
    oldDescription?: string | null
  ) => void;
  onVote: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number | null, ctrlKey?: boolean) => void;
  onTagsChange: (id: number, tagIds: number[], oldTagIds?: number[]) => void;
  zoom?: number;
  panX?: number;
  panY?: number;
  animationClass?: string;
}

function StickyNote({
  idea,
  isSelected,
  onPositionChange,
  onDragMove,
  onSizeChange,
  onContentChange,
  onVote,
  onDelete,
  onSelect,
  onTagsChange,
  zoom = 1,
  panX = 0,
  panY = 0,
  animationClass = "",
}: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(idea.title);
  const [editDescription, setEditDescription] = useState(
    idea.description || ""
  );
  const [position, setPosition] = useState({
    x: idea.position_x,
    y: idea.position_y,
  });
  const [size, setSize] = useState({
    width: idea.width || 200,
    height: idea.height || 150,
  });
  const [shadowOffset, setShadowOffset] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 }); // Track current position for mouseUp
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editStartContent = useRef({ title: "", description: "" });

  useEffect(() => {
    setPosition({ x: idea.position_x, y: idea.position_y });
  }, [idea.position_x, idea.position_y]);

  useEffect(() => {
    setSize({ width: idea.width || 200, height: idea.height || 150 });
  }, [idea.width, idea.height]);

  useEffect(() => {
    setEditTitle(idea.title);
    setEditDescription(idea.description || "");
  }, [idea.title, idea.description]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    if ((e.target as HTMLElement).closest("input, textarea")) return;

    onSelect(idea.id, e.ctrlKey);
    setIsDragging(true);
    // Capture initial position for history
    dragStartPos.current = { x: position.x, y: position.y };
    currentPosRef.current = { x: position.x, y: position.y };
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    // Capture initial content for history
    editStartContent.current = {
      title: idea.title,
      description: idea.description || "",
    };
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (editTitle.trim()) {
      const newTitle = editTitle.trim();
      const newDescription = editDescription.trim() || null;
      // Only call onContentChange if content actually changed
      if (
        newTitle !== editStartContent.current.title ||
        newDescription !== (editStartContent.current.description || null)
      ) {
        onContentChange(
          idea.id,
          newTitle,
          newDescription,
          editStartContent.current.title,
          editStartContent.current.description || null
        );
      }
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      setEditTitle(idea.title);
      setEditDescription(idea.description || "");
      setIsEditing(false);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!noteRef.current) return;
    const rect = noteRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) / 20;
    const offsetY = (e.clientY - centerY) / 20;
    setShadowOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseLeave = () => {
    setShadowOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Get the canvas transform layer (parent element)
      const transformLayer = noteRef.current?.parentElement;
      // Get the canvas container (grandparent)
      const canvasContainer = transformLayer?.parentElement;
      if (!canvasContainer) return;

      const containerRect = canvasContainer.getBoundingClientRect();

      // Convert screen coordinates to canvas coordinates (accounting for zoom and pan)
      const screenX = e.clientX - containerRect.left;
      const screenY = e.clientY - containerRect.top;

      // Convert to canvas space (reverse the transform)
      const canvasX = (screenX - panX) / zoom;
      const canvasY = (screenY - panY) / zoom;

      // Apply drag offset (also scaled)
      const newX = Math.max(0, canvasX - dragOffset.current.x / zoom);
      const newY = Math.max(0, canvasY - dragOffset.current.y / zoom);

      // Update both state and ref
      currentPosRef.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });

      // Notify parent for real-time updates (e.g., connection lines)
      onDragMove?.(idea.id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Use ref for final position to avoid stale closure
      const finalX = currentPosRef.current.x;
      const finalY = currentPosRef.current.y;
      const startX = dragStartPos.current.x;
      const startY = dragStartPos.current.y;
      if (finalX !== startX || finalY !== startY) {
        onPositionChange(idea.id, finalX, finalY, startX, startY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, idea.id, onPositionChange, onDragMove, zoom, panX, panY]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Scale the delta by zoom level
      const deltaX = (e.clientX - resizeStart.current.x) / zoom;
      const deltaY = (e.clientY - resizeStart.current.y) / zoom;
      const newWidth = Math.max(150, resizeStart.current.width + deltaX);
      const newHeight = Math.max(100, resizeStart.current.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Only record history if size actually changed
      const startWidth = resizeStart.current.width;
      const startHeight = resizeStart.current.height;
      if (size.width !== startWidth || size.height !== startHeight) {
        onSizeChange(idea.id, size.width, size.height, startWidth, startHeight);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, idea.id, onSizeChange, size.width, size.height, zoom]);

  const dynamicShadow = `${4 - shadowOffset.x}px ${4 - shadowOffset.y}px 12px rgba(0, 0, 0, 0.3)`;

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${idea.color} ${isDragging ? "dragging" : ""} ${isResizing ? "resizing" : ""} ${isSelected ? "selected" : ""} ${animationClass}`}
      style={
        {
          left: position.x,
          top: position.y,
          width: size.width,
          minHeight: size.height,
          transform: `rotate(${idea.rotation || 0}deg)`,
          boxShadow: isDragging ? undefined : dynamicShadow,
          "--rotation": `${idea.rotation || 0}deg`,
        } as React.CSSProperties & { "--rotation": string }
      }
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sticky-note-header">
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            className="sticky-note-title-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditSave}
          />
        ) : (
          <h3 className="sticky-note-title">{idea.title}</h3>
        )}
        <button
          className="sticky-note-delete"
          onClick={() => onDelete(idea.id)}
          title="Delete idea"
        >
          ×
        </button>
      </div>

      {isEditing ? (
        <textarea
          className="sticky-note-description-input"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onKeyDown={handleEditKeyDown}
          placeholder="Add description..."
          rows={3}
        />
      ) : (
        idea.description && (
          <p className="sticky-note-description">{idea.description}</p>
        )
      )}

      {idea.tags && idea.tags.length > 0 && (
        <div className="sticky-note-tags">
          <TagChips
            tags={idea.tags}
            size="small"
            onRemove={(tagId) => {
              const oldTagIds = (idea.tags || []).map((t) => t.id);
              const newTagIds = oldTagIds.filter((id) => id !== tagId);
              onTagsChange(idea.id, newTagIds, oldTagIds);
            }}
          />
        </div>
      )}

      <div className="sticky-note-footer">
        <button className="sticky-note-vote" onClick={() => onVote(idea.id)}>
          <span className="vote-star">★</span>
          <span className="vote-count">{idea.votes}</span>
        </button>
      </div>

      <div className="resize-handle" onMouseDown={handleResizeStart} />
    </div>
  );
}

export default StickyNote;
