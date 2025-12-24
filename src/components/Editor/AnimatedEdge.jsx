/**
 * AnimatedEdge Component
 * Custom edge with flow animation, hover buttons, and Ghost Data tooltip
 */
import { memo, useState, useRef, useMemo, useCallback } from "react";
import { BaseEdge, EdgeLabelRenderer, useNodes } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import useExecutionStore from "../../store/executionStore";
import { getSmartPath } from "../../utils/smartRouting";
import { HANDLE_TYPES } from "../../utils/handleTypes";
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

  // Get nodes WITH measured dimensions from React Flow (not from store)
  const nodes = useNodes();

  // Get execution state for edge status
  const { currentNodeId, edgeSnapshots, isRunning } = useExecutionStore(
    useShallow((state) => ({
      currentNodeId: state.currentNodeId,
      edgeSnapshots: state.edgeSnapshots,
      isRunning: state.isRunning,
    }))
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

  // Derive color from HANDLE_TYPES
  const edgeColor = useMemo(() => {
    const typeDef = HANDLE_TYPES[handleType] || HANDLE_TYPES.workflow;
    return typeDef.color;
  }, [handleType]);

  // Handle mouse enter for hover effects
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

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShowGhostData(false);
    }, 400);
  }, []);

  const handleButtonAreaEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  // Custom Smart Path Routing - Memoized to prevent heavy A* re-calculation on hover
  const [edgePath, labelX, labelY] = useMemo(() => {
    return getSmartPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      nodes,
      excludeNodeIds: [source, target],
    });
  }, [
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    nodes,
    source,
    target,
  ]);

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

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  // Dynamic style for active/AI edges
  const edgeClassName = `animated-edge ${
    isHovered ? "hovered" : ""
  } edge-${handleType} ${lastSnapshot ? "has-data" : ""} ${
    isEdgeActive ? "flowing" : ""
  }`;

  // Merge custom color into style
  const mergedStyle = {
    ...style,
    "--edge-color": edgeColor,
  };

  return (
    <>
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={30}
        stroke="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Main Visible Path - Handles everything including animation */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={mergedStyle}
        className={edgeClassName}
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
