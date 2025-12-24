/**
 * Workflow State Store - Zustand
 * Manages workflow nodes, edges, and selection state
 */
import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

const useWorkflowStore = create((set, get) => ({
  // Workflow metadata
  workflowId: null,
  workflowName: "Untitled Workflow",

  // React Flow state
  nodes: [],
  edges: [],

  // Ghost/Preview State
  previewNodes: [],
  previewEdges: [],

  // Selection
  selectedNodeId: null,
  configOpen: false, // Only true when config panel should be open

  // Actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    // Add edge with 'animated' type to enable custom edge features (hover buttons)
    const newEdge = {
      ...connection,
      type: "animated",
    };
    set({
      edges: addEdge(newEdge, get().edges),
    });
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },

  updateNode: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    });
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  // Open/close config panel - only set by action button clicks
  setConfigOpen: (isOpen) => set({ configOpen: isOpen }),

  // Open config for a specific node
  openConfig: (nodeId) => set({ selectedNodeId: nodeId, configOpen: true }),

  // Close config without deselecting node
  closeConfig: () => set({ configOpen: false }),

  clearWorkflow: () =>
    set({ nodes: [], edges: [], selectedNodeId: null, configOpen: false }),

  setWorkflowName: (name) => set({ workflowName: name }),

  // Serialization
  getWorkflowData: () => ({
    id: get().workflowId,
    name: get().workflowName,
    nodes: get().nodes,
    edges: get().edges,
  }),

  loadWorkflow: (data) => {
    set({
      workflowId: data.id || Date.now().toString(),
      workflowName: data.name || "Untitled Workflow",
      nodes: data.nodes || [],
      edges: data.edges || [],
      selectedNodeId: null,
    });
  },
  // Preview Mode Actions
  setPreview: (nodes, edges) => {
    set({
      previewNodes: nodes.map((n) => ({
        ...n,
        id: n.id || `preview-${Math.random()}`,
        className: "node-ghost",
        draggable: false,
        selectable: false,
      })),
      previewEdges: edges.map((e) => ({
        ...e,
        id: e.id || `preview-edge-${Math.random()}`,
        className: "edge-ghost",
        animated: true,
      })),
    });
  },

  clearPreview: () => set({ previewNodes: [], previewEdges: [] }),

  commitPreview: () => {
    const { nodes, edges, previewNodes, previewEdges } = get();
    // Remove ghost flags and merge
    const realNodes = previewNodes.map((node) => {
      // eslint-disable-next-line no-unused-vars
      const { className, draggable, selectable, ...n } = node;
      return {
        ...n,
        selected: false,
      };
    });
    const realEdges = previewEdges.map((edge) => {
      // eslint-disable-next-line no-unused-vars
      const { className, ...e } = edge;
      return {
        ...e,
        type: "animated", // Ensure correct edge type
      };
    });

    set({
      nodes: [...nodes, ...realNodes],
      edges: [...edges, ...realEdges],
      previewNodes: [],
      previewEdges: [],
    });
  },
}));

export default useWorkflowStore;
