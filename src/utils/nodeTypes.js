/**
 * Node Type Definitions
 * Defines all available node types, their categories, and configuration schemas
 */

// Node categories with colors
export const NODE_CATEGORIES = {
  trigger: {
    name: "Triggers",
    color: "#00c853",
    description: "Start a workflow execution",
  },
  action: {
    name: "Actions",
    color: "#2979ff",
    description: "Perform operations on data",
  },
  logic: {
    name: "Logic",
    color: "#ffab00",
    description: "Control workflow flow",
  },
  ai: {
    name: "AI",
    color: "#e040fb",
    description: "AI-powered operations",
  },
  aiTool: {
    name: "AI Tools",
    color: "#f59e0b", // Amber color for tools
    description: "Tools callable by AI Agents",
  },
};

// Node type definitions
export const NODE_TYPES = {
  // Trigger nodes
  manualTrigger: {
    type: "manualTrigger",
    category: "trigger",
    name: "Manual Trigger",
    description: "Manually start the workflow",
    icon: "▶️",
    inputs: 0,
    outputs: 1,
    defaultData: {
      label: "Manual Trigger",
    },
  },
  scheduleTrigger: {
    type: "scheduleTrigger",
    category: "trigger",
    name: "Schedule Trigger",
    description: "Run on a schedule (cron-like)",
    icon: "⏰",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Schedule",
      schedule: "*/5 * * * *", // Every 5 minutes
      enabled: false,
    },
  },

  // Webhook Trigger
  webhookTrigger: {
    type: "webhookTrigger",
    category: "trigger",
    name: "Webhook Trigger",
    description: "Receive external HTTP triggers",
    icon: "🔗",
    inputs: 0,
    outputs: 1,
    defaultData: {
      label: "Webhook",
      method: "POST",
      endpoint: "/webhook/default",
      authRequired: false,
    },
  },

  // Error Trigger
  errorTrigger: {
    type: "errorTrigger",
    category: "trigger",
    name: "Error Trigger",
    description: "Trigger when any node fails",
    icon: "⚠️",
    inputs: 0,
    outputs: 1,
    defaultData: {
      label: "On Error",
      watchAll: true,
      specificNodes: [],
      retryEnabled: false,
      retryCount: 3,
    },
  },

  // Browser Event Trigger
  browserEventTrigger: {
    type: "browserEventTrigger",
    category: "trigger",
    name: "Browser Event",
    description: "Trigger on browser events",
    icon: "🌐",
    inputs: 0,
    outputs: 1,
    defaultData: {
      label: "Browser Event",
      eventType: "focus", // focus, blur, urlChange, domClick, timer
      selector: "",
      urlPattern: "",
      interval: 1000,
    },
  },

  // Output node (workflow terminal)
  output: {
    type: "output",
    category: "trigger",
    name: "Output",
    description: "Workflow output - displays or saves result",
    icon: "📤",
    inputs: 1,
    outputs: 0,
    defaultData: {
      label: "Output",
      outputType: "console", // console, file, notification, artifact
      filename: "output.txt",
      formatJson: false,
    },
  },

  // Action nodes
  codeExecutor: {
    type: "codeExecutor",
    category: "action",
    name: "Code",
    description: "Execute JavaScript code",
    icon: "💻",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Code",
      code: "// Access input data via `input`\n// Return output data\nreturn input;",
    },
  },
  setVariable: {
    type: "setVariable",
    category: "action",
    name: "Set Variable",
    description: "Set or transform data",
    icon: "📝",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Set Variable",
      variableName: "data",
      value: "",
      mode: "set", // set, append, merge
    },
  },

  // AI Tools
  httpRequest: {
    type: "httpRequest",
    category: "aiTool",
    name: "HTTP Request",
    description: "Make HTTP requests to APIs",
    icon: "🌐",
    inputs: 0,
    outputs: 0,
    isProvider: true, // Connects to AI Agent
    defaultData: {
      label: "HTTP Request",
      method: "GET",
      url: "",
      headers: {},
      body: "",
      timeout: 30000,
      description: "Perform HTTP request. Args: { url, method, body }", // Tool description for AI
    },
  },
  fileSystem: {
    type: "fileSystem",
    category: "aiTool",
    name: "File System",
    description: "Read/write local files (FSA API)",
    icon: "📁",
    inputs: 0,
    outputs: 0,
    isProvider: true, // Connects to AI Agent
    defaultData: {
      label: "File",
      mode: "read", // read, write
      filename: "",
      fileTypes: [],
      description: "Read or write files. Args: { filename, content, mode }", // Tool description for AI
    },
  },

  // Local Storage Node
  localStorage: {
    type: "localStorage",
    category: "action",
    name: "Local Storage",
    description: "Read/write to IndexedDB or LocalStorage",
    icon: "💾",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Storage",
      mode: "get", // get, set, delete
      storageType: "indexedDB",
      key: "",
    },
  },

  // Logic nodes
  ifElse: {
    type: "ifElse",
    category: "logic",
    name: "If/Else",
    description: "Branch based on conditions",
    icon: "🔀",
    inputs: 1,
    outputs: 2, // true, false branches
    defaultData: {
      label: "If/Else",
      condition: "",
      operator: "equals", // equals, contains, greaterThan, etc.
      compareValue: "",
    },
  },
  loop: {
    type: "loop",
    category: "logic",
    name: "Loop",
    description: "Iterate over array items or repeat N times",
    icon: "🔄",
    inputs: 1,
    outputs: 2, // loop body, done
    defaultData: {
      label: "Loop",
      iterations: 1, // Number of times to repeat
      itemsPath: "items", // Path to array in input data
      maxIterations: 100,
    },
  },
  switchNode: {
    type: "switchNode",
    category: "logic",
    name: "Switch",
    description: "Route to different outputs",
    icon: "🔃",
    inputs: 1,
    outputs: 4, // Up to 4 output routes
    defaultData: {
      label: "Switch",
      field: "",
      routes: [
        { value: "", outputIndex: 0 },
        { value: "", outputIndex: 1 },
      ],
      defaultOutput: 3,
    },
  },
  merge: {
    type: "merge",
    category: "logic",
    name: "Merge",
    description: "Combine multiple inputs (wait for all or first)",
    icon: "🔗",
    inputs: 2,
    outputs: 1,
    defaultData: {
      label: "Merge",
      mode: "wait", // wait (all inputs), first (first to complete)
      inputCount: 2,
      aggregator: "array", // array, object, concat
    },
  },

  // Semantic Router Node - AI-powered intent classification
  semanticRouter: {
    type: "semanticRouter",
    category: "ai",
    name: "Semantic Router",
    description: "Route input to outputs based on semantic classification",
    icon: "🧭",
    inputs: 1,
    outputs: 4, // Dynamic based on routes
    defaultData: {
      label: "Router",
      classificationMode: "keyword", // keyword, llm, embedding
      routes: [
        { id: "route-0", label: "General", keywords: ["general", "other"] },
        {
          id: "route-1",
          label: "Technical",
          keywords: ["code", "programming", "bug"],
        },
        {
          id: "route-2",
          label: "Creative",
          keywords: ["story", "write", "creative"],
        },
      ],
    },
  },

  // Evaluator Node - Self-correction validation
  evaluator: {
    type: "evaluator",
    category: "ai",
    name: "Evaluator",
    description: "Validate output against schema for self-correction loops",
    icon: "🔍",
    inputs: 1,
    outputs: 2, // pass, retry
    defaultData: {
      label: "Evaluator",
      evaluationType: "schema", // schema, regex, llm
      maxRetries: 3,
      schema: null,
      regexPattern: "",
    },
  },
  groupNode: {
    type: "groupNode",
    category: "logic",
    name: "Group",
    description: "Collapsible container for grouping nodes",
    icon: "📦",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Node Group",
      collapsed: false,
      childNodeIds: [],
      width: 300,
      height: 200,
      color: "#6366f1",
    },
  },

  // AI nodes - Provider nodes (connect to AI Agent)
  chatModel: {
    type: "chatModel",
    category: "ai",
    name: "Chat Model",
    description: "AI model provider for agents",
    icon: "🧠",
    inputs: 0,
    outputs: 0, // Uses special model output handle
    isProvider: true, // Marks as provider node
    defaultData: {
      label: "Chat Model",
      provider: "webllm", // webllm, openai, anthropic
      modelId: "gemma-2-2b-it-q4f16_1-MLC",
      modelName: "Gemma 2 2B",
      temperature: 0.7,
      maxTokens: 2000,
    },
  },

  // AI nodes
  aiAgent: {
    type: "aiAgent",
    category: "ai",
    name: "AI Agent",
    description: "WebLLM-powered AI agent with ReAct",
    icon: "🤖",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "AI Agent",
      systemPrompt: "",
      modelId: "gemma-2-2b-it-q4f16_1-MLC",
      temperature: 0.7,
      maxTokens: 2000,
      tools: [], // References to other nodes that can be called
    },
  },

  // Vector Memory Node
  vectorMemory: {
    type: "vectorMemory",
    category: "ai",
    name: "Vector Memory",
    description: "Store and query local vector memory",
    icon: "🧠",
    inputs: 1,
    outputs: 1,
    isProvider: true, // Allow connecting to AI Agent
    defaultData: {
      label: "Memory",
      mode: "query", // query, upsert, delete
      namespace: "default",
      topK: 5,
      minScore: 0.3,
    },
  },

  // Wait for Approval Node
  waitForApproval: {
    type: "waitForApproval",
    category: "ai",
    name: "Wait for Approval",
    description: "Pause workflow for human approval",
    icon: "✋",
    inputs: 1,
    outputs: 2, // approved, rejected
    defaultData: {
      label: "Approval",
      title: "Approval Required",
      message: "",
      timeout: 0, // 0 = no timeout
      notifyBrowser: true,
    },
  },

  // Sub-Workflow Node
  subWorkflow: {
    type: "subWorkflow",
    category: "ai",
    name: "Sub-Workflow",
    description: "Execute another workflow as subroutine",
    icon: "🔀",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Sub-Workflow",
      workflowId: "",
      workflowName: "",
      passInput: true,
      async: false,
    },
  },

  // Text to Speech Node
  textToSpeech: {
    type: "textToSpeech",
    category: "aiTool",
    name: "Text to Speech",
    description: "Convert text to audio using Web Speech API",
    icon: "🔊",
    inputs: 0,
    outputs: 0,
    isProvider: true, // Connects to AI Agent tool slot
    defaultData: {
      label: "Text to Speech",
      provider: "webSpeech", // webSpeech, elevenlabs, openai
      voice: "default",
      speed: 1.0,
      pitch: 1.0,
      autoPlay: true,
    },
  },

  // Image Generation Node
  imageGeneration: {
    type: "imageGeneration",
    category: "aiTool",
    name: "Image Generation",
    description: "Generate images using AI models",
    icon: "🎨",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Generate Image",
      provider: "local", // local (WebSD), openai, stability
      model: "stable-diffusion",
      size: "512x512",
      negativePrompt: "",
      seed: null,
      steps: 20,
    },
  },

  // Python Executor Node
  pythonExecutor: {
    type: "pythonExecutor",
    category: "aiTool",
    name: "Python Executor",
    description: "Run Python code locally using Pyodide",
    icon: "🐍",
    inputs: 1,
    outputs: 1,
    defaultData: {
      label: "Python",
      code: "# Access input via 'input' variable\nresult = input",
      packages: [],
      timeout: 30000,
    },
  },
};

// Get nodes grouped by category
export function getNodesByCategory() {
  const grouped = {};

  Object.values(NODE_CATEGORIES).forEach((cat) => {
    grouped[cat.name] = [];
  });

  Object.values(NODE_TYPES).forEach((nodeType) => {
    const category = NODE_CATEGORIES[nodeType.category];
    if (category) {
      grouped[category.name].push(nodeType);
    }
  });

  return grouped;
}

// Create a new node instance
export function createNode(type, position) {
  const nodeType = NODE_TYPES[type];
  if (!nodeType) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    position,
    data: { ...nodeType.defaultData },
  };
}

// Get category color for a node type
export function getNodeColor(type) {
  const nodeType = NODE_TYPES[type];
  if (!nodeType) return "#666666";

  const category = NODE_CATEGORIES[nodeType.category];
  return category ? category.color : "#666666";
}
