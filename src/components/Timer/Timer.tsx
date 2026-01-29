import { useState, useEffect, useRef, useCallback } from "react";
import { playAlarm } from "../../utils/sounds";
import "./Timer.css";

interface TimerProps {
  onClose: () => void;
}

type PresetValue = 5 | 10 | 15 | null;

const Timer = ({ onClose }: TimerProps) => {
  const [duration, setDuration] = useState<number>(300); // 5 minutes default
  const [remaining, setRemaining] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue>(5);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const intervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("timer-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setDuration(state.duration);
        setRemaining(state.remaining);
        setIsRunning(false); // Don't auto-start
        setIsMinimized(state.isMinimized || false);
        setPosition(state.position || null);
      } catch (e) {
        console.error("Failed to load timer state:", e);
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    const state = {
      duration,
      remaining,
      isMinimized,
      position,
    };
    localStorage.setItem("timer-state", JSON.stringify(state));
  }, [duration, remaining, isMinimized, position]);

  // Countdown interval
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            playAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remaining]);

  // Reset complete state when time changes
  useEffect(() => {
    if (remaining > 0) {
      setIsComplete(false);
    }
  }, [remaining]);

  const handlePresetClick = (minutes: number) => {
    const seconds = minutes * 60;
    setDuration(seconds);
    setRemaining(seconds);
    setSelectedPreset(minutes as PresetValue);
    setCustomMinutes("");
    setIsRunning(false);
    setIsComplete(false);
  };

  const handleCustomChange = (value: string) => {
    setCustomMinutes(value);
    setSelectedPreset(null);
    const minutes = parseInt(value, 10);
    if (!isNaN(minutes) && minutes > 0) {
      const seconds = minutes * 60;
      setDuration(seconds);
      setRemaining(seconds);
      setIsRunning(false);
      setIsComplete(false);
    }
  };

  const handleStart = () => {
    if (remaining > 0) {
      setIsRunning(true);
      setIsComplete(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemaining(duration);
    setIsComplete(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // SVG circle calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = duration > 0 ? remaining / duration : 1;
  const strokeDashoffset = circumference * (1 - progress);

  // Drag handlers for minimized state
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isMinimized || !containerRef.current) return;

      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [isMinimized]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !isMinimized) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      setPosition({ x: newX, y: newY });
    },
    [isDragging, isMinimized, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const containerStyle =
    position && isMinimized
      ? { top: `${position.y}px`, right: "auto", left: `${position.x}px` }
      : {};

  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className={`timer-container minimized ${isComplete ? "complete" : ""}`}
        style={containerStyle}
        onMouseDown={handleMouseDown}
      >
        <div className="timer-minimized">
          <span
            className={`timer-minimized-time ${isComplete ? "complete" : ""}`}
          >
            {formatTime(remaining)}
          </span>
          <button
            className="timer-minimized-restore"
            onClick={handleRestore}
            title="Restore timer"
          >
            ⬜
          </button>
          <button
            className="timer-header-button"
            onClick={onClose}
            title="Close timer"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="timer-container" style={containerStyle}>
      <div className="timer-header">
        <h2 className="timer-title">Timer</h2>
        <div className="timer-header-buttons">
          <button
            className="timer-header-button"
            onClick={handleMinimize}
            title="Minimize"
          >
            ─
          </button>
          <button
            className="timer-header-button"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="timer-presets">
        <button
          className={`timer-preset-btn ${selectedPreset === 5 ? "active" : ""}`}
          onClick={() => handlePresetClick(5)}
          disabled={isRunning}
        >
          5 min
        </button>
        <button
          className={`timer-preset-btn ${selectedPreset === 10 ? "active" : ""}`}
          onClick={() => handlePresetClick(10)}
          disabled={isRunning}
        >
          10 min
        </button>
        <button
          className={`timer-preset-btn ${selectedPreset === 15 ? "active" : ""}`}
          onClick={() => handlePresetClick(15)}
          disabled={isRunning}
        >
          15 min
        </button>
      </div>

      <div className="timer-custom">
        <input
          type="number"
          className="timer-custom-input"
          placeholder="Custom (minutes)"
          value={customMinutes}
          onChange={(e) => handleCustomChange(e.target.value)}
          disabled={isRunning}
          min="1"
        />
      </div>

      <div className={`timer-ring-container ${isComplete ? "complete" : ""}`}>
        <svg className="timer-ring" width="200" height="200">
          <circle className="timer-ring-bg" cx="100" cy="100" r={radius} />
          <circle
            className="timer-ring-progress"
            cx="100"
            cy="100"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="timer-display">{formatTime(remaining)}</div>
      </div>

      <div className="timer-controls">
        {!isRunning ? (
          <button
            className="timer-control-btn start"
            onClick={handleStart}
            disabled={remaining === 0}
          >
            Start
          </button>
        ) : (
          <button className="timer-control-btn pause" onClick={handlePause}>
            Pause
          </button>
        )}
        <button
          className="timer-control-btn reset"
          onClick={handleReset}
          disabled={remaining === duration && !isComplete}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Timer;
