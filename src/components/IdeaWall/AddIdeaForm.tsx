import { useState } from 'react';
import { IdeaCreate } from '../../types';
import './AddIdeaForm.css';

interface AddIdeaFormProps {
  onSubmit: (idea: IdeaCreate) => void;
  onCancel: () => void;
}

const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'] as const;

function AddIdeaForm({ onSubmit, onCancel }: AddIdeaFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>('yellow');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      position_x: 100 + Math.random() * 400,
      position_y: 100 + Math.random() * 300,
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
                className={`color-option ${c} ${color === c ? 'selected' : ''}`}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
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
