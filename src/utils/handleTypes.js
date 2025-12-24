/**
 * Handle Types for Node Connections
 * Supports 4-Axis Port System with circle and diamond shapes
 */

// Handle shapes
export const HANDLE_SHAPES = {
  circle: "circle", // Standard data flow
  diamond: "diamond", // Resource injection
};

// Handle type definitions with shape and required state
export const HANDLE_TYPES = {
  // Data Flow (Horizontal) - Circle handles
  workflow: {
    id: "workflow",
    label: "Data",
    color: "#888",
    strokeDasharray: "none",
    shape: HANDLE_SHAPES.circle,
    description: "Standard data flow connection",
  },

  // Resource Injection (Vertical) - Diamond handles
  model: {
    id: "model",
    label: "Chat Model",
    color: "#6366f1", // Indigo
    strokeDasharray: "5,5",
    shape: HANDLE_SHAPES.diamond,
    description: "AI model provider connection",
    required: true, // Agent requires a model
    warningColor: "#ef4444", // Red when not connected
  },
  memory: {
    id: "memory",
    label: "Memory",
    color: "#10b981", // Green
    strokeDasharray: "5,5",
    shape: HANDLE_SHAPES.diamond,
    description: "Memory/context connection",
    required: false,
  },
  tool: {
    id: "tool",
    label: "Tool",
    color: "#f59e0b", // Amber
    strokeDasharray: "5,5",
    shape: HANDLE_SHAPES.diamond,
    description: "Tool/function connection",
    multiple: true, // Allow multiple tool connections
    required: false,
  },
};

// Edge style generator based on handle type
export function getEdgeStyle(handleType = "workflow") {
  const type = HANDLE_TYPES[handleType] || HANDLE_TYPES.workflow;
  return {
    stroke: type.color,
    strokeDasharray: type.strokeDasharray,
    strokeWidth: 2,
  };
}

// Check if handle type uses diamond shape
export function isDiamondHandle(handleType) {
  const type = HANDLE_TYPES[handleType];
  return type?.shape === HANDLE_SHAPES.diamond;
}

// Get handle color (with required warning state)
export function getHandleColor(handleType, isConnected = false) {
  const type = HANDLE_TYPES[handleType] || HANDLE_TYPES.workflow;
  if (type.required && !isConnected) {
    return type.warningColor || "#ef4444"; // Warning red
  }
  return type.color;
}

// Validate connection between handle types
export function canConnect(sourceType, targetType) {
  // Workflow can connect to workflow
  if (sourceType === "workflow" && targetType === "workflow") return true;

  // Special AI handles must match type
  if (sourceType === targetType) return true;

  return false;
}

// Get handle position based on type
export function getHandlePosition(handleType, index = 0) {
  switch (handleType) {
    case "model":
      return { side: "bottom", offset: 25 };
    case "memory":
      return { side: "bottom", offset: 50 };
    case "tool":
      return { side: "bottom", offset: 75 + index * 25 };
    default:
      return { side: "left", offset: 50 }; // workflow default
  }
}

// AI Agent slot configuration
export const AI_AGENT_SLOTS = {
  inputs: [
    { id: "workflow-in", type: "workflow", position: "left", shape: "circle" },
  ],
  resourceSlots: [
    {
      id: "model-slot",
      type: "model",
      position: "bottom",
      label: "Model",
      shape: "diamond",
      required: true,
    },
    {
      id: "memory-slot",
      type: "memory",
      position: "bottom",
      label: "Memory",
      shape: "diamond",
      required: false,
    },
    {
      id: "tool-slot",
      type: "tool",
      position: "bottom",
      label: "Tools",
      shape: "diamond",
      multiple: true,
      required: false,
    },
  ],
  outputs: [
    {
      id: "workflow-out",
      type: "workflow",
      position: "right",
      shape: "circle",
    },
  ],
};

// Provider node configurations (with top diamond outputs)
export const PROVIDER_CONFIGS = {
  chatModel: {
    name: "Chat Model",
    outputs: [
      {
        id: "model-out",
        type: "model",
        position: "top",
        shape: "diamond",
        label: "Model",
      },
    ],
  },
  vectorMemory: {
    name: "Vector Memory",
    inputs: [
      {
        id: "workflow-in",
        type: "workflow",
        position: "left",
        shape: "circle",
      },
    ],
    outputs: [
      {
        id: "memory-out",
        type: "memory",
        position: "top",
        shape: "diamond",
        label: "Memory",
      },
      {
        id: "workflow-out",
        type: "workflow",
        position: "right",
        shape: "circle",
      },
    ],
  },
  pythonTool: {
    name: "Python Tool",
    inputs: [
      {
        id: "workflow-in",
        type: "workflow",
        position: "left",
        shape: "circle",
      },
    ],
    outputs: [
      {
        id: "tool-out",
        type: "tool",
        position: "top",
        shape: "diamond",
        label: "Tool",
      },
      {
        id: "workflow-out",
        type: "workflow",
        position: "right",
        shape: "circle",
      },
    ],
  },
};

export default HANDLE_TYPES;
