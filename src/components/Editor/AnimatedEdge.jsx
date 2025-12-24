/**
 * AnimatedEdge Component
 * Custom edge with flow animation, hover buttons, and Ghost Data tooltip
 */
import { memo, useState, useRef, useMemo, useCallback } from "react";
import { BaseEdge, EdgeLabelRenderer } from "@xyflow/react";
import useWorkflowStore from "../../store/workflowStore";
import useExecutionStore from "../../store/executionStore";
import { getSmartPath } from "../../utils/smartRouting";
import "./AnimatedEdge.css";

function AnimatedEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  targetHandleId,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showGhostData, setShowGhostData] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Get nodes for collision detection
  const nodes = useWorkflowStore((state) => state.nodes);

  // Get execution state for edge status
  const { currentNodeId, edgeSnapshots, isRunning } = useExecutionStore(
    (state) => ({
      currentNodeId: state.currentNodeId,
      edgeSnapshots: state.edgeSnapshots,
      isRunning: state.isRunning,
    })
  );

  // Check if source node is currently running (data is flowing)
  const isEdgeActive = isRunning && currentNodeId === source;

  const lastSnapshot =
    edgeSnapshots[id]?.[edgeSnapshots[id]?.length - 1] || null;

  // Detect AI handle type from handle IDs
  const handleType = useMemo(() => {
    const handleId = targetHandleId || sourceHandleId || "";
    if (handleId.includes("model")) return "model";
    if (handleId.includes("memory")) return "memory";
    if (handleId.includes("tool")) return "tool";
    return "workflow";
  }, [sourceHandleId, targetHandleId]);

  // Get edge style based on handle type
  const edgeStyle = useMemo(() => {
    const baseStyle = { ...style };

    switch (handleType) {
      case "model":
        return {
          ...baseStyle,
          stroke: "#6366f1",
          strokeDasharray: "5,5",
        };
      case "memory":
        return {
          ...baseStyle,
          stroke: "#10b981",
          strokeDasharray: "5,5",
        };
      case "tool":
        return {
          ...baseStyle,
          stroke: "#f59e0b",
          strokeDasharray: "5,5",
        };
      default:
        return baseStyle;
    }
  }, [handleType, style]);

  // Handle mouse enter on edge
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
    if (lastSnapshot) {
      setShowGhostData(true);
    }
  }, [lastSnapshot]);

  // Handle mouse leave on edge
  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShowGhostData(false);
    }, 400); // 400ms delay for moving to buttons
  }, []);

  // Keep hover when on buttons
  const handleButtonAreaEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  // Custom Smart Path Routing
  const [edgePath, labelX, labelY] = getSmartPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    nodes,
    excludeNodeIds: [source, target],
    gap: 50,
  });

  // Handle button clicks
  const onDeleteEdge = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      window.dispatchEvent(
        new CustomEvent("deleteEdge", { detail: { edgeId: id } })
      );
    },
    [id]
  );

  const onAddNode = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      window.dispatchEvent(
        new CustomEvent("addNodeOnEdge", {
          detail: {
            edgeId: id,
            position: { x: labelX, y: labelY },
          },
        })
      );
    },
    [id, labelX, labelY]
  );

  // Format timestamp for display
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  return (
    <>
      {/* Invisible wider path for hover detection - this is crucial */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={30}
        stroke="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Animated edge path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...edgeStyle,
          strokeWidth: isHovered ? 3 : isEdgeActive ? 2.5 : 2,
        }}
        className={`animated-edge ${
          isHovered ? "hovered" : ""
        } edge-${handleType} ${lastSnapshot ? "has-data" : ""} ${
          isEdgeActive ? "edge-active" : ""
        }`}
      />

      {/* Flow animation overlay */}
      <path
        className={`edge-flow-animation ${isEdgeActive ? "flowing" : ""}`}
        d={edgePath}
        fill="none"
        strokeWidth={2}
        style={{ pointerEvents: "none" }}
      />

      {/* Hover UI - Action Buttons */}
      <EdgeLabelRenderer>
        <div
          className={`edge-action-container ${isHovered ? "visible" : ""}`}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: isHovered ? "all" : "none",
          }}
          onMouseEnter={handleButtonAreaEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="edge-action-buttons">
            <button
              className="edge-btn edge-btn-add"
              onClick={onAddNode}
              title="Insert node here"
            >
              +
            </button>
            <button
              className="edge-btn edge-btn-delete"
              onClick={onDeleteEdge}
              title="Delete connection"
            >
              ×
            </button>
          </div>
        </div>

        {/* Ghost Data Tooltip */}
        {showGhostData && lastSnapshot && (
          <div
            className="ghost-data-tooltip"
            style={{
              position: "absolute",
              transform: `translate(-50%, -120%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
          >
            <div className="ghost-header">
              <span className="ghost-icon">👻</span>
              <span className="ghost-title">Last Data</span>
              <span className="ghost-time">
                {formatTime(lastSnapshot.timestamp)}
              </span>
            </div>
            <pre className="ghost-preview">
              {lastSnapshot.preview}
              {lastSnapshot.preview?.length >= 500 && "..."}
            </pre>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(AnimatedEdge);
