import { useEffect, useState } from "react";
import { Idea, IdeaConnection } from "../../types";
import ConnectionLine from "./ConnectionLine";

interface ConnectionsLayerProps {
  connections: IdeaConnection[];
  ideas: Idea[];
  isConnecting: boolean;
  connectingSourceId: number | null;
  canvasWidth: number;
  canvasHeight: number;
  onDeleteConnection: (id: number) => void;
}

function ConnectionsLayer({
  connections,
  ideas,
  isConnecting,
  connectingSourceId,
  canvasWidth,
  canvasHeight,
  onDeleteConnection,
}: ConnectionsLayerProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isConnecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Get the canvas element to calculate relative position
      const canvas = document.querySelector(".canvas-transform-layer");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const transform = window.getComputedStyle(canvas).transform;

      // Parse transform matrix to get scale and translation
      let scale = 1;
      let translateX = 0;
      let translateY = 0;

      if (transform && transform !== "none") {
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
          const values = matrix[1].split(",").map(parseFloat);
          scale = values[0];
          translateX = values[4];
          translateY = values[5];
        }
      }

      // Calculate position in canvas coordinates
      const x = (e.clientX - rect.left - translateX) / scale;
      const y = (e.clientY - rect.top - translateY) / scale;

      setMousePos({ x, y });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [isConnecting]);

  // Find idea by ID
  const findIdea = (id: number) => ideas.find((idea) => idea.id === id);

  // Get source idea for temporary line
  const sourceIdea = connectingSourceId ? findIdea(connectingSourceId) : null;

  return (
    <svg
      className="connections-layer"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: "none", // SVG itself doesn't block clicks
        zIndex: 1,
      }}
    >
      {/* Render all existing connections */}
      {connections.map((connection) => {
        const sourceIdea = findIdea(connection.source_id);
        const targetIdea = findIdea(connection.target_id);

        if (!sourceIdea || !targetIdea) return null;

        return (
          <ConnectionLine
            key={connection.id}
            connection={connection}
            sourceIdea={sourceIdea}
            targetIdea={targetIdea}
            onDelete={onDeleteConnection}
          />
        );
      })}

      {/* Temporary line while connecting */}
      {isConnecting && sourceIdea && (
        <g className="temporary-connection">
          <line
            x1={sourceIdea.position_x + sourceIdea.width / 2}
            y1={sourceIdea.position_y + sourceIdea.height / 2}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.7}
            style={{ pointerEvents: "none" }}
          />
          <circle
            cx={mousePos.x}
            cy={mousePos.y}
            r={6}
            fill="#a78bfa"
            opacity={0.7}
            style={{ pointerEvents: "none" }}
          />
        </g>
      )}
    </svg>
  );
}

export default ConnectionsLayer;
