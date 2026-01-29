import { useState, useRef, useEffect } from "react";
import { IdeaGroup as IdeaGroupType } from "../../types";
import "./IdeaGroup.css";

interface IdeaGroupProps {
  group: IdeaGroupType;
  onPositionChange: (
    id: number,
    x: number,
    y: number,
    oldX?: number,
    oldY?: number
  ) => void;
  onSizeChange: (
    id: number,
    width: number,
    height: number,
    oldWidth?: number,
    oldHeight?: number
  ) => void;
  onCollapse: (id: number) => void;
  onDelete: (id: number) => void;
  onDragGroup: (groupId: number, deltaX: number, deltaY: number) => void;
  zoom?: number;
  panX?: number;
  panY?: number;
}

function IdeaGroup({
  group,
  onPositionChange,
  onSizeChange,
  onCollapse,
  onDelete,
  onDragGroup,
  zoom = 1,
}: IdeaGroupProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({
    x: group.position_x,
    y: group.position_y,
  });
  const [size, setSize] = useState({
    width: group.width,
    height: group.height,
  });
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 }); // Track last position for incremental deltas
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition({ x: group.position_x, y: group.position_y });
  }, [group.position_x, group.position_y]);

  useEffect(() => {
    setSize({ width: group.width, height: group.height });
  }, [group.width, group.height]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartPos.current = { x: position.x, y: position.y };
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    groupRef.current?.setAttribute("data-resize-direction", direction);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Cumulative delta for group position (from drag start)
      const cumulativeDeltaX = (e.clientX - dragStart.current.x) / zoom;
      const cumulativeDeltaY = (e.clientY - dragStart.current.y) / zoom;

      // Incremental delta for idea positions (from last mouse position)
      const incrementalDeltaX = (e.clientX - lastMousePos.current.x) / zoom;
      const incrementalDeltaY = (e.clientY - lastMousePos.current.y) / zoom;

      // Update last mouse position
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const newX = Math.max(0, dragStartPos.current.x + cumulativeDeltaX);
      const newY = Math.max(0, dragStartPos.current.y + cumulativeDeltaY);

      setPosition({ x: newX, y: newY });

      // Notify parent to move all ideas in the group (use incremental delta)
      onDragGroup(group.id, incrementalDeltaX, incrementalDeltaY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const startX = dragStartPos.current.x;
      const startY = dragStartPos.current.y;
      if (position.x !== startX || position.y !== startY) {
        onPositionChange(group.id, position.x, position.y, startX, startY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    group.id,
    onPositionChange,
    onDragGroup,
    position.x,
    position.y,
    zoom,
  ]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - resizeStart.current.x) / zoom;
      const deltaY = (e.clientY - resizeStart.current.y) / zoom;
      const newWidth = Math.max(200, resizeStart.current.width + deltaX);
      const newHeight = Math.max(150, resizeStart.current.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const startWidth = resizeStart.current.width;
      const startHeight = resizeStart.current.height;
      if (size.width !== startWidth || size.height !== startHeight) {
        onSizeChange(
          group.id,
          size.width,
          size.height,
          startWidth,
          startHeight
        );
      }
      groupRef.current?.removeAttribute("data-resize-direction");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, group.id, onSizeChange, size.width, size.height, zoom]);

  return (
    <div
      ref={groupRef}
      className={`idea-group ${isDragging ? "dragging" : ""} ${isResizing ? "resizing" : ""} ${group.is_collapsed ? "collapsed" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: group.is_collapsed ? "auto" : size.height,
        borderColor: group.color,
      }}
    >
      <div className="group-header" onMouseDown={handleHeaderMouseDown}>
        <div
          className="group-color-indicator"
          style={{ background: group.color }}
        />
        <span className="group-name">{group.name}</span>
        <div className="group-actions">
          <span className="group-count">{group.idea_ids.length}</span>
          <button
            className="group-collapse-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCollapse(group.id);
            }}
            title={group.is_collapsed ? "Expand" : "Collapse"}
          >
            {group.is_collapsed ? "▼" : "▲"}
          </button>
          <button
            className="group-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  `Delete group "${group.name}"? Ideas will remain on the board.`
                )
              ) {
                onDelete(group.id);
              }
            }}
            title="Delete group"
          >
            ×
          </button>
        </div>
      </div>

      {!group.is_collapsed && (
        <>
          <div
            className="resize-handle resize-se"
            onMouseDown={(e) => handleResizeStart(e, "se")}
          />
          <div
            className="resize-handle resize-e"
            onMouseDown={(e) => handleResizeStart(e, "e")}
          />
          <div
            className="resize-handle resize-s"
            onMouseDown={(e) => handleResizeStart(e, "s")}
          />
        </>
      )}
    </div>
  );
}

export default IdeaGroup;
