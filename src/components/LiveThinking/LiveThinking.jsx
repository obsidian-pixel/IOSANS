/**
 * LiveThinking Component
 * Real-time visualization of AI reasoning process (CoT streaming)
 */
import { memo, useState } from "react";
import "./LiveThinking.css";

function LiveThinking({ isOpen, onClose, thinkingStream = [] }) {
  const [expandedSteps, setExpandedSteps] = useState(new Set());

  const toggleStep = (index) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="live-thinking-overlay" onClick={onClose}>
      <div className="live-thinking" onClick={(e) => e.stopPropagation()}>
        <header className="lt-header">
          <h2>🧠 Live Thinking</h2>
          <div className="lt-status">
            {thinkingStream.length > 0 && (
              <span className="thinking-indicator">
                <span className="thinking-dot" />
                Processing...
              </span>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="lt-content">
          {thinkingStream.length === 0 ? (
            <div className="lt-empty">
              <span className="lt-empty-icon">💭</span>
              <p>No active reasoning</p>
              <p className="hint">Run an AI node to see live thinking</p>
            </div>
          ) : (
            <div className="thinking-steps">
              {thinkingStream.map((step, index) => (
                <div
                  key={index}
                  className={`thinking-step ${step.type || "thought"} ${
                    expandedSteps.has(index) ? "expanded" : ""
                  }`}
                  onClick={() => toggleStep(index)}
                >
                  <div className="step-header">
                    <span className="step-icon">
                      {step.type === "thought"
                        ? "💭"
                        : step.type === "action"
                        ? "⚡"
                        : step.type === "observation"
                        ? "👁️"
                        : step.type === "conclusion"
                        ? "✅"
                        : "•"}
                    </span>
                    <span className="step-number">Step {index + 1}</span>
                    <span className="step-type">{step.type || "thought"}</span>
                  </div>
                  <div className="step-content">{step.content}</div>
                  {step.details && expandedSteps.has(index) && (
                    <div className="step-details">
                      <pre>{JSON.stringify(step.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="lt-footer">
          <span className="step-count">
            {thinkingStream.length} reasoning step(s)
          </span>
        </footer>
      </div>
    </div>
  );
}

// Hook for tracking thinking in real-time
export function useThinkingStream() {
  const [stream, setStream] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const addThought = (content, type = "thought", details = null) => {
    setStream((prev) => [
      ...prev,
      { content, type, details, timestamp: Date.now() },
    ]);
  };

  const startThinking = () => {
    setIsThinking(true);
    setStream([]);
  };

  const endThinking = () => {
    setIsThinking(false);
  };

  const clearThinking = () => {
    setStream([]);
    setIsThinking(false);
  };

  return {
    stream,
    isThinking,
    addThought,
    startThinking,
    endThinking,
    clearThinking,
  };
}

export default memo(LiveThinking);
