# IOSANS - Infinite Open Source Automation System

<div align="center">

![IOSANS Logo](https://img.shields.io/badge/IOSANS-Local--First%20AI-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![WebGPU](https://img.shields.io/badge/WebGPU-Enabled-orange?style=for-the-badge)

**A serverless, local-first AI workflow automation platform. Build, run, and own your automation—100% in the browser.**

[Features](#-features) • [Tech Stack](#-technology-stack) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Nodes](#-node-reference) • [Contributing](#-contributing)

</div>

---

## 🎯 Vision

IOSANS puts you in control. No cloud subscriptions. No data leaks. No vendor lock-in. Build powerful AI-powered automations that run entirely in your browser with complete privacy and digital sovereignty.

---

## 🚀 Features

### 🖼️ Visual Workflow Editor

- **React Flow Canvas**: Drag-and-drop node editor with smooth pan/zoom
- **30+ Node Types**: Comprehensive library across 6 categories
- **Smart Connection Validation**: Prevents invalid node connections
- **Animated Edges**: Visual feedback with data flow animations
- **MiniMap**: Bird's-eye view for complex workflows
- **Context Menus**: Right-click actions for quick operations
- **Keyboard Shortcuts**: Full keyboard navigation (Ctrl+S, Ctrl+D, etc.)
- **4-Axis Port System**: Diamond handles for resources, circles for data flow

### 🤖 Local AI (WebLLM)

- **100% Browser-Based**: All inference runs locally via WebGPU
- **Multiple Models**: Gemma 2, Phi-3.5, Llama 3.2, Qwen 3, SmolLM, DeepSeek
- **Zero Data Leakage**: Your prompts never leave your device
- **JSON-Mode Tool Calling**: AI Agent executes connected tool nodes via structured JSON
- **Two-Pass Execution**: Tools return results to LLM for final answer (max 10 iterations)
- **Conversation Memory**: Maintain context across interactions
- **VRAM-Aware Selection**: Models show VRAM requirements

### 🔄 Workflow Execution

- **Real-Time Graph Traversal**: Visual execution highlighting
- **Loop Control**: Iteration-based and array-based looping with `itemsPath` support
- **Conditional Branching**: If/Else (8 operators) and Switch routing
- **Error Handling**: Error triggers with configurable retry logic
- **Artifact Storage**: All outputs saved to IndexedDB with persistence
- **Edge Status Feedback**: Pulse animation during active execution
- **Execution Context**: Unique execution IDs for tracking

### 🎯 Agentic Patterns

- **SemanticRouterNode**: Route input via keyword/LLM classification
- **EvaluatorNode**: Schema/regex validation with self-correction loops
- **MergeNode**: Wait-for-all or first-to-complete aggregation modes
- **Dynamic Ports**: Nodes with variable input/output handles
- **Swarm Orchestration**: Multi-agent coordination

### 🧠 Advanced Features

- **Vector Memory**: Semantic search with local embeddings (Jaccard fallback)
- **Text-to-Speech**: Web Speech API with voice preloading
- **Speech-to-Text**: Audio transcription
- **Human-in-the-Loop**: Approval gates for critical actions
- **Sub-Workflows**: Modular, reusable workflow components
- **Python Executor**: Run Python via Pyodide in-browser
- **Auto-Detect Types**: Intelligent MIME detection for Blob/JSON/audio/HTML/images
- **Expression Engine**: `{{ $input.field }}` syntax for dynamic values

### 🛠️ Developer Tools

- **Command Palette (Ctrl+K)**: Quick node insertion with fuzzy search
- **Run Step Debugging**: Execute individual nodes in isolation with mock data
- **CDN Library Injector**: Load npm packages (Lodash, Axios, Day.js) from CDN
- **GPU Hardware Detection**: WebGPU tier badges on AI nodes
- **Execution Analytics (Shift+A)**: Performance metrics and slowest nodes
- **Ghost Data Debugging**: Hover edges to see last payload snapshot
- **Monaco Editor**: CDN-loaded syntax highlighting for code nodes
- **Artifact Browser**: View, download, and delete stored artifacts

---

## 🛠️ Technology Stack

### Core Framework

| Technology        | Version | Purpose                                            |
| ----------------- | ------- | -------------------------------------------------- |
| **React**         | 19.x    | UI framework with Suspense and concurrent features |
| **Vite**          | 7.x     | Lightning-fast build tool with HMR                 |
| **Zustand**       | 5.x     | Lightweight state management                       |
| **@xyflow/react** | 12.x    | Node-based visual editor                           |

### AI & ML

| Technology          | Purpose                         |
| ------------------- | ------------------------------- |
| **@mlc-ai/web-llm** | Local LLM inference via WebGPU  |
| **WebGPU**          | GPU-accelerated ML computations |
| **Transformers.js** | Embeddings for vector memory    |

### Storage & APIs

| Technology                 | Purpose                           |
| -------------------------- | --------------------------------- |
| **IndexedDB**              | Artifact and workflow persistence |
| **File System Access API** | Local file operations             |
| **Web Speech API**         | Text-to-speech synthesis          |
| **Pyodide**                | Python runtime in WebAssembly     |

---

## 📁 Architecture

```
iosans/
├── src/
│   ├── components/           # React UI components
│   │   ├── Editor/           # React Flow workflow canvas
│   │   │   ├── WorkflowEditor.jsx
│   │   │   └── AnimatedEdge.jsx
│   │   ├── NodeConfig/       # Node configuration panel
│   │   │   └── configs/      # Per-node config components
│   │   ├── Sidebar/          # Node palette sidebar
│   │   ├── Toolbar/          # Workflow controls & docs
│   │   ├── ExecutionPanel/   # Logs, output, and artifacts tabs
│   │   ├── Overseer/         # AI Overseer chat panel
│   │   ├── MediaPreview/     # Audio/Image artifact viewers
│   │   ├── Onboarding/       # Tutorial & onboarding tour
│   │   └── LoadingOverlay/   # Model loading states
│   │
│   ├── nodes/                # Custom React Flow node components
│   │   ├── base/             # BaseNode wrapper with handles
│   │   ├── triggers/         # ManualTrigger, Schedule, Webhook, etc.
│   │   ├── actions/          # HTTP, Code, Output, FileSystem, etc.
│   │   ├── logic/            # IfElse, Loop, Switch, Merge, Group
│   │   ├── ai/               # AIAgent, VectorMemory, TTS, Evaluator, etc.
│   │   └── ai-tools/         # Tool nodes (HTTP, TTS, Python, etc.)
│   │
│   ├── store/                # Zustand state stores
│   │   ├── workflowStore.js  # Nodes, edges, selection
│   │   ├── executionStore.js # Execution state, logs, artifacts
│   │   └── modelStore.js     # WebLLM model management
│   │
│   ├── engine/               # Workflow execution engine
│   │   ├── ExecutionEngine.js    # Graph traversal & node execution
│   │   ├── NodeExecutors.js      # Per-node execution logic
│   │   ├── ToolCallingService.js # AI tool calling with ReAct
│   │   ├── WebLLMService.js      # LLM inference service
│   │   └── VectorMemoryService.js# Semantic search service
│   │
│   ├── services/             # External services
│   │   └── OverseerService.js    # AI workflow assistant
│   │
│   ├── utils/                # Utility functions
│   │   ├── nodeTypes.js      # Node type definitions & schemas
│   │   ├── validation.js     # Connection validation rules
│   │   ├── expressions.js    # Template expression engine
│   │   ├── artifactStorage.js    # IndexedDB artifact manager
│   │   ├── autoDetectType.js     # Intelligent MIME type detection
│   │   ├── stepExecutor.js       # Run Step debugging utility
│   │   ├── cdnLoader.js          # CDN library loader
│   │   └── hardwareDetection.js  # WebGPU/VRAM detection
│   │
│   ├── main.css              # Global theme & CSS variables
│   └── App.jsx               # Root component
│
├── public/                   # Static assets
├── index.html                # Entry HTML with meta tags
├── vite.config.js            # Vite configuration
└── package.json              # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **Chrome 113+** or **Edge 113+** (WebGPU required)
- **8GB+ RAM** recommended for larger AI models

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/iosans.git
cd iosans

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📦 Node Reference

### 🔌 Triggers (5 nodes)

Entry points that start workflow execution.

| Node                 | Icon | Description                         | Key Features                     |
| -------------------- | ---- | ----------------------------------- | -------------------------------- |
| **Manual Trigger**   | ▶️   | Start workflow on button click      | Simple one-click activation      |
| **Schedule Trigger** | ⏰   | CRON-based scheduled execution      | Interval and time-based triggers |
| **Webhook Trigger**  | 🔗   | HTTP endpoint for external triggers | Custom endpoint paths            |
| **Error Trigger**    | ⚠️   | Catch errors from other nodes       | Error handling and retry         |
| **Browser Event**    | 🌐   | Trigger on DOM/browser events       | Click, scroll, keyboard events   |

---

### ⚡ Actions (6 nodes)

Perform operations and transformations on data.

| Node                | Icon | Description                   | Key Features                                |
| ------------------- | ---- | ----------------------------- | ------------------------------------------- |
| **Output**          | 📤   | Display/save workflow results | Console, file, notification, artifact modes |
| **HTTP Request**    | 🌐   | External API calls            | Expression support in URL/headers/body      |
| **Code Executor**   | 💻   | JavaScript execution          | Monaco editor, CDN imports, async support   |
| **Python Executor** | 🐍   | Python via Pyodide            | Full Python stdlib, NumPy support           |
| **Set Variable**    | 📝   | Data transformation           | Template expressions, JSON path             |
| **File System**     | 📁   | Local file read/write         | Text and binary file support                |

---

### 🔀 Logic (5 nodes)

Control workflow flow and branching.

| Node        | Icon | Description                | Key Features                                                    |
| ----------- | ---- | -------------------------- | --------------------------------------------------------------- |
| **If/Else** | 🔀   | Conditional branching      | 8 operators: equals, contains, isEmpty, isTrue, regex, etc.     |
| **Loop**    | 🔄   | Iteration control          | Count-based or array-based with `itemsPath`, outputs item/index |
| **Switch**  | 🔃   | Multi-path routing         | Multiple case conditions with default                           |
| **Merge**   | 🔗   | Aggregate multiple inputs  | Wait-for-all or first-to-complete modes                         |
| **Group**   | 📦   | Collapsible node container | Organize complex workflows visually                             |

---

### 🤖 AI Nodes (10 nodes)

AI-powered processing and intelligence.

| Node                  | Icon | Description                  | Key Features                                      |
| --------------------- | ---- | ---------------------------- | ------------------------------------------------- |
| **AI Agent**          | 🤖   | WebLLM with tool calling     | JSON ReAct loop, max 10 iterations, 17 tool types |
| **Chat Model**        | 💬   | LLM configuration provider   | Model selection, temperature, max tokens          |
| **Vector Memory**     | 🧠   | Semantic storage & retrieval | Upsert, query, delete modes; Jaccard similarity   |
| **Semantic Router**   | 🧭   | Intent classification        | Keyword or LLM-based routing                      |
| **Evaluator**         | 🔍   | Output validation            | Schema or regex with retry counter                |
| **Text to Speech**    | 🔊   | Audio synthesis              | Web Speech API with voice selection               |
| **Speech to Text**    | 🎤   | Audio transcription          | Browser speech recognition                        |
| **Image Generation**  | 🎨   | AI image creation            | Prompt-based generation                           |
| **Wait for Approval** | ✋   | Human-in-the-loop gate       | Manual approval before proceeding                 |
| **Sub-Workflow**      | 🔀   | Execute nested workflows     | Modular workflow composition                      |
| **Swarm**             | 🐝   | Multi-agent orchestration    | Coordinate multiple AI agents                     |

---

### 🔧 AI Tool Nodes (5 nodes)

Specialized nodes that can be called by AI Agents as tools.

| Node                      | Icon | Description           | When Connected to AI Agent |
| ------------------------- | ---- | --------------------- | -------------------------- |
| **HTTP Request (Tool)**   | 🌐   | API calls as AI tool  | AI can make web requests   |
| **Text to Speech (Tool)** | 🔊   | Audio generation tool | AI can generate audio      |
| **Image Generation**      | 🎨   | Image creation tool   | AI can create images       |
| **Python Executor**       | 🐍   | Python execution tool | AI can run Python code     |
| **File System**           | 📁   | File operations tool  | AI can read/write files    |

---

### Tool-Callable Node Types

The AI Agent can call these node types as tools when connected:

```
codeExecutor, httpRequest, setVariable, ifElse, loopEach, switchNode,
delay, merge, textToSpeech, imageGeneration, pythonExecutor,
dataTransformer, vectorMemory, semanticRouter, evaluator, output,
webhookTrigger, browserEvent, speechToText
```

---

## 🔧 Expression Engine

Use expressions in node configurations for dynamic values:

```javascript
// Access input data
{
  {
    $input;
  }
} // Full input object
{
  {
    $input.name;
  }
} // Nested property
{
  {
    $input.items[0];
  }
} // Array access

// Built-in functions
{
  {
    $now();
  }
} // Current timestamp
{
  {
    $uuid();
  }
} // Generate UUID
{
  {
    $json($input);
  }
} // Stringify to JSON
{
  {
    $upper($input.text);
  }
} // Uppercase
{
  {
    $lower($input.text);
  }
} // Lowercase

// Math operations
{
  {
    $input.price * 1.1;
  }
} // Calculations
{
  {
    $input.total + 100;
  }
} // Addition
```

---

## ⚙️ Configuration

### AI Model Selection

Models are loaded on-demand. Available options in `modelStore.js`:

```javascript
const AVAILABLE_MODELS = [
  { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 2B", size: "1.4GB" },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi-3.5 Mini",
    size: "2.2GB",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 3B",
    size: "1.8GB",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B",
    size: "1.0GB",
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    name: "SmolLM 1.7B",
    size: "1.1GB",
  },
  {
    id: "DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC",
    name: "DeepSeek R1 1.5B",
    size: "1.0GB",
  },
];
```

### Environment Variables

No environment variables required—IOSANS is 100% client-side.

---

## 🔒 Privacy & Security

| Aspect               | Implementation                                 |
| -------------------- | ---------------------------------------------- |
| **AI Inference**     | 100% local via WebGPU—no API calls             |
| **Data Storage**     | IndexedDB in your browser                      |
| **Workflow Files**   | Saved locally or exported as JSON              |
| **Network Requests** | Only when you explicitly use HTTP Request node |
| **Artifacts**        | Stored in IndexedDB, persisted across sessions |

**Your data never leaves your device.**

---

## 🌐 Browser Compatibility

| Browser     | Support    | Notes                |
| ----------- | ---------- | -------------------- |
| Chrome 113+ | ✅ Full    | Recommended          |
| Edge 113+   | ✅ Full    | Chromium-based       |
| Safari 17+  | ⚠️ Partial | WebGPU experimental  |
| Firefox     | ❌ None    | WebGPU not supported |

---

## 🧪 Development

### Scripts

```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding a New Node

1. **Define type** in `src/utils/nodeTypes.js`
2. **Create component** in `src/nodes/{category}/`
3. **Add executor** in `src/engine/NodeExecutors.js`
4. **Create config** in `src/components/NodeConfig/configs/`
5. **Register** in `WorkflowEditor.jsx` and `NodeConfigPanel.jsx`
6. **Add to toolableTypes** in `ExecutionEngine.js` (if AI-callable)

---

## 📝 Keyboard Shortcuts

| Action              | Shortcut               |
| ------------------- | ---------------------- |
| Save Workflow       | `Ctrl + S`             |
| Run Workflow        | `Ctrl + Enter`         |
| Command Palette     | `Ctrl + K`             |
| Analytics Dashboard | `Shift + A`            |
| Delete Node         | `Backspace` / `Delete` |
| Copy Node           | `Ctrl + C`             |
| Paste Node          | `Ctrl + V`             |
| Duplicate Node      | `Ctrl + D`             |
| Zoom In/Out         | `Ctrl + +/-`           |
| Fit to Screen       | `Ctrl + 0`             |
| Pan Canvas          | `Space + Drag`         |

---

## 🔄 Recent Updates

### Execution Engine Improvements

- Loop nodes support `itemsPath` for array-based iteration
- If/Else supports 8 operators including `isEmpty`, `isNotEmpty`, `isTrue`, `isFalse`
- HTTP Request supports expression resolution in URL, headers, and body
- Evaluator retry state properly persists across iterations
- Execution IDs for artifact grouping

### Output & Artifact System

- Artifacts only created when output type is "artifact"
- Image preview in artifacts tab
- Delete artifact button with IndexedDB removal
- Proper ObjectURL caching and cleanup
- Safe JSON stringify with try/catch

### AI Agent Enhancements

- JSON-based tool calling via ReAct loop
- User message templates with input format detection
- 17 node types callable as tools
- Improved input data formatting for LLM

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for digital sovereignty**

[⬆ Back to Top](#iosans---infinite-open-source-automation-system)

</div>
