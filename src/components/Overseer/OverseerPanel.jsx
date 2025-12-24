import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import overseerService from "../../services/OverseerService";
import "./OverseerPanel.css";
import useModelStore from "../../store/modelStore";

/**
 * ActionCard Component - Renders action blocks with Preview/Apply buttons
 */
function ActionCard({ actions, isFixAction }) {
  const [isApplied, setIsApplied] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handlePreview = () => {
    setIsPreviewing(!isPreviewing);
    // TODO: Implement ghost node preview on canvas
    console.log("Preview actions:", actions);
  };

  const handleApply = () => {
    if (isApplied) return;
    overseerService.executeActions(actions);
    setIsApplied(true);
    setIsPreviewing(false);
  };

  const actionSummary = useMemo(() => {
    const nodeAdds = actions.filter((a) => a.type === "addNode").length;
    const edgeAdds = actions.filter((a) => a.type === "addEdge").length;
    const updates = actions.filter((a) => a.type === "updateNode").length;
    const parts = [];
    if (nodeAdds) parts.push(`${nodeAdds} node${nodeAdds > 1 ? "s" : ""}`);
    if (edgeAdds)
      parts.push(`${edgeAdds} connection${edgeAdds > 1 ? "s" : ""}`);
    if (updates) parts.push(`${updates} update${updates > 1 ? "s" : ""}`);
    return parts.join(", ") || "Actions";
  }, [actions]);

  return (
    <div className={`action-card ${isFixAction ? "fix-card" : ""}`}>
      <div className="action-card-header">
        <span className="action-card-icon">{isFixAction ? "🔧" : "🛠️"}</span>
        <span className="action-card-title">
          {isFixAction ? "Quick Fix" : "Workflow Recipe"}
        </span>
        <span className="action-card-summary">{actionSummary}</span>
      </div>

      <div className="action-card-actions">
        {!isFixAction && (
          <button
            className={`btn-preview ${isPreviewing ? "active" : ""}`}
            onClick={handlePreview}
            disabled={isApplied}
          >
            {isPreviewing ? "👁️ Hide Preview" : "👁️ Preview"}
          </button>
        )}
        <button
          className={`btn-apply ${isApplied ? "applied" : ""}`}
          onClick={handleApply}
          disabled={isApplied}
        >
          {isApplied ? "✓ Applied" : isFixAction ? "🔧 Apply Fix" : "✨ Apply"}
        </button>
      </div>
    </div>
  );
}

/**
 * Parse message content and extract action blocks
 */
function parseMessageContent(content) {
  const parts = [];
  let lastIndex = 0;

  // Match JSON code blocks
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    // Try to parse as action JSON
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.actions && Array.isArray(parsed.actions)) {
        const isFixAction = parsed.actions.some((a) => a.__fixAction);
        parts.push({
          type: "actions",
          actions: parsed.actions,
          isFixAction,
        });
      } else {
        // Not an action block, show as code
        parts.push({ type: "code", content: match[0] });
      }
    } catch {
      // Invalid JSON, show as code
      parts.push({ type: "code", content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
}

/**
 * MessageContent Component - Renders message with action cards
 */
function MessageContent({ content }) {
  const parts = useMemo(() => parseMessageContent(content), [content]);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.type === "actions") {
          return (
            <ActionCard
              key={idx}
              actions={part.actions}
              isFixAction={part.isFixAction}
            />
          );
        }
        return <ReactMarkdown key={idx}>{part.content}</ReactMarkdown>;
      })}
    </>
  );
}

export default function OverseerPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const messagesEndRef = useRef(null);

  // Drag state
  const [position, setPosition] = useState(() => ({
    x: window.innerWidth / 2 - 250,
    y: window.innerHeight - 680,
  }));
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });

  // Use model ready state to warn if no model
  const isReady = useModelStore((state) => state.isReady);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Drag handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current.active) return;
      setPosition({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      });
    };
    const handleMouseUp = () => {
      dragRef.current.active = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Sync with Service
  const syncState = useCallback(() => {
    setSessions(overseerService.getSessions());
    const active = overseerService.getActiveSession();
    if (active) {
      setMessages([...active.messages]);
      setActiveSessionId(active.id);
    } else {
      setMessages([]);
      setActiveSessionId(null);
    }
  }, []);

  // Initial Load & Subscription
  useEffect(() => {
    syncState();
    const unsubscribe = overseerService.subscribe(syncState);
    return () => unsubscribe();
  }, [syncState]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleHeaderMouseDown = (e) => {
    dragRef.current = {
      active: true,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      if (!isReady) {
        throw new Error("Please load a model from the Model Manager first.");
      }
      await overseerService.chat(userMsg);
    } catch (error) {
      // Force error message into view if service didn't capture it in session
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = (e) => {
    e.stopPropagation();
    overseerService.createSession();
    setShowHistory(false);
  };

  const handleSwitchSession = (id) => {
    overseerService.switchSession(id);
    setShowHistory(false);
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      overseerService.deleteSession(id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Keep mounted to preserve history, just hide with CSS
  return (
    <div
      className={`overseer-panel ${!isOpen ? "closed" : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      <header className="overseer-header" onMouseDown={handleHeaderMouseDown}>
        <div className="overseer-title">
          <span className="overseer-icon">👁️</span>
          <span className="title-text">Overseer</span>
        </div>

        <div className="header-controls">
          <button
            className="btn-icon"
            onClick={handleNewChat}
            title="New Chat"
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
          <button
            className={`btn-icon ${showHistory ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(!showHistory);
            }}
            title="History"
            onMouseDown={(e) => e.stopPropagation()}
          >
            🕒
          </button>
          <button
            className="btn-close-float"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            ✕
          </button>
        </div>
      </header>

      <div className="overseer-content-wrapper">
        {/* History Sidebar */}
        <div className={`history-sidebar ${showHistory ? "visible" : ""}`}>
          <div className="history-header">Chat History</div>
          <div className="history-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`history-item ${
                  activeSessionId === session.id ? "active" : ""
                }`}
                onClick={() => handleSwitchSession(session.id)}
              >
                <div className="history-info">
                  <span className="history-title">
                    {session.title || "Untitled"}
                  </span>
                  <span className="history-date">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="btn-delete-session"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="history-empty">No history</div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="overseer-messages">
          {messages.length === 0 && !isLoading && (
            <div className="welcome-message">
              <h3>I am the Overseer.</h3>
              <p>How can I help you build your workflow?</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.role} ${
                msg.isErrorAnalysis ? "error-analysis" : ""
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          ))}
          {isLoading && (
            <div className="typing-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="overseer-input-area">
        <textarea
          className="overseer-input"
          placeholder={
            isReady
              ? "Describe a workflow to build..."
              : "Load a model first..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
