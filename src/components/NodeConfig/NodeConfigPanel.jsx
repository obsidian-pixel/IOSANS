/**
 * NodeConfigPanel Component
 * Panel for editing the configuration of the selected node
 * Draggable by header
 */
import { memo, useCallback, useState, useRef, useEffect } from "react";
import useWorkflowStore from "../../store/workflowStore";
import { NODE_TYPES, getNodeColor } from "../../utils/nodeTypes";

// Node-specific config components
import HTTPRequestConfig from "./configs/HTTPRequestConfig";
import CodeExecutorConfig from "./configs/CodeExecutorConfig";
import SetVariableConfig from "./configs/SetVariableConfig";
import IfElseConfig from "./configs/IfElseConfig";
import LoopConfig from "./configs/LoopConfig";
import SwitchConfig from "./configs/SwitchConfig";
import ScheduleTriggerConfig from "./configs/ScheduleTriggerConfig";
import AIAgentConfig from "./configs/AIAgentConfig";
import ManualTriggerConfig from "./configs/ManualTriggerConfig";
import TextToSpeechConfig from "./configs/TextToSpeechConfig";
import PythonExecutorConfig from "./configs/PythonExecutorConfig";
import VectorMemoryConfig from "./configs/VectorMemoryConfig";
import FileSystemConfig from "./configs/FileSystemConfig";
import LocalStorageConfig from "./configs/LocalStorageConfig";
import OutputConfig from "./configs/OutputConfig";
import ChatModelConfig from "./configs/ChatModelConfig";

import "./NodeConfigPanel.css";

// Map node types to their config components
const configComponents = {
  httpRequest: HTTPRequestConfig,
  codeExecutor: CodeExecutorConfig,
  setVariable: SetVariableConfig,
  ifElse: IfElseConfig,
  loop: LoopConfig,
  switchNode: SwitchConfig,
  scheduleTrigger: ScheduleTriggerConfig,
  aiAgent: AIAgentConfig,
  manualTrigger: ManualTriggerConfig,
  textToSpeech: TextToSpeechConfig,
  pythonExecutor: PythonExecutorConfig,
  vectorMemory: VectorMemoryConfig,
  fileSystem: FileSystemConfig,
  localStorage: LocalStorageConfig,
  output: OutputConfig,
  chatModel: ChatModelConfig,
};

function NodeConfigPanel() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const configOpen = useWorkflowStore((state) => state.configOpen);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const closeConfig = useWorkflowStore((state) => state.closeConfig);

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const panelRef = useRef(null);

  // Resize state
  const [panelWidth, setPanelWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startWidth: 380 });

  // Position resets automatically when selectedNodeId changes due to component unmounting
  // (since we return null when no node is selected)

  // Handle drag start
  const handleMouseDown = useCallback(
    (e) => {
      // Only drag from header area, not from inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") {
        return;
      }

      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
      };

      e.preventDefault();
    },
    [position]
  );

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      setPosition({
        x: dragRef.current.startPosX + deltaX,
        y: dragRef.current.startPosY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Handle resize
  const handleResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = {
        startX: e.clientX,
        startWidth: panelWidth,
      };
    },
    [panelWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = resizeRef.current.startX - e.clientX;
      const newWidth = Math.max(
        280,
        Math.min(800, resizeRef.current.startWidth + deltaX)
      );
      setPanelWidth(newWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  // Find selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Handle data updates
  const handleUpdate = useCallback(
    (updates) => {
      if (selectedNodeId) {
        updateNode(selectedNodeId, updates);
      }
    },
    [selectedNodeId, updateNode]
  );

  // Handle node deletion
  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      setSelectedNode(null);
      closeConfig();
    }
  }, [selectedNodeId, deleteNode, setSelectedNode, closeConfig]);

  // Handle close - only close config panel, don't deselect node
  const handleClose = useCallback(() => {
    closeConfig();
  }, [closeConfig]);

  // Only show panel if configOpen is true AND a node is selected
  if (!configOpen || !selectedNode) {
    return null;
  }

  const nodeType = NODE_TYPES[selectedNode.type];
  const ConfigComponent = configComponents[selectedNode.type];
  const nodeColor = getNodeColor(selectedNode.type);

  return (
    <div
      ref={panelRef}
      className={`node-config-panel ${isDragging ? "dragging" : ""} ${
        isResizing ? "resizing" : ""
      }`}
      style={{
        "--node-color": nodeColor,
        width: `${panelWidth}px`,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
      <header className="config-header draggable" onMouseDown={handleMouseDown}>
        <div className="drag-handle" title="Drag to move">
          ⋮⋮
        </div>
        <div className="config-title">
          <span className="node-icon">{nodeType?.icon || "📦"}</span>
          <input
            type="text"
            className="node-label-input"
            value={selectedNode.data.label || ""}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            placeholder={nodeType?.name || "Node"}
          />
        </div>
        <div className="config-actions">
          <button
            type="button"
            className="btn-icon btn-delete"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDelete();
            }}
            title="Delete node"
          >
            🗑️
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="config-body">
        {ConfigComponent ? (
          <ConfigComponent
            data={selectedNode.data}
            onUpdate={handleUpdate}
            nodeId={selectedNode.id}
          />
        ) : (
          <div className="config-empty">
            <p>No configuration available for this node type.</p>
          </div>
        )}
      </div>

      <footer className="config-footer">
        <span className="node-type-label">
          {nodeType?.name || selectedNode.type}
        </span>
        <span className="node-id">{selectedNode.id.slice(0, 12)}...</span>
      </footer>
    </div>
  );
}

export default memo(NodeConfigPanel);
