/**
 * SwitchNode Component
 * Dynamic output handles based on configured routes
 * Uses updateNodeInternals for reactive port generation
 */
import { memo, useEffect, useMemo } from "react";
import {
  Handle,
  Position,
  useNodeId,
  useUpdateNodeInternals,
} from "@xyflow/react";
import useExecutionStore from "../../store/executionStore";
import useWorkflowStore from "../../store/workflowStore";
import { getNodeColor } from "../../utils/nodeTypes";
import "./SwitchNode.css";

function SwitchNode({ data }) {
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();
  const color = getNodeColor("switchNode");

  // Execution state
  const currentNodeId = useExecutionStore((state) => state.currentNodeId);
  const isRunning = useExecutionStore((state) => state.isRunning);
  const nodeResults = useExecutionStore((state) => state.nodeResults);

  // Selection state
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);

  const isActive = isRunning && currentNodeId === nodeId;
  const isSelected = selectedNodeId === nodeId;
  const hasResult = nodeResults[nodeId] !== undefined;
  const hasError = nodeResults[nodeId]?.error;

  // Routes from configuration (memoized to prevent dependency issues)
  const routes = useMemo(() => data.routes || [], [data.routes]);
  const field = data.field || "value";

  // Dynamic outputs: one per route + default
  const dynamicOutputs = useMemo(() => {
    const outputs = routes.map((route, index) => ({
      id: `output-${index}`,
      label: String(route.value || route.label || index),
      index,
    }));
    // Always add default output
    outputs.push({
      id: `output-default`,
      label: "default",
      index: outputs.length,
    });
    return outputs;
  }, [routes]);

  // Update node internals when routes change
  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [nodeId, routes.length, updateNodeInternals]);

  return (
    <div
      className={`switch-node ${isActive ? "active" : ""} ${
        isSelected ? "selected" : ""
      } ${hasError ? "error" : ""}`}
      style={{ "--node-color": color }}
    >
      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-0"
        className="node-handle circle-handle"
      />

      {/* Header */}
      <div className="node-header">
        <span className="node-icon">🔃</span>
        <span className="node-label">{data.label || "Switch"}</span>
        {isActive && <span className="running-indicator">⚡</span>}
        {hasResult && !isActive && !hasError && (
          <span className="success-indicator">✓</span>
        )}
      </div>

      {/* Body with field info */}
      <div className="node-body">
        <div className="switch-field">
          <span className="field-label">Switch on:</span>
          <span className="field-value">{field}</span>
        </div>

        {/* Dynamic route labels */}
        <div className="switch-routes">
          {dynamicOutputs.map((output) => (
            <div key={output.id} className="route-label-row">
              <span className="route-value">{output.label}</span>
              <span className="route-arrow">→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic output handles (right) */}
      {dynamicOutputs.map((output, i) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          className={`node-handle circle-handle ${
            output.id === "output-default" ? "default-handle" : ""
          }`}
          style={{
            top: `${((i + 1) / (dynamicOutputs.length + 1)) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(SwitchNode);
