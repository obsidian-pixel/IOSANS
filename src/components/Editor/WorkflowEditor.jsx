/**
 * WorkflowEditor Component
 * Main workflow canvas using React Flow with context menu and keyboard shortcuts
 */
import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import useWorkflowStore from "../../store/workflowStore";
import useExecutionStore from "../../store/executionStore";
import { useToastStore } from "../../store/toastStore";
import { isValidConnection } from "../../utils/validation";
import { createNode, getNodeColor, NODE_TYPES } from "../../utils/nodeTypes";
import ContextMenu from "../ContextMenu/ContextMenu";

// Import custom node components
import ManualTriggerNode from "../../nodes/triggers/ManualTriggerNode";
import ScheduleTriggerNode from "../../nodes/triggers/ScheduleTriggerNode";
import WebhookTriggerNode from "../../nodes/triggers/WebhookTriggerNode";
import ErrorTriggerNode from "../../nodes/triggers/ErrorTriggerNode";
import BrowserEventTriggerNode from "../../nodes/triggers/BrowserEventTriggerNode";
import CodeExecutorNode from "../../nodes/actions/CodeExecutorNode";
import SetVariableNode from "../../nodes/actions/SetVariableNode";
import LocalStorageNode from "../../nodes/actions/LocalStorageNode";
import FileSystemNode from "../../nodes/ai-tools/FileSystemNode";
import HTTPRequestNode from "../../nodes/ai-tools/HTTPRequestNode";
import IfElseNode from "../../nodes/logic/IfElseNode";
import LoopNode from "../../nodes/logic/LoopNode";
import SwitchNode from "../../nodes/logic/SwitchNode";
import MergeNode from "../../nodes/logic/MergeNode";
import GroupNode from "../../nodes/logic/GroupNode";
import AIAgentNode from "../../nodes/ai/AIAgentNode";
import ChatModelNode from "../../nodes/ai/ChatModelNode";
import VectorMemoryNode from "../../nodes/ai/VectorMemoryNode";
import WaitForApprovalNode from "../../nodes/ai/WaitForApprovalNode";
import SubWorkflowNode from "../../nodes/ai/SubWorkflowNode";
import SemanticRouterNode from "../../nodes/ai/SemanticRouterNode";
import EvaluatorNode from "../../nodes/ai/EvaluatorNode";
import SwarmNode from "../../nodes/ai/SwarmNode";
import TextToSpeechNode from "../../nodes/ai-tools/TextToSpeechNode";
import ImageGenerationNode from "../../nodes/ai-tools/ImageGenerationNode";
import PythonExecutorNode from "../../nodes/ai-tools/PythonExecutorNode";
import OutputNode from "../../nodes/triggers/OutputNode";
import AnimatedEdge from "./AnimatedEdge";
import ExecutionControls from "../ExecutionControls/ExecutionControls";

import AIControls from "../AIControls/AIControls";
import CommandPalette from "../CommandPalette/CommandPalette";
import ExecutionAnalytics from "../Analytics/ExecutionAnalytics";
import "./WorkflowEditor.css";

// Register custom node types
const nodeTypes = {
  manualTrigger: ManualTriggerNode,
  scheduleTrigger: ScheduleTriggerNode,
  webhookTrigger: WebhookTriggerNode,
  errorTrigger: ErrorTriggerNode,
  browserEventTrigger: BrowserEventTriggerNode,
  httpRequest: HTTPRequestNode,
  codeExecutor: CodeExecutorNode,
  setVariable: SetVariableNode,
  fileSystem: FileSystemNode,
  localStorage: LocalStorageNode,
  pythonExecutor: PythonExecutorNode,
  ifElse: IfElseNode,
  loop: LoopNode,
  switchNode: SwitchNode,
  merge: MergeNode,
  aiAgent: AIAgentNode,
  chatModel: ChatModelNode,
  vectorMemory: VectorMemoryNode,
  waitForApproval: WaitForApprovalNode,
  subWorkflow: SubWorkflowNode,
  textToSpeech: TextToSpeechNode,
  imageGeneration: ImageGenerationNode,
  semanticRouter: SemanticRouterNode,
  evaluator: EvaluatorNode,
  swarm: SwarmNode,
  output: OutputNode,
  groupNode: GroupNode,
};

// Register custom edge types
const edgeTypes = {
  animated: AnimatedEdge,
};

function WorkflowEditor() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  // View controls state
  const [showMinimap, setShowMinimap] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { zoom } = useViewport();

  // Workflow store
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const getWorkflowData = useWorkflowStore((state) => state.getWorkflowData);

  // Toast
  const toast = useToastStore();

  // Execution store - for highlighting active nodes
  const currentNodeId = useExecutionStore((state) => state.currentNodeId);
  const isRunning = useExecutionStore((state) => state.isRunning);

  // Connection validation
  const isValid = useCallback(
    (connection) => isValidConnection(connection, nodes, edges),
    [nodes, edges]
  );

  // Handle node click - just close context menu, config opened via toolbar ⚙️ button
  const handleNodeClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle canvas click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, [setSelectedNode]);

  // Handle node context menu (right-click) - only show context menu, not config
  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      // Select the node so context menu actions work
      setSelectedNode(node.id);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "node",
        nodeId: node.id,
      });
    },
    [setSelectedNode]
  );

  // Handle pane context menu
  const handlePaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "pane",
        position,
      });
    },
    [screenToFlowPosition]
  );

  // Edge events state
  const [splitEdgeId, setSplitEdgeId] = useState(null);

  // Handle custom edge events (delete, add node)
  useEffect(() => {
    const handleDeleteEdge = (event) => {
      const { edgeId } = event.detail;
      const edge = edges.find((e) => e.id === edgeId);
      if (edge) {
        useWorkflowStore
          .getState()
          .onEdgesChange([{ id: edgeId, type: "remove" }]);
        toast.info("Connection deleted");
      }
    };

    const handleAddNodeOnEdge = (event) => {
      const { edgeId, position } = event.detail;
      setSplitEdgeId(edgeId);
      setContextMenu({
        x:
          position.x +
          (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
        y:
          position.y +
          (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
        type: "insert",
        position: { x: position.x, y: position.y }, // Flow position
      });
    };

    window.addEventListener("deleteEdge", handleDeleteEdge);
    window.addEventListener("addNodeOnEdge", handleAddNodeOnEdge);

    return () => {
      window.removeEventListener("deleteEdge", handleDeleteEdge);
      window.removeEventListener("addNodeOnEdge", handleAddNodeOnEdge);
    };
  }, [edges, toast]);

  // Handle context menu action
  const handleContextAction = useCallback(
    (action) => {
      const selectedNode = nodes.find((n) => n.id === selectedNodeId);

      // Helper to add node generally
      const handleAddNode = (type) => {
        if (contextMenu?.position) {
          // Check if we are splitting an edge
          if (contextMenu.type === "insert" && splitEdgeId) {
            const edge = edges.find((e) => e.id === splitEdgeId);
            if (edge) {
              // Create new node at click position
              const newNode = createNode(type, contextMenu.position);
              addNode(newNode);

              // Create new edges: Source -> New -> Target
              const sourceEdge = {
                id: `e${edge.source}-${newNode.id}`,
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: newNode.id,
                targetHandle: "input-0", // Assuming default input
                type: "animated",
              };

              const targetEdge = {
                id: `e${newNode.id}-${edge.target}`,
                source: newNode.id,
                sourceHandle: "output-0", // Assuming default output
                target: edge.target,
                targetHandle: edge.targetHandle,
                type: "animated",
              };

              // Add new edges and remove old one
              useWorkflowStore
                .getState()
                .onEdgesChange([{ id: splitEdgeId, type: "remove" }]);
              // We need to add edges directly to store or via onConnect
              // Using onConnect for ease, but it takes one connection at a time
              // So we manually update store edges here for valid operation
              const { edges: currentEdges, setEdges } =
                useWorkflowStore.getState();
              setEdges([
                ...currentEdges.filter((e) => e.id !== splitEdgeId),
                sourceEdge,
                targetEdge,
              ]);

              toast.success("Node inserted");
            }
            setSplitEdgeId(null);
          } else {
            // Normal add
            addNode(createNode(type, contextMenu.position));
          }
        }
      };

      switch (action) {
        case "delete":
          if (selectedNodeId) {
            deleteNode(selectedNodeId);
            setSelectedNode(null);
            toast.info("Node deleted");
          }
          break;

        case "duplicate":
          if (selectedNode) {
            const newNode = createNode(selectedNode.type, {
              x: selectedNode.position.x + 50,
              y: selectedNode.position.y + 50,
            });
            newNode.data = {
              ...selectedNode.data,
              label: `${selectedNode.data.label} (copy)`,
            };
            addNode(newNode);
            toast.success("Node duplicated");
          }
          break;

        case "copy":
          if (selectedNode) {
            setClipboard({ ...selectedNode });
            toast.info("Node copied");
          }
          break;

        case "cut":
          if (selectedNode) {
            setClipboard({ ...selectedNode });
            deleteNode(selectedNodeId);
            setSelectedNode(null);
            toast.info("Node cut");
          }
          break;

        case "paste":
          if (clipboard && contextMenu?.position) {
            const newNode = createNode(clipboard.type, contextMenu.position);
            newNode.data = {
              ...clipboard.data,
              label: `${clipboard.data.label} (paste)`,
            };
            addNode(newNode);
            toast.success("Node pasted");
          }
          break;

        case "addTrigger":
          handleAddNode("manualTrigger");
          break;

        case "addHTTP":
          handleAddNode("httpRequest");
          break;

        case "addAI":
          handleAddNode("aiAgent");
          break;

        case "codeExecutor":
          handleAddNode("codeExecutor");
          break;

        case "setVariable":
          handleAddNode("setVariable");
          break;

        case "ifElse":
          handleAddNode("ifElse");
          break;

        case "textToSpeech":
          handleAddNode("textToSpeech");
          break;

        case "output":
          handleAddNode("output");
          break;

        case "fitView":
          fitView({ padding: 0.2 });
          break;

        case "zoomIn":
          zoomIn();
          break;

        case "zoomOut":
          zoomOut();
          break;

        case "selectAll":
          // React Flow handles this internally
          break;
      }

      setContextMenu(null);
    },
    [
      nodes,
      edges, // Added edges dependency
      selectedNodeId,
      deleteNode,
      setSelectedNode,
      addNode,
      clipboard,
      contextMenu,
      splitEdgeId, // Added splitEdgeId dependency
      fitView,
      zoomIn,
      zoomOut,
      toast,
    ]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if typing in an input
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      const isMod = event.ctrlKey || event.metaKey;

      // Ctrl+S - Save
      if (isMod && event.key === "s") {
        event.preventDefault();
        const workflow = getWorkflowData();
        localStorage.setItem("flownode-workflow", JSON.stringify(workflow));
        toast.success("Workflow saved");
      }

      // Ctrl+C - Copy
      if (isMod && event.key === "c" && selectedNodeId) {
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (node) {
          setClipboard({ ...node });
          toast.info("Node copied");
        }
      }

      // Ctrl+V - Paste
      if (isMod && event.key === "v" && clipboard) {
        const newNode = createNode(clipboard.type, {
          x: clipboard.position.x + 100,
          y: clipboard.position.y + 100,
        });
        newNode.data = { ...clipboard.data };
        addNode(newNode);
        toast.success("Node pasted");
      }

      // Ctrl+D - Duplicate
      if (isMod && event.key === "d" && selectedNodeId) {
        event.preventDefault();
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (node) {
          const newNode = createNode(node.type, {
            x: node.position.x + 50,
            y: node.position.y + 50,
          });
          newNode.data = { ...node.data, label: `${node.data.label} (copy)` };
          addNode(newNode);
          setSelectedNode(newNode.id);
          toast.success("Node duplicated");
        }
      }

      // Ctrl++ / Ctrl+= - Zoom in
      if (isMod && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        zoomIn();
      }

      // Ctrl+- - Zoom out
      if (isMod && event.key === "-") {
        event.preventDefault();
        zoomOut();
      }

      // Ctrl+0 - Fit view
      if (isMod && event.key === "0") {
        event.preventDefault();
        fitView({ padding: 0.2 });
      }

      // Ctrl+K - Command palette
      if (isMod && event.key === "k") {
        event.preventDefault();
        setShowCommandPalette(true);
      }

      // Shift+A - Analytics dashboard
      if (event.shiftKey && event.key === "A") {
        event.preventDefault();
        setShowAnalytics((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    nodes,
    selectedNodeId,
    clipboard,
    addNode,
    setSelectedNode,
    getWorkflowData,
    fitView,
    zoomIn,
    zoomOut,
    toast,
  ]);

  // Handle drag over for drop zone
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle node drop from sidebar
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !NODE_TYPES[type]) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNode(type, position);
      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  // Memoize edge styles
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "animated",
      style: {
        stroke: "var(--edge-color)",
        strokeWidth: 2,
      },
    }),
    []
  );

  // MiniMap node color function
  const minimapNodeColor = useCallback(
    (node) => {
      if (isRunning && node.id === currentNodeId) {
        return "var(--color-success)";
      }
      return getNodeColor(node.type);
    },
    [isRunning, currentNodeId]
  );

  return (
    <div className="workflow-editor" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValid}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.5}
        maxZoom={5}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant="dots"
          gap={20}
          size={1}
          color="var(--border-color)"
        />
        {/* Collapsible Minimap */}
        <div
          className={`minimap-container ${
            showMinimap ? "expanded" : "collapsed"
          }`}
        >
          <button
            className="minimap-toggle"
            onClick={() => setShowMinimap(!showMinimap)}
            title={showMinimap ? "Hide minimap" : "Show minimap"}
          >
            🗺️
          </button>
          {showMinimap && (
            <MiniMap
              nodeColor={minimapNodeColor}
              maskColor="rgba(10, 10, 15, 0.8)"
              className="workflow-minimap"
              pannable={true}
              zoomable={true}
            />
          )}
        </div>

        {/* Custom View Controls */}
        <div className="view-controls-panel">
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={() => zoomOut()}
              title="Zoom out (Ctrl+-)"
            >
              −
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button
              className="zoom-btn"
              onClick={() => zoomIn()}
              title="Zoom in (Ctrl++)"
            >
              +
            </button>
          </div>
          <button
            className="view-btn"
            onClick={() => fitView({ padding: 0.2 })}
            title="Fit to screen (Ctrl+0)"
          >
            ⊞
          </button>
        </div>

        {/* AI Controls */}
        <AIControls />

        {/* Execution Controls */}
        <ExecutionControls />
      </ReactFlow>
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectNode={(type, pos) => {
          const position = pos || { x: 400, y: 300 };
          addNode(createNode(type, position));
        }}
        insertPosition={contextMenu?.position || { x: 400, y: 300 }}
      />
      {/* Analytics Dashboard (Shift+A) */}
      {showAnalytics && (
        <ExecutionAnalytics onClose={() => setShowAnalytics(false)} />
      )}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="workflow-empty-state">
          <div className="empty-icon">🔧</div>
          <h3>Build Your Workflow</h3>
          <p>Drag nodes from the sidebar to get started</p>
        </div>
      )}
    </div>
  );
}

export default WorkflowEditor;
