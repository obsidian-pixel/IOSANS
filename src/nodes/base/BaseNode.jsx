/**
 * BaseNode Component
 * Common wrapper for custom nodes with 4-Axis Port System:
 * - Left/Right: Circle handles for data flow
 * - Top/Bottom: Diamond handles for resource injection
 * - Action toolbar with run step and config toggle
 */
import { memo, useMemo, useState, useCallback } from "react";
import { Handle, Position, useNodeId } from "@xyflow/react";
import useExecutionStore from "../../store/executionStore";
import useWorkflowStore from "../../store/workflowStore";
import { NODE_TYPES, getNodeColor } from "../../utils/nodeTypes";
import { HANDLE_TYPES, AI_AGENT_SLOTS } from "../../utils/handleTypes";
import { executeStep } from "../../utils/stepExecutor";
import "./BaseNode.css";

// Diamond Handle Component - label above, handle at bottom edge
function DiamondHandle({ id, type, position, label, isConnected, isRequired }) {
  const handleType = HANDLE_TYPES[type] || HANDLE_TYPES.workflow;
  const color = isRequired && !isConnected ? "#ef4444" : handleType.color;

  return (
    <div className="diamond-handle-wrapper">
      {label && (
        <span className="diamond-handle-label" style={{ color }}>
          {label}
        </span>
      )}
      <Handle
        type={position === Position.Top ? "source" : "target"}
        position={position}
        id={id}
        isConnectable={true}
        className={`diamond-handle handle-${type} ${
          isRequired && !isConnected ? "required" : ""
        } ${isConnected ? "connected" : ""}`}
        style={{ "--handle-color": color }}
      />
    </div>
  );
}

function BaseNode({
  type,
  data,
  children,
  inputs = 1,
  outputs = 1,
  outputLabels = [],
  // AI Agent resource slots (diamond handles)
  resourceSlots = null, // Array of { id, type, label, required }
  // Provider output (diamond at top)
  providerOutput = null, // { id, type, label }
}) {
  const nodeId = useNodeId();
  const nodeType = NODE_TYPES[type];
  const color = getNodeColor(type);

  // Step execution state
  const [isStepRunning, setIsStepRunning] = useState(false);
  const [showStepResult, setShowStepResult] = useState(false);

  // Execution state
  const currentNodeId = useExecutionStore((state) => state.currentNodeId);
  const activeSupportingNodeIds = useExecutionStore(
    (state) => state.activeSupportingNodeIds || []
  );
  const isRunning = useExecutionStore((state) => state.isRunning);
  const nodeResults = useExecutionStore((state) => state.nodeResults);

  // Selection and edge state for connection tracking
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const configOpen = useWorkflowStore((state) => state.configOpen);
  const openConfig = useWorkflowStore((state) => state.openConfig);
  const closeConfig = useWorkflowStore((state) => state.closeConfig);
  const edges = useWorkflowStore((state) => state.edges);
  const nodes = useWorkflowStore((state) => state.nodes);

  const isActive = isRunning && currentNodeId === nodeId;
  const isSupportingActive =
    isRunning && activeSupportingNodeIds.includes(nodeId);
  // Supporting nodes get a visually distinct active state
  const effectiveIsActive = isActive || isSupportingActive;

  const isSelected = selectedNodeId === nodeId;
  const hasResult = nodeResults[nodeId] !== undefined;
  const hasError = nodeResults[nodeId]?.error;
  const stepResult = nodeResults[nodeId];

  // Toggle config panel - only this button opens config
  const handleToggleConfig = useCallback(
    (e) => {
      e.stopPropagation();
      if (isSelected && configOpen) {
        closeConfig(); // Close config panel
      } else {
        openConfig(nodeId); // Open config for this node
      }
    },
    [nodeId, isSelected, configOpen, openConfig, closeConfig]
  );

  // Run step handler
  const handleRunStep = useCallback(
    async (e) => {
      e.stopPropagation();
      if (isStepRunning || isRunning) return;

      setIsStepRunning(true);
      setShowStepResult(true);

      try {
        // Get the current node from store
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          await executeStep(node);
        }
      } finally {
        setIsStepRunning(false);
      }
    },
    [nodeId, nodes, isStepRunning, isRunning]
  );

  // Check which slots and handles are connected
  const connectedHandles = useMemo(() => {
    const connected = new Set();
    edges.forEach((edge) => {
      // Outgoing connections (source handles)
      if (edge.source === nodeId && edge.sourceHandle) {
        connected.add(edge.sourceHandle);
      }
      // Incoming connections (target handles)
      if (edge.target === nodeId && edge.targetHandle) {
        connected.add(edge.targetHandle);
      }
    });
    return connected;
  }, [edges, nodeId]);

  // Default AI Agent slots if type is aiAgent
  const slots =
    resourceSlots || (type === "aiAgent" ? AI_AGENT_SLOTS.resourceSlots : null);

  // Format result preview
  const getResultPreview = () => {
    if (!stepResult?.output) return null;
    const output = stepResult.output;
    if (typeof output === "string") {
      return output.slice(0, 80) + (output.length > 80 ? "..." : "");
    }
    const str = JSON.stringify(output, null, 2);
    return str.slice(0, 120) + (str.length > 120 ? "..." : "");
  };

  return (
    <div
      className={`base-node ${isActive ? "active" : ""} ${
        isSupportingActive ? "supporting-active" : ""
      } ${isSelected ? "selected" : ""} ${hasError ? "error" : ""} ${
        slots ? "has-resource-slots" : ""
      } ${isStepRunning ? "step-running" : ""}
      }`}
      style={{ "--node-color": color }}
    >
      {/* Provider output handle (top - diamond) */}
      {providerOutput && (
        <DiamondHandle
          id={providerOutput.id}
          type={providerOutput.type}
          position={Position.Top}
          label={providerOutput.label}
          isConnected={connectedHandles.has(providerOutput.id)}
          isRequired={false}
        />
      )}

      {/* Input handles (left side - circle) */}
      {inputs > 0 &&
        Array.from({ length: inputs }, (_, i) => {
          const handleId = `input-${i}`;
          const isConnected = connectedHandles.has(handleId);
          return (
            <Handle
              key={handleId}
              type="target"
              position={Position.Left}
              id={handleId}
              isConnectable={true}
              className={`node-handle input-handle circle-handle ${
                isConnected ? "connected" : ""
              }`}
              style={
                inputs > 1 ? { top: `${((i + 1) / (inputs + 1)) * 100}%` } : {}
              }
            />
          );
        })}

      {/* Node header */}
      <div className="node-header">
        <span className="node-icon">{nodeType?.icon || "📦"}</span>
        <span className="node-label">
          {data.label || nodeType?.name || type}
        </span>
        {isActive && <span className="running-indicator">⚡</span>}
        {isStepRunning && <span className="running-indicator step">🔬</span>}
        {hasResult && !isActive && !isStepRunning && !hasError && (
          <span className="success-indicator">✓</span>
        )}
        {hasError && (
          <span
            className="error-indicator"
            title="Node failed - click to see error"
          >
            ❌
          </span>
        )}
      </div>

      {/* Node content */}
      <div className="node-body">{children}</div>

      {/* Action Toolbar - appears on hover */}
      <div className="node-action-toolbar">
        <button
          className={`action-btn config-btn ${isSelected ? "active" : ""}`}
          onClick={handleToggleConfig}
          title={isSelected ? "Close config" : "Open config"}
        >
          ⚙️
        </button>
        {!isRunning && (
          <button
            className={`action-btn run-btn ${isStepRunning ? "running" : ""}`}
            onClick={handleRunStep}
            disabled={isStepRunning}
            title="Run this step"
          >
            {isStepRunning ? "⏳" : "▶"}
          </button>
        )}
      </div>

      {/* Step Result Preview */}
      {showStepResult && stepResult && (
        <div
          className={`step-result-preview ${hasError ? "error" : "success"}`}
        >
          <div className="step-result-header">
            <span>{hasError ? "❌ Error" : "✓ Result"}</span>
            <span className="step-time">{stepResult.executionTime}ms</span>
            <button
              className="step-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowStepResult(false);
              }}
            >
              ×
            </button>
          </div>
          <pre className="step-result-body">
            {hasError ? stepResult.error : getResultPreview()}
          </pre>
        </div>
      )}

      {/* Resource slots (bottom - diamond handles) */}
      {slots && slots.length > 0 && (
        <div className="resource-slots-container">
          {slots.map((slot) => (
            <DiamondHandle
              key={slot.id}
              id={slot.id}
              type={slot.type}
              position={Position.Bottom}
              label={slot.label}
              isConnected={connectedHandles.has(slot.id)}
              isRequired={slot.required}
            />
          ))}
        </div>
      )}

      {/* Output handles (right side - circle) */}
      {outputs > 0 &&
        Array.from({ length: outputs }, (_, i) => {
          const handleId = `output-${i}`;
          const isConnected = connectedHandles.has(handleId);
          return (
            <Handle
              key={handleId}
              type="source"
              position={Position.Right}
              id={handleId}
              isConnectable={true}
              className={`node-handle output-handle circle-handle ${
                isConnected ? "connected" : ""
              }`}
              style={
                outputs > 1
                  ? { top: `${((i + 1) / (outputs + 1)) * 100}%` }
                  : {}
              }
            >
              {outputLabels[i] && (
                <span className="handle-label">{outputLabels[i]}</span>
              )}
            </Handle>
          );
        })}
    </div>
  );
}

export default memo(BaseNode);
