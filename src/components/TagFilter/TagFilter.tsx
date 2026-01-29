import { useState, useRef, useEffect } from "react";
import { Tag, TagCreate } from "../../types";
import "./TagFilter.css";

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: number[];
  onToggleTag: (tagId: number) => void;
  onCreateTag: (tag: TagCreate) => Promise<void>;
  onDeleteTag: (tagId: number) => Promise<void>;
}

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
];

function TagFilter({
  tags,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  onDeleteTag,
}: TagFilterProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    await onCreateTag({
      name: newTagName.trim().toLowerCase(),
      color: newTagColor,
    });
    setNewTagName("");
    setIsCreating(false);
  };

  const handleDelete = async (e: React.MouseEvent, tagId: number) => {
    e.stopPropagation();
    if (confirm("Delete this tag?")) {
      await onDeleteTag(tagId);
    }
  };

  return (
    <div className="tag-filter">
      <span className="tag-filter-label">Tags:</span>

      <div className="tag-filter-list">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`tag-filter-btn ${selectedTagIds.includes(tag.id) ? "active" : ""}`}
            style={{
              backgroundColor: selectedTagIds.includes(tag.id)
                ? tag.color + "33"
                : "transparent",
              borderColor: tag.color,
            }}
            onClick={() => onToggleTag(tag.id)}
          >
            <span
              className="tag-filter-dot"
              style={{ backgroundColor: tag.color }}
            />
            <span className="tag-filter-name">{tag.name}</span>
            <button
              className="tag-filter-delete"
              onClick={(e) => handleDelete(e, tag.id)}
            >
              ×
            </button>
          </div>
        ))}

        {isCreating ? (
          <form className="tag-create-form" onSubmit={handleCreateSubmit}>
            <div className="tag-color-picker">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`tag-color-option ${newTagColor === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
            <input
              ref={inputRef}
              type="text"
              className="tag-create-input"
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              maxLength={50}
            />
            <button
              type="submit"
              className="tag-create-submit"
              disabled={!newTagName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className="tag-create-cancel"
              onClick={() => {
                setIsCreating(false);
                setNewTagName("");
              }}
            >
              ×
            </button>
          </form>
        ) : (
          <button className="tag-add-btn" onClick={() => setIsCreating(true)}>
            + Add Tag
          </button>
        )}
      </div>

      {selectedTagIds.length > 0 && (
        <button
          className="tag-clear-btn"
          onClick={() => selectedTagIds.forEach(onToggleTag)}
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default TagFilter;
