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
- **22+ Node Types**: Comprehensive library across 4 categories
- **Smart Connection Validation**: Prevents invalid node connections
- **MiniMap**: Bird's-eye view for complex workflows
- **Context Menus**: Right-click actions for quick operations
- **Keyboard Shortcuts**: Full keyboard navigation (Ctrl+S, Ctrl+D, etc.)
- **4-Axis Port System**: Diamond handles for resources, circles for data flow

### 🤖 Local AI (WebLLM)

- **100% Browser-Based**: All inference runs locally via WebGPU
- **Multiple Models**: Gemma 2, Phi-3.5, Llama 3.2, Qwen 3, SmolLM
- **Zero Data Leakage**: Your prompts never leave your device
- **JSON-Mode Tool Calling**: AI Agent executes connected tool nodes via structured JSON
- **Two-Pass Execution**: Tools return results to LLM for final answer (max 5 iterations)
- **Conversation Memory**: Maintain context across interactions
- **VRAM-Aware Selection**: Models show VRAM requirements

### 🔄 Workflow Execution

- **Real-Time Graph Traversal**: Visual execution highlighting
- **Loop Control**: Iteration-based and array-based looping
- **Conditional Branching**: If/Else and Switch routing
- **Error Handling**: Error triggers with retry logic
- **Artifact Storage**: All outputs saved to IndexedDB
- **Edge Status Feedback**: Pulse animation during active execution

### 🎯 Agentic Patterns

- **SemanticRouterNode**: Route input via keyword/LLM classification
- **EvaluatorNode**: Schema/regex validation with self-correction loops
- **MergeNode**: Wait-for-all or first-to-complete aggregation modes
- **Dynamic Ports**: Nodes with variable input/output handles

### 🧠 Advanced Features

- **Vector Memory**: Semantic search with local embeddings
- **Text-to-Speech**: Web Speech API integration
- **Human-in-the-Loop**: Approval gates for critical actions
- **Sub-Workflows**: Modular, reusable workflow components
- **Python Executor**: Run Python via Pyodide in-browser
- **Auto-Detect Types**: Intelligent MIME detection for Blob/JSON/audio/HTML

### 🛠️ Developer Tools

- **Command Palette (Ctrl+K)**: Quick node insertion with fuzzy search
- **Run Step Debugging**: Execute individual nodes in isolation with mock data
- **CDN Library Injector**: Load npm packages (Lodash, Axios, Day.js) from CDN
- **GPU Hardware Detection**: WebGPU tier badges on AI nodes
- **Execution Analytics (Shift+A)**: Performance metrics and slowest nodes
- **Ghost Data Debugging**: Hover edges to see last payload snapshot
- **Monaco Editor**: CDN-loaded syntax highlighting for code nodes

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
│   │   ├── ExecutionPanel/   # Logs and execution output
│   │   ├── AIControls/       # AI Overseer chat panel
│   │   ├── Onboarding/       # Tutorial & onboarding tour
│   │   └── LoadingOverlay/   # Model loading states
│   │
│   ├── nodes/                # Custom React Flow node components
│   │   ├── base/             # BaseNode wrapper with handles
│   │   ├── triggers/         # ManualTrigger, Schedule, Webhook, etc.
│   │   ├── actions/          # HTTP, Code, Output, FileSystem, etc.
│   │   ├── logic/            # IfElse, Loop, Switch, Merge
│   │   └── ai/               # AIAgent, VectorMemory, TTS, etc.
│   │
│   ├── store/                # Zustand state stores
│   │   ├── workflowStore.js  # Nodes, edges, selection
│   │   ├── executionStore.js # Execution state, logs, artifacts
│   │   └── modelStore.js     # WebLLM model management
│   │
│   ├── engine/               # Workflow execution engine
│   │   ├── ExecutionEngine.js    # Graph traversal & node execution
│   │   ├── NodeExecutors.js      # Per-node execution logic
│   │   └── WebLLMService.js      # LLM inference service
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

### Triggers (5 nodes)

| Node                 | Icon | Description                         |
| -------------------- | ---- | ----------------------------------- |
| **Manual Trigger**   | ▶️   | Start workflow on button click      |
| **Schedule Trigger** | ⏰   | CRON-based scheduled execution      |
| **Webhook Trigger**  | 🔗   | HTTP endpoint for external triggers |
| **Error Trigger**    | ⚠️   | Catch errors from other nodes       |
| **Browser Event**    | 🌐   | Trigger on DOM/browser events       |

### Actions (6 nodes)

| Node              | Icon | Description                                       |
| ----------------- | ---- | ------------------------------------------------- |
| **Output**        | 📤   | Display/save workflow results (auto-detect types) |
| **HTTP Request**  | 🌐   | External API calls                                |
| **Code Executor** | 💻   | JavaScript with Monaco editor                     |
| **Set Variable**  | 📝   | Data transformation                               |
| **File System**   | 📁   | Local file read/write                             |
| **Local Storage** | 💾   | IndexedDB/localStorage operations                 |

### Logic (7 nodes)

| Node               | Icon | Description                                   |
| ------------------ | ---- | --------------------------------------------- |
| **If/Else**        | 🔀   | Conditional branching                         |
| **Loop**           | 🔄   | Iteration control (count or array)            |
| **Switch**         | 🔃   | Multi-path routing                            |
| **Merge**          | 🔗   | Wait-for-all or first-to-complete aggregation |
| **Group**          | 📦   | Collapsible container for nodes               |
| **SemanticRouter** | 🧭   | AI-powered intent classification              |
| **Evaluator**      | 🔍   | Schema/regex validation with retry            |

### AI (7 nodes)

| Node                  | Icon | Description                   |
| --------------------- | ---- | ----------------------------- |
| **AI Agent**          | 🤖   | WebLLM with JSON tool calling |
| **Vector Memory**     | 🧠   | Semantic storage & retrieval  |
| **Wait for Approval** | ✋   | Human-in-the-loop gates       |
| **Sub-Workflow**      | 🔀   | Execute nested workflows      |
| **Text to Speech**    | 🔊   | Audio synthesis               |
| **Image Generation**  | 🎨   | AI image creation             |
| **Python Executor**   | 🐍   | Run Python via Pyodide        |

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
