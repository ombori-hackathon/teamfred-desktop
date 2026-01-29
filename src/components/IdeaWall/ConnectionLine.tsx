import { useState } from "react";
import { Idea, IdeaConnection } from "../../types";

interface ConnectionLineProps {
  connection: IdeaConnection;
  sourceIdea: Idea;
  targetIdea: Idea;
  onDelete: (id: number) => void;
}

function ConnectionLine({
  connection,
  sourceIdea,
  targetIdea,
  onDelete,
}: ConnectionLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate center points of the notes
  const sourceX = sourceIdea.position_x + sourceIdea.width / 2;
  const sourceY = sourceIdea.position_y + sourceIdea.height / 2;
  const targetX = targetIdea.position_x + targetIdea.width / 2;
  const targetY = targetIdea.position_y + targetIdea.height / 2;

  // Calculate control points for bezier curve
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control points offset (for smooth curves)
  const controlOffset = Math.min(distance * 0.3, 100);

  // Determine curve direction based on relative positions
  const control1X = sourceX + (dx > 0 ? controlOffset : -controlOffset);
  const control1Y = sourceY;
  const control2X = targetX - (dx > 0 ? controlOffset : -controlOffset);
  const control2Y = targetY;

  // Create the bezier curve path
  const pathData = `M ${sourceX} ${sourceY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${targetX} ${targetY}`;

  // Calculate label position (midpoint of curve)
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  // Color based on connection type
  const getColor = () => {
    switch (connection.connection_type) {
      case "depends_on":
        return "#60a5fa"; // blue
      case "contradicts":
        return "#f87171"; // red
      case "relates_to":
      default:
        return "#94a3b8"; // gray
    }
  };

  const color = getColor();

  return (
    <g
      className="connection-line"
      style={{ pointerEvents: "auto" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main path */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={isHovered ? 3 : 2}
        strokeLinecap="round"
        strokeDasharray={
          connection.connection_type === "relates_to" ? "5,5" : "none"
        }
        opacity={isHovered ? 1 : 0.6}
        style={{ transition: "all 0.2s" }}
      />

      {/* Invisible wider path for easier hovering */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
      />

      {/* Arrow head */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={color}
            opacity={isHovered ? 1 : 0.6}
          />
        </marker>
      </defs>

      {/* Apply arrow to path */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={isHovered ? 3 : 2}
        strokeLinecap="round"
        strokeDasharray={
          connection.connection_type === "relates_to" ? "5,5" : "none"
        }
        opacity={isHovered ? 1 : 0.6}
        markerEnd={`url(#arrowhead-${connection.id})`}
        style={{ transition: "all 0.2s", pointerEvents: "none" }}
      />

      {/* Label */}
      {connection.label && (
        <g>
          <rect
            x={labelX - 40}
            y={labelY - 12}
            width={80}
            height={24}
            fill="#1e293b"
            stroke={color}
            strokeWidth={1}
            rx={4}
            opacity={0.9}
          />
          <text
            x={labelX}
            y={labelY + 4}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={12}
            fontWeight={500}
            style={{ pointerEvents: "none" }}
          >
            {connection.label}
          </text>
        </g>
      )}

      {/* Delete button on hover */}
      {isHovered && (
        <g
          className="connection-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle
            cx={labelX}
            cy={labelY - 20}
            r={12}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={2}
          />
          <line
            x1={labelX - 5}
            y1={labelY - 25}
            x2={labelX + 5}
            y2={labelY - 15}
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={labelX + 5}
            y1={labelY - 25}
            x2={labelX - 5}
            y2={labelY - 15}
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
}

export default ConnectionLine;
