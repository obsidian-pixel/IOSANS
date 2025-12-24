/**
 * GroupNode Component
 * Collapsible container for grouping related nodes
 */
import { memo, useState, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import "./GroupNode.css";

function GroupNode({ data }) {
  const [isCollapsed, setIsCollapsed] = useState(data.collapsed || false);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Group metadata
  const childCount = data.childNodeIds?.length || 0;
  const groupLabel = data.label || "Node Group";
  const groupColor = data.color || "#6366f1";

  return (
    <div
      className={`group-node ${isCollapsed ? "collapsed" : "expanded"}`}
      style={{
        "--group-color": groupColor,
        minWidth: isCollapsed ? "160px" : data.width || "300px",
        minHeight: isCollapsed ? "60px" : data.height || "200px",
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-0"
        className="group-handle"
      />

      {/* Group header */}
      <div className="group-header" onClick={handleToggleCollapse}>
        <span className="group-icon">{isCollapsed ? "📦" : "📂"}</span>
        <span className="group-label">{groupLabel}</span>
        <span className="group-badge">{childCount} nodes</span>
        <button
          className="collapse-btn"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? "▶" : "▼"}
        </button>
      </div>

      {/* Group body (visible when expanded) */}
      {!isCollapsed && (
        <div className="group-body">
          {childCount > 0 ? (
            <div className="group-content">
              {/* Child nodes would be rendered here by React Flow */}
              <span className="group-hint">
                Drag nodes here to add them to the group
              </span>
            </div>
          ) : (
            <div className="group-empty">
              <span>Empty Group</span>
              <span className="group-hint">Add nodes from context menu</span>
            </div>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {isCollapsed && childCount > 0 && (
        <div className="collapsed-preview">
          Contains {childCount} connected nodes
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-0"
        className="group-handle"
      />
    </div>
  );
}

export default memo(GroupNode);
