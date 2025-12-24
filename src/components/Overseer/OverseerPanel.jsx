import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import overseerService from "../../services/OverseerService";
import "./OverseerPanel.css";
import useModelStore from "../../store/modelStore";

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
            <div key={idx} className={`message ${msg.role}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
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
