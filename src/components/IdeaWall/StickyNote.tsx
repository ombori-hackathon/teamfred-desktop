import { useState, useRef, useEffect } from 'react';
import { Idea } from '../../types';
import './StickyNote.css';

interface StickyNoteProps {
  idea: Idea;
  onPositionChange: (id: number, x: number, y: number) => void;
  onVote: (id: number) => void;
  onDelete: (id: number) => void;
}

function StickyNote({ idea, onPositionChange, onVote, onDelete }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: idea.position_x, y: idea.position_y });
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition({ x: idea.position_x, y: idea.position_y });
  }, [idea.position_x, idea.position_y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
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
        x: Math.max(0, Math.min(newX, canvasRect.width - 200)),
        y: Math.max(0, Math.min(newY, canvasRect.height - 150))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onPositionChange(idea.id, position.x, position.y);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, idea.id, onPositionChange, position.x, position.y]);

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${idea.color} ${isDragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="sticky-note-header">
        <h3 className="sticky-note-title">{idea.title}</h3>
        <button
          className="sticky-note-delete"
          onClick={() => onDelete(idea.id)}
          title="Delete idea"
        >
          ×
        </button>
      </div>

      {idea.description && (
        <p className="sticky-note-description">{idea.description}</p>
      )}

      <div className="sticky-note-footer">
        <button className="sticky-note-vote" onClick={() => onVote(idea.id)}>
          <span className="vote-star">★</span>
          <span className="vote-count">{idea.votes}</span>
        </button>
      </div>
    </div>
  );
}

export default StickyNote;
