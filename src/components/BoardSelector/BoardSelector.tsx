import { useState, useRef, useEffect } from "react";
import { Board, BoardCreate } from "../../types";
import "./BoardSelector.css";

interface BoardSelectorProps {
  boards: Board[];
  selectedBoardId: number | null;
  onSelectBoard: (boardId: number | null) => void;
  onCreateBoard: (board: BoardCreate) => Promise<void>;
  onDeleteBoard: (boardId: number) => Promise<void>;
}

function BoardSelector({
  boards,
  selectedBoardId,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
}: BoardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
        setNewBoardName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    await onCreateBoard({ name: newBoardName.trim() });
    setNewBoardName("");
    setIsCreating(false);
  };

  const handleDelete = async (e: React.MouseEvent, boardId: number) => {
    e.stopPropagation();
    if (confirm("Delete this board and all its ideas?")) {
      await onDeleteBoard(boardId);
    }
  };

  return (
    <div className="board-selector" ref={dropdownRef}>
      <button
        className="board-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className="board-color-dot"
          style={{ backgroundColor: selectedBoard?.color || "#6b7280" }}
        />
        <span className="board-name">
          {selectedBoard?.name || "All Boards"}
        </span>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="board-dropdown">
          <div
            className={`board-option ${selectedBoardId === null ? "active" : ""}`}
            onClick={() => {
              onSelectBoard(null);
              setIsOpen(false);
            }}
          >
            <span
              className="board-color-dot"
              style={{ backgroundColor: "#6b7280" }}
            />
            <span className="board-option-name">All Boards</span>
            <span className="board-idea-count">
              {boards.reduce((sum, b) => sum + b.idea_count, 0)}
            </span>
          </div>

          <div className="board-divider" />

          {boards.map((board) => (
            <div
              key={board.id}
              className={`board-option ${board.id === selectedBoardId ? "active" : ""}`}
              onClick={() => {
                onSelectBoard(board.id);
                setIsOpen(false);
              }}
            >
              <span
                className="board-color-dot"
                style={{ backgroundColor: board.color }}
              />
              <span className="board-option-name">{board.name}</span>
              <span className="board-idea-count">{board.idea_count}</span>
              <button
                className="board-delete-btn"
                onClick={(e) => handleDelete(e, board.id)}
                title="Delete board"
              >
                ×
              </button>
            </div>
          ))}

          <div className="board-divider" />

          {isCreating ? (
            <form className="board-create-form" onSubmit={handleCreateSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="board-create-input"
                placeholder="Board name..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                maxLength={100}
              />
              <button
                type="submit"
                className="board-create-submit"
                disabled={!newBoardName.trim()}
              >
                Add
              </button>
            </form>
          ) : (
            <button
              className="board-create-btn"
              onClick={() => setIsCreating(true)}
            >
              + New Board
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default BoardSelector;
