import { useState } from "react";
import "./NoteTemplate.css";

const COLORS = ["yellow", "pink", "blue", "green", "purple"] as const;

interface NoteTemplateProps {
  onDragStart: (color: string) => void;
  onDragEnd: () => void;
}

function NoteTemplate({ onDragStart, onDragEnd }: NoteTemplateProps) {
  const [draggingColor, setDraggingColor] = useState<string | null>(null);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    color: string
  ) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", color);
    setDraggingColor(color);
    onDragStart(color);
  };

  const handleDragEnd = () => {
    setDraggingColor(null);
    onDragEnd();
  };

  return (
    <div className="note-templates">
      {COLORS.map((color) => (
        <div
          key={color}
          className={`note-template note-template-${color} ${
            draggingColor === color ? "dragging" : ""
          }`}
          draggable
          onDragStart={(e) => handleDragStart(e, color)}
          onDragEnd={handleDragEnd}
          title={`Drag to create ${color} note`}
        />
      ))}
    </div>
  );
}

export default NoteTemplate;
