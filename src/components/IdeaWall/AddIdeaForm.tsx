import { useState, useEffect, useRef, useCallback } from "react";
import { IdeaCreate, Tag, AITagSuggestions } from "../../types";
import "./AddIdeaForm.css";

const BASE_URL = "http://localhost:8001";

interface AddIdeaFormProps {
  onSubmit: (idea: IdeaCreate) => void;
  onCancel: () => void;
  tags: Tag[];
  prefillTitle?: string;
}

const COLORS = ["yellow", "pink", "blue", "green", "purple"] as const;

function AddIdeaForm({
  onSubmit,
  onCancel,
  tags,
  prefillTitle,
}: AddIdeaFormProps) {
  const [title, setTitle] = useState(prefillTitle || "");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>("yellow");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTagSuggestions = useCallback(async (t: string, d: string) => {
    if (!t.trim()) {
      setSuggestedTags([]);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(`${BASE_URL}/ai/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, description: d || null }),
      });
      if (res.ok) {
        const data: AITagSuggestions = await res.json();
        setSuggestedTags(data.suggested_tags);
      }
    } catch (err) {
      console.error("Failed to get tag suggestions:", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchTagSuggestions(title, description);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [title, description, fetchTagSuggestions]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      position_x: 100 + Math.random() * 400,
      position_y: 100 + Math.random() * 300,
      tag_ids: selectedTagIds,
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <form
        className="add-idea-form"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>Add New Idea</h2>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your idea?"
            maxLength={100}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details..."
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label>Color</label>
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-option ${c} ${color === c ? "selected" : ""}`}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tag-selector">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`tag-option ${selectedTagIds.includes(tag.id) ? "selected" : ""}`}
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id)
                    ? tag.color + "33"
                    : "transparent",
                  borderColor: tag.color,
                }}
                onClick={() => toggleTag(tag.id)}
              >
                <span
                  className="tag-dot"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>
          {suggestedTags.length > 0 && (
            <div className="ai-tag-suggestions">
              <span className="suggestion-label">
                {isLoadingSuggestions ? "Thinking..." : "AI suggests:"}
              </span>
              {!isLoadingSuggestions &&
                suggestedTags.map((name, i) => {
                  const existingTag = tags.find(
                    (t) => t.name.toLowerCase() === name.toLowerCase()
                  );
                  return (
                    <span
                      key={i}
                      className={`suggestion-tag ${existingTag && selectedTagIds.includes(existingTag.id) ? "active" : ""}`}
                      onClick={() => {
                        if (existingTag) {
                          toggleTag(existingTag.id);
                        }
                      }}
                    >
                      {name}
                      {existingTag ? "" : " (new)"}
                    </span>
                  );
                })}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-submit"
            disabled={!title.trim()}
          >
            Add Idea
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddIdeaForm;
