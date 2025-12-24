/**
 * Workflow Templates
 * Pre-built workflow examples for quick start
 */

export const WORKFLOW_TEMPLATES = [
  {
    id: "api-fetch",
    name: "API Fetch & Transform",
    description: "Fetch data from an API and process it with code",
    category: "api",
    icon: "🌐",
    nodes: [
      {
        id: "trigger-1",
        type: "manualTrigger",
        position: { x: 100, y: 200 },
        data: { label: "Start" },
      },
      {
        id: "http-1",
        type: "httpRequest",
        position: { x: 350, y: 200 },
        data: {
          label: "Fetch Data",
          method: "GET",
          url: "https://jsonplaceholder.typicode.com/posts/1",
          timeout: 30000,
        },
      },
      {
        id: "code-1",
        type: "codeExecutor",
        position: { x: 600, y: 200 },
        data: {
          label: "Transform",
          code: `// Process the API response
const { data } = input;
return {
  title: data.title.toUpperCase(),
  body: data.body.substring(0, 100) + "...",
  processed: true
};`,
        },
      },
    ],
    edges: [
      {
        id: "e1-2",
        source: "trigger-1",
        target: "http-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e2-3",
        source: "http-1",
        target: "code-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
    ],
  },
  {
    id: "conditional-routing",
    name: "Conditional Routing",
    description: "Route data based on conditions using If/Else",
    category: "logic",
    icon: "🔀",
    nodes: [
      {
        id: "trigger-1",
        type: "manualTrigger",
        position: { x: 100, y: 250 },
        data: { label: "Input" },
      },
      {
        id: "setvar-1",
        type: "setVariable",
        position: { x: 320, y: 250 },
        data: {
          label: "Set Status",
          variableName: "status",
          value: "active",
          mode: "set",
        },
      },
      {
        id: "ifelse-1",
        type: "ifElse",
        position: { x: 540, y: 250 },
        data: {
          label: "Check Status",
          condition: "status",
          operator: "equals",
          compareValue: "active",
        },
      },
      {
        id: "code-true",
        type: "codeExecutor",
        position: { x: 780, y: 150 },
        data: {
          label: "Active Path",
          code: `return { ...input, message: "User is ACTIVE" };`,
        },
      },
      {
        id: "code-false",
        type: "codeExecutor",
        position: { x: 780, y: 350 },
        data: {
          label: "Inactive Path",
          code: `return { ...input, message: "User is INACTIVE" };`,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "trigger-1",
        target: "setvar-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e2",
        source: "setvar-1",
        target: "ifelse-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e3",
        source: "ifelse-1",
        target: "code-true",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e4",
        source: "ifelse-1",
        target: "code-false",
        sourceHandle: "output-1",
        targetHandle: "input-0",
      },
    ],
  },
  {
    id: "loop-processing",
    name: "Loop Over Items",
    description: "Process an array of items one by one",
    category: "data",
    icon: "🔄",
    nodes: [
      {
        id: "trigger-1",
        type: "manualTrigger",
        position: { x: 100, y: 200 },
        data: { label: "Start" },
      },
      {
        id: "setvar-1",
        type: "setVariable",
        position: { x: 320, y: 200 },
        data: {
          label: "Create Array",
          variableName: "items",
          value: "{{ [1, 2, 3, 4, 5] }}",
          mode: "set",
        },
      },
      {
        id: "loop-1",
        type: "loop",
        position: { x: 540, y: 200 },
        data: {
          label: "Loop Items",
          itemsPath: "items",
          maxIterations: 100,
        },
      },
      {
        id: "code-1",
        type: "codeExecutor",
        position: { x: 760, y: 120 },
        data: {
          label: "Process Item",
          code: `return { 
  item: input.item,
  squared: input.item * input.item,
  index: input.index 
};`,
        },
      },
      {
        id: "code-done",
        type: "codeExecutor",
        position: { x: 760, y: 280 },
        data: {
          label: "Done",
          code: `return { 
  completed: true, 
  results: input.loopResults 
};`,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "trigger-1",
        target: "setvar-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e2",
        source: "setvar-1",
        target: "loop-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e3",
        source: "loop-1",
        target: "code-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e4",
        source: "loop-1",
        target: "code-done",
        sourceHandle: "output-1",
        targetHandle: "input-0",
      },
    ],
  },
  {
    id: "ai-chat",
    name: "AI Chat Assistant",
    description: "Send text to AI and get a response",
    category: "ai",
    icon: "🤖",
    nodes: [
      {
        id: "trigger-1",
        type: "manualTrigger",
        position: { x: 100, y: 200 },
        data: { label: "User Input" },
      },
      {
        id: "setvar-1",
        type: "setVariable",
        position: { x: 340, y: 200 },
        data: {
          label: "Set Question",
          variableName: "question",
          value: "What is the capital of France?",
          mode: "set",
        },
      },
      {
        id: "ai-1",
        type: "aiAgent",
        position: { x: 580, y: 200 },
        data: {
          label: "AI Assistant",
          systemPrompt: "You are a helpful assistant. Answer concisely.",
          modelId: "gemma-2-2b-it-q4f16_1-MLC",
          temperature: 0.7,
          maxTokens: 500,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "trigger-1",
        target: "setvar-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e2",
        source: "setvar-1",
        target: "ai-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
    ],
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    description: "Fetch, filter, and aggregate data",
    category: "data",
    icon: "📊",
    nodes: [
      {
        id: "trigger-1",
        type: "manualTrigger",
        position: { x: 100, y: 200 },
        data: { label: "Start Pipeline" },
      },
      {
        id: "http-1",
        type: "httpRequest",
        position: { x: 320, y: 200 },
        data: {
          label: "Fetch Users",
          method: "GET",
          url: "https://jsonplaceholder.typicode.com/users",
          timeout: 30000,
        },
      },
      {
        id: "code-filter",
        type: "codeExecutor",
        position: { x: 540, y: 200 },
        data: {
          label: "Filter & Map",
          code: `// Filter and transform the data
const users = input.data;
return {
  users: users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    city: u.address.city
  })),
  count: users.length
};`,
        },
      },
      {
        id: "code-aggregate",
        type: "codeExecutor",
        position: { x: 760, y: 200 },
        data: {
          label: "Aggregate",
          code: `// Create summary
return {
  summary: \`Processed \${input.count} users\`,
  users: input.users,
  timestamp: new Date().toISOString()
};`,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "trigger-1",
        target: "http-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e2",
        source: "http-1",
        target: "code-filter",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
      {
        id: "e3",
        source: "code-filter",
        target: "code-aggregate",
        sourceHandle: "output-0",
        targetHandle: "input-0",
      },
    ],
  },

  {
    id: "poem-speech",
    name: "Poem to Speech",
    description: "Generate a poem using AI and read it out loud",
    category: "ai",
    icon: "🎭",
    nodes: [
      {
        id: "trigger-1",
        type: "manualTrigger",
        position: { x: 100, y: 200 },
        data: {
          label: "Start",
          description: "Enter your poem topic",
          inputFields: [
            {
              name: "topic",
              type: "text",
              label: "Poem Topic",
              placeholder: "Enter a topic for the poem...",
              required: true,
            },
          ],
        },
      },
      {
        id: "ai-1",
        type: "aiAgent",
        position: { x: 350, y: 200 },
        data: {
          label: "Poem Writer",
          systemPrompt:
            "You are a creative poet. Write beautiful, evocative poems based on the given topic. Keep poems to 4-8 lines. Output ONLY the poem, no commentary.",
          reasoningMode: "direct",
          temperature: 0.8,
          maxTokens: 500,
        },
      },
      {
        id: "tts-1",
        type: "textToSpeech",
        position: { x: 600, y: 200 },
        data: {
          label: "Speak Poem",
          provider: "webSpeech",
          voice: "default",
          speed: 0.9,
          pitch: 1.0,
          autoPlay: true,
        },
      },
      {
        id: "output-1",
        type: "output",
        position: { x: 850, y: 200 },
        data: {
          label: "Final Output",
          outputType: "console",
          formatJson: false,
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "trigger-1",
        target: "ai-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
        type: "animated",
      },
      {
        id: "e2",
        source: "ai-1",
        target: "tts-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
        type: "animated",
      },
      {
        id: "e3",
        source: "tts-1",
        target: "output-1",
        sourceHandle: "output-0",
        targetHandle: "input-0",
        type: "animated",
      },
    ],
  },
];

// Get templates by category
export function getTemplatesByCategory() {
  const grouped = {
    api: [],
    logic: [],
    data: [],
    ai: [],
  };

  WORKFLOW_TEMPLATES.forEach((template) => {
    if (grouped[template.category]) {
      grouped[template.category].push(template);
    }
  });

  return grouped;
}

// Get template by ID
export function getTemplateById(id) {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
