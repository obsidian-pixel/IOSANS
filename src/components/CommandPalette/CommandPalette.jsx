/**
 * CommandPalette Component
 * Searchable node insertion overlay (Ctrl+K / Cmd+K)
 */
import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { NODE_TYPES, NODE_CATEGORIES } from "../../utils/nodeTypes";
import "./CommandPalette.css";

function CommandPalette({ isOpen, onClose, onSelectNode, insertPosition }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Build flat list of nodes with category info
  const allNodes = useMemo(() => {
    return Object.values(NODE_TYPES).map((node) => ({
      ...node,
      categoryName: NODE_CATEGORIES[node.category]?.name || node.category,
      categoryColor: NODE_CATEGORIES[node.category]?.color || "#666",
    }));
  }, []);

  // Filter nodes by search term (fuzzy match)
  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return allNodes;

    const term = searchTerm.toLowerCase();
    return allNodes.filter(
      (node) =>
        node.name.toLowerCase().includes(term) ||
        node.description?.toLowerCase().includes(term) ||
        node.categoryName.toLowerCase().includes(term)
    );
  }, [allNodes, searchTerm]);

  // Group filtered nodes by category
  const groupedNodes = useMemo(() => {
    const groups = {};
    filteredNodes.forEach((node) => {
      if (!groups[node.category]) {
        groups[node.category] = {
          name: node.categoryName,
          color: node.categoryColor,
          nodes: [],
        };
      }
      groups[node.category].nodes.push(node);
    });
    return groups;
  }, [filteredNodes]);

  // Flatten for keyboard navigation
  const flatList = useMemo(() => {
    const list = [];
    Object.entries(groupedNodes).forEach(([, group]) => {
      group.nodes.forEach((node) => list.push(node));
    });
    return list;
  }, [groupedNodes]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Reset state when reopening
      setSearchTerm("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatList.length > 0) {
      const selectedEl = listRef.current.querySelector(".node-item.selected");
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, flatList.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatList[selectedIndex]) {
            onSelectNode(flatList[selectedIndex].type, insertPosition);
            onClose();
          }
          break;
        case "Escape":
          onClose();
          break;
        default:
          break;
      }
    },
    [flatList, selectedIndex, onSelectNode, insertPosition, onClose]
  );

  const handleNodeClick = useCallback(
    (nodeType) => {
      onSelectNode(nodeType, insertPosition);
      onClose();
    },
    [onSelectNode, insertPosition, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="palette-header">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="palette-search"
            placeholder="Search nodes... (Esc to close)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="shortcut-hint">⌘K</span>
        </div>

        {/* Node list */}
        <div className="palette-content" ref={listRef}>
          {Object.entries(groupedNodes).map(([category, group]) => (
            <div key={category} className="node-category">
              <div
                className="category-header"
                style={{ "--cat-color": group.color }}
              >
                {group.name}
              </div>
              {group.nodes.map((node) => {
                const flatIndex = flatList.findIndex(
                  (n) => n.type === node.type
                );
                return (
                  <div
                    key={node.type}
                    className={`node-item ${
                      flatIndex === selectedIndex ? "selected" : ""
                    }`}
                    onClick={() => handleNodeClick(node.type)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                  >
                    <span className="node-icon">{node.icon}</span>
                    <div className="node-info">
                      <span className="node-name">{node.name}</span>
                      <span className="node-desc">{node.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {flatList.length === 0 && (
            <div className="no-results">No nodes match "{searchTerm}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CommandPalette);
