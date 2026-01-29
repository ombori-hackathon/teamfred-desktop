import { useState, useRef, useEffect } from "react";
import { Idea } from "../../types";
import "./StickyNote.css";

interface StickyNoteProps {
  idea: Idea;
  isSelected: boolean;
  onPositionChange: (id: number, x: number, y: number) => void;
  onSizeChange: (id: number, width: number, height: number) => void;
  onContentChange: (
    id: number,
    title: string,
    description: string | null
  ) => void;
  onVote: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number | null) => void;
}

function StickyNote({
  idea,
  isSelected,
  onPositionChange,
  onSizeChange,
  onContentChange,
  onVote,
  onDelete,
  onSelect,
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
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

    onSelect(idea.id);
    setIsDragging(true);
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
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (editTitle.trim()) {
      onContentChange(
        idea.id,
        editTitle.trim(),
        editDescription.trim() || null
      );
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
      const canvas = noteRef.current?.parentElement;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.current.x;
      const newY = e.clientY - canvasRect.top - dragOffset.current.y;

      setPosition({
        x: Math.max(0, Math.min(newX, canvasRect.width - size.width)),
        y: Math.max(0, Math.min(newY, canvasRect.height - size.height)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onPositionChange(idea.id, position.x, position.y);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    idea.id,
    onPositionChange,
    position.x,
    position.y,
    size.width,
    size.height,
  ]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      const newWidth = Math.max(150, resizeStart.current.width + deltaX);
      const newHeight = Math.max(100, resizeStart.current.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onSizeChange(idea.id, size.width, size.height);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, idea.id, onSizeChange, size.width, size.height]);

  const dynamicShadow = `${4 - shadowOffset.x}px ${4 - shadowOffset.y}px 12px rgba(0, 0, 0, 0.3)`;

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${idea.color} ${isDragging ? "dragging" : ""} ${isResizing ? "resizing" : ""} ${isSelected ? "selected" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        minHeight: size.height,
        transform: `rotate(${idea.rotation || 0}deg)`,
        boxShadow: isDragging ? undefined : dynamicShadow,
      }}
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
