import { useState, useCallback } from "react";
import { Idea } from "../types";

interface NoteAnimationState {
  [ideaId: number]: string; // Animation class name
}

export function useNoteAnimations() {
  const [animatingNotes, setAnimatingNotes] = useState<NoteAnimationState>({});

  // Shuffle - randomize all note positions with animation
  const shuffle = useCallback(
    (
      ideas: Idea[],
      updatePosition: (
        id: number,
        x: number,
        y: number,
        oldX?: number,
        oldY?: number
      ) => void
    ) => {
      // Calculate new positions first
      const newPositions = ideas.map((idea) => ({
        id: idea.id,
        oldX: idea.position_x,
        oldY: idea.position_y,
        newX: 50 + Math.random() * 800,
        newY: 50 + Math.random() * 500,
      }));

      // Update positions immediately for instant visual feedback
      newPositions.forEach(({ id, newX, newY, oldX, oldY }) => {
        updatePosition(id, newX, newY, oldX, oldY);
      });

      // Add bounce animation after positions update
      const bounceState: NoteAnimationState = {};
      ideas.forEach((idea) => {
        bounceState[idea.id] = "bouncing";
      });
      setAnimatingNotes(bounceState);

      // Clear animation state
      setTimeout(() => {
        setAnimatingNotes({});
      }, 300);
    },
    []
  );

  // Shake - make selected notes shake (attention animation)
  const shake = useCallback((selectedIds: number[]) => {
    const shakeState: NoteAnimationState = {};
    selectedIds.forEach((id) => {
      shakeState[id] = "shaking";
    });
    setAnimatingNotes(shakeState);

    // Clear animation after it completes
    setTimeout(() => {
      setAnimatingNotes({});
    }, 300);
  }, []);

  // Bounce - single note bounce animation (for votes)
  const bounce = useCallback((ideaId: number) => {
    setAnimatingNotes((prev) => ({
      ...prev,
      [ideaId]: "bouncing",
    }));

    // Clear animation after it completes
    setTimeout(() => {
      setAnimatingNotes((prev) => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
    }, 300);
  }, []);

  // Get animation class for a specific note
  const getAnimationClass = useCallback(
    (ideaId: number): string => {
      return animatingNotes[ideaId] || "";
    },
    [animatingNotes]
  );

  return { shuffle, shake, bounce, getAnimationClass };
}
