/**
 * Execution State Store - Zustand
 * Manages workflow execution state, logs, debug info, and edge snapshots
 */
import { create } from "zustand";

// Maximum snapshots to keep per edge
const MAX_SNAPSHOTS_PER_EDGE = 5;

const useExecutionStore = create((set, get) => ({
  // Execution state
  isRunning: false,
  isPaused: false,
  isDebugMode: false,

  // Current execution context
  currentNodeId: null,
  activeSupportingNodeIds: [], // Nodes that are effectively active (e.g. tools called by AI)
  executionPath: [],
  logs: [],
  nodeResults: {},
  edgeSnapshots: {},
  artifacts: [],
  startTime: null,
  endTime: null,

  // ... (logs logs, etc)

  // Actions
  startExecution: () => {
    set({
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      endTime: null,
      logs: [],
      nodeResults: {},
      executionPath: [],
      currentNodeId: null,
      activeSupportingNodeIds: [],
      // Note: Keep edgeSnapshots across executions for debugging
    });
  },

  // ... (pause, resume, stop)

  stopExecution: () => {
    set({
      isRunning: false,
      isPaused: false,
      endTime: Date.now(),
      currentNodeId: null,
      activeSupportingNodeIds: [],
    });
  },

  setCurrentNode: (nodeId) => {
    const path = get().executionPath;
    set({
      currentNodeId: nodeId,
      executionPath: nodeId ? [...path, nodeId] : path,
      activeSupportingNodeIds: [], // Clear supporting nodes when moving to new main node
    });
  },

  setActiveSupportingNodes: (nodeIds) => {
    set({
      activeSupportingNodeIds: nodeIds || [],
    });
  },

  setNodeResult: (nodeId, result) => {
    set({
      nodeResults: {
        ...get().nodeResults,
        [nodeId]: result,
      },
    });
  },

  // Add edge snapshot for Ghost Data debugging
  addEdgeSnapshot: (edgeId, data) => {
    const snapshots = get().edgeSnapshots;
    const edgeHistory = snapshots[edgeId] || [];

    // Create snapshot with timestamp
    const snapshot = {
      timestamp: Date.now(),
      data: data,
      // Truncate data for preview if too large
      preview: JSON.stringify(data, null, 2).slice(0, 500),
    };

    // Keep only last N snapshots
    const updatedHistory = [...edgeHistory, snapshot].slice(
      -MAX_SNAPSHOTS_PER_EDGE
    );

    set({
      edgeSnapshots: {
        ...snapshots,
        [edgeId]: updatedHistory,
      },
    });
  },

  // Get snapshots for a specific edge
  getEdgeSnapshots: (edgeId) => {
    return get().edgeSnapshots[edgeId] || [];
  },

  // Get the most recent snapshot for an edge
  getLastEdgeSnapshot: (edgeId) => {
    const snapshots = get().edgeSnapshots[edgeId];
    return snapshots?.[snapshots.length - 1] || null;
  },

  // Clear edge snapshots
  clearEdgeSnapshots: () => set({ edgeSnapshots: {} }),

  addLog: (log) => {
    const logEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toISOString(),
      ...log,
    };
    set({
      logs: [...get().logs, logEntry],
    });
  },

  addArtifact: (artifact) => {
    set({
      artifacts: [...get().artifacts, artifact],
    });
  },

  clearLogs: () => set({ logs: [] }),

  setDebugMode: (enabled) => set({ isDebugMode: enabled }),

  // Get execution duration in ms
  getExecutionDuration: () => {
    const { startTime, endTime, isRunning } = get();
    if (!startTime) return 0;
    return (isRunning ? Date.now() : endTime || Date.now()) - startTime;
  },

  // Reset all execution state
  reset: () => {
    set({
      isRunning: false,
      isPaused: false,
      isDebugMode: false,
      currentNodeId: null,
      executionPath: [],
      logs: [],
      nodeResults: {},
      edgeSnapshots: {},
      artifacts: [],
      startTime: null,
      endTime: null,
    });
  },
}));

export default useExecutionStore;
