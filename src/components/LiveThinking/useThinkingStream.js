import { useState } from "react";

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
