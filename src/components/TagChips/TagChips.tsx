import { Tag } from "../../types";
import "./TagChips.css";

interface TagChipsProps {
  tags: Tag[];
  onRemove?: (tagId: number) => void;
  size?: "small" | "normal";
}

function TagChips({ tags, onRemove, size = "normal" }: TagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <div className={`tag-chips ${size}`}>
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="tag-chip"
          style={{ backgroundColor: tag.color + "33", borderColor: tag.color }}
        >
          <span className="tag-chip-name">{tag.name}</span>
          {onRemove && (
            <button
              className="tag-chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.id);
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export default TagChips;
