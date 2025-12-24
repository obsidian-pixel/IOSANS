/**
 * ContextMenu Component
 * Right-click menu for nodes and canvas
 */
import { memo } from "react";
import "./ContextMenu.css";

function ContextMenu({ x, y, type, onClose, onAction }) {
  // Menu items based on context type
  const menuItems =
    type === "node"
      ? [
          {
            id: "duplicate",
            label: "Duplicate",
            icon: "📋",
            shortcut: "Ctrl+D",
          },
          { id: "copy", label: "Copy", icon: "📄", shortcut: "Ctrl+C" },
          { id: "cut", label: "Cut", icon: "✂️", shortcut: "Ctrl+X" },
          { id: "divider1", divider: true },
          {
            id: "delete",
            label: "Delete",
            icon: "🗑️",
            shortcut: "Del",
            danger: true,
          },
        ]
      : type === "insert"
      ? [
          { id: "addTrigger", label: "Add Trigger", icon: "⚡" },
          { id: "addHTTP", label: "Add HTTP Request", icon: "🌐" },
          { id: "addAI", label: "Add AI Agent", icon: "🤖" },
          { id: "codeExecutor", label: "Add Code Executor", icon: "💻" },
          { id: "setVariable", label: "Add Set Variable", icon: "📦" },
          { id: "divider1", divider: true },
          { id: "ifElse", label: "Add If/Else", icon: "🔀" },
          { id: "textToSpeech", label: "Add Text to Speech", icon: "🗣️" },
          { id: "output", label: "Add Output", icon: "📤" },
        ]
      : [
          { id: "addTrigger", label: "Add Trigger", icon: "⚡" },
          { id: "addHTTP", label: "Add HTTP Request", icon: "🌐" },
          { id: "addAI", label: "Add AI Agent", icon: "🤖" },
          { id: "divider1", divider: true },
          { id: "paste", label: "Paste", icon: "📋", shortcut: "Ctrl+V" },
          {
            id: "selectAll",
            label: "Select All",
            icon: "☑️",
            shortcut: "Ctrl+A",
          },
          { id: "divider2", divider: true },
          { id: "fitView", label: "Fit View", icon: "🔲" },
          { id: "zoomIn", label: "Zoom In", icon: "🔍", shortcut: "Ctrl++" },
          { id: "zoomOut", label: "Zoom Out", icon: "🔎", shortcut: "Ctrl+-" },
        ];

  const handleClick = (itemId) => {
    onAction(itemId);
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item) =>
        item.divider ? (
          <div key={item.id} className="context-menu-divider" />
        ) : (
          <button
            key={item.id}
            className={`context-menu-item ${item.danger ? "danger" : ""}`}
            onClick={() => handleClick(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}

export default memo(ContextMenu);
