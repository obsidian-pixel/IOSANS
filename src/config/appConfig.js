/**
 * Application Configuration
 * Centralized configuration for timeouts, limits, and other constants
 */

// Execution timeouts (in milliseconds)
export const TIMEOUTS = {
  // AI/LLM operations
  AI_GENERATION: 300000, // 5 minutes
  AI_AGENT_TOOL_CALL: 60000, // 1 minute per tool
  AI_SWARM: 30000, // 30 seconds per swarm

  // Network operations
  HTTP_REQUEST: 30000, // 30 seconds
  WEBHOOK: 10000, // 10 seconds

  // Code execution
  SANDBOX_JS: 30000, // 30 seconds
  PYODIDE: 60000, // 1 minute

  // File operations
  FILE_SYSTEM: 10000, // 10 seconds

  // Approval/UI
  WAIT_FOR_APPROVAL: 0, // 0 = no timeout (wait indefinitely)
};

// Execution limits
export const LIMITS = {
  // Loop constraints
  MAX_LOOP_ITERATIONS: 10000,
  DEFAULT_LOOP_ITERATIONS: 100,

  // AI Agent
  MAX_TOOL_CALL_ITERATIONS: 10,
  MAX_TOKENS_DEFAULT: 2000,

  // Swarm
  MAX_SWARM_AGENTS: 10,
  DEFAULT_SWARM_AGENTS: 3,

  // Memory/Storage
  MAX_EDGE_SNAPSHOTS: 5,
  MAX_ARTIFACTS_DISPLAY: 100,
  MAX_LOG_ENTRIES: 1000,

  // SubWorkflow
  MAX_SUBWORKFLOW_DEPTH: 5,
};

// VRAM requirements (in GB)
export const VRAM_REQUIREMENTS = {
  "gemma-2-2b-it-q4f16_1-MLC": 1.5,
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": 1.0,
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": 2.0,
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": 1.2,
  "Qwen2.5-3B-Instruct-q4f16_1-MLC": 2.0,
  "Qwen2.5-7B-Instruct-q4f16_1-MLC": 4.5,
  "Phi-3.5-mini-instruct-q4f16_1-MLC": 2.5,
  "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC": 4.5,
  "SmolLM2-1.7B-Instruct-q4f16_1-MLC": 1.2,
};

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 4000, // 4 seconds
  DEBOUNCE_CONFIG_UPDATE: 300, // 300ms
  MINIMAP_MASK_COLOR: "rgba(10, 10, 15, 0.8)",
  SNAP_GRID: [15, 15],
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 5,
};

// Storage keys
export const STORAGE_KEYS = {
  WORKFLOW: "flownode-workflow",
  SELECTED_MODEL: "selectedModel",
  WORKFLOWS: "iosans-workflows",
  OVERSEER_SESSIONS: "overseer-sessions",
  MODEL_STATE: "model-storage",
};

// Feature flags
export const FEATURES = {
  ENABLE_PYODIDE: true,
  ENABLE_TTS: true,
  ENABLE_IMAGE_GEN: true,
  ENABLE_SUBWORKFLOW: true,
  ENABLE_SWARM: true,
  DEBUG_MODE: false,
};

export default {
  TIMEOUTS,
  LIMITS,
  VRAM_REQUIREMENTS,
  UI_CONFIG,
  STORAGE_KEYS,
  FEATURES,
};
