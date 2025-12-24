/**
 * BrowserToolkit
 * Browser API integrations for local-first AI capabilities
 * Provides access to File System, Clipboard, IndexedDB, and more
 */

// Tool registry
const BROWSER_TOOLS = {
  // File System Access API
  fileRead: {
    name: "Read File",
    description: "Read contents of a user-selected file",
    requiresPermission: true,
    handler: async (inputs) => {
      if (!("showOpenFilePicker" in window)) {
        throw new Error("File System Access API not supported");
      }

      const [fileHandle] = await window.showOpenFilePicker({
        types: inputs.types || [],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const contents = await file.text();

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        contents,
      };
    },
  },

  fileWrite: {
    name: "Write File",
    description: "Save content to a user-selected file",
    requiresPermission: true,
    handler: async (inputs) => {
      if (!("showSaveFilePicker" in window)) {
        throw new Error("File System Access API not supported");
      }

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: inputs.filename || "output.txt",
        types: [
          {
            description: inputs.description || "Text Files",
            accept: { "text/plain": [".txt"] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(inputs.content);
      await writable.close();

      return { success: true, filename: fileHandle.name };
    },
  },

  // Clipboard API
  clipboardRead: {
    name: "Read Clipboard",
    description: "Read text from clipboard",
    requiresPermission: true,
    handler: async () => {
      const text = await navigator.clipboard.readText();
      return { text };
    },
  },

  clipboardWrite: {
    name: "Write Clipboard",
    description: "Copy text to clipboard",
    requiresPermission: false,
    handler: async (inputs) => {
      await navigator.clipboard.writeText(inputs.text);
      return { success: true };
    },
  },

  // IndexedDB Storage
  storageGet: {
    name: "Get Storage",
    description: "Retrieve a value from local storage",
    requiresPermission: false,
    handler: async (inputs) => {
      const db = await openToolkitDB();
      const tx = db.transaction("keyvalue", "readonly");
      const store = tx.objectStore("keyvalue");
      const result = await promisifyRequest(store.get(inputs.key));
      return { key: inputs.key, value: result?.value || null };
    },
  },

  storageSet: {
    name: "Set Storage",
    description: "Store a value in local storage",
    requiresPermission: false,
    handler: async (inputs) => {
      const db = await openToolkitDB();
      const tx = db.transaction("keyvalue", "readwrite");
      const store = tx.objectStore("keyvalue");
      await promisifyRequest(
        store.put({ key: inputs.key, value: inputs.value })
      );
      return { success: true, key: inputs.key };
    },
  },

  // Fetch Wrapper
  httpFetch: {
    name: "HTTP Fetch",
    description: "Make an HTTP request",
    requiresPermission: false,
    handler: async (inputs) => {
      const { url, method = "GET", headers = {}, body } = inputs;

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = response.headers.get("content-type");
      let data;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data,
      };
    },
  },

  // WebGPU (basic detection & info)
  webgpuInfo: {
    name: "WebGPU Info",
    description: "Get WebGPU adapter information",
    requiresPermission: false,
    handler: async () => {
      if (!navigator.gpu) {
        return { supported: false, reason: "WebGPU not available" };
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: "No WebGPU adapter found" };
      }

      const info = await adapter.requestAdapterInfo();
      return {
        supported: true,
        vendor: info.vendor,
        architecture: info.architecture,
        description: info.description,
      };
    },
  },

  // Screenshot (Canvas-based)
  captureElement: {
    name: "Capture Element",
    description: "Capture an element as an image",
    requiresPermission: false,
    handler: async (inputs) => {
      const element = document.querySelector(inputs.selector);
      if (!element) {
        throw new Error(`Element not found: ${inputs.selector}`);
      }

      // Use html2canvas if available, otherwise return element info
      if (typeof html2canvas === "function") {
        const canvas = await html2canvas(element);
        return { dataUrl: canvas.toDataURL() };
      }

      return {
        error: "html2canvas not available",
        elementInfo: {
          tagName: element.tagName,
          width: element.offsetWidth,
          height: element.offsetHeight,
        },
      };
    },
  },
};

// IndexedDB helpers
let toolkitDB = null;

async function openToolkitDB() {
  if (toolkitDB) return toolkitDB;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BrowserToolkit", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      toolkitDB = request.result;
      resolve(toolkitDB);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("keyvalue")) {
        db.createObjectStore("keyvalue", { keyPath: "key" });
      }
    };
  });
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * BrowserToolkit - Main class for browser tool access
 */
class BrowserToolkit {
  constructor() {
    this.name = "BrowserToolkit";
    this.tools = BROWSER_TOOLS;
  }

  /**
   * Get list of available tools
   */
  getAvailableTools() {
    return Object.entries(this.tools).map(([id, tool]) => ({
      id,
      name: tool.name,
      description: tool.description,
      requiresPermission: tool.requiresPermission,
    }));
  }

  /**
   * Execute a tool
   * @param {string} toolId - The tool identifier
   * @param {Object} inputs - Tool inputs
   * @param {Object} context - Execution context
   */
  async execute(toolId, inputs = {}, context = {}) {
    const tool = this.tools[toolId];

    if (!tool) {
      throw new Error(`Unknown tool: ${toolId}`);
    }

    this.log(context, "info", `🔧 Executing: ${tool.name}`);

    try {
      const result = await tool.handler(inputs);
      this.log(context, "success", `✅ ${tool.name} completed`);
      return result;
    } catch (error) {
      this.log(context, "error", `❌ ${tool.name} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check browser capabilities
   */
  checkCapabilities() {
    return {
      fileSystemAccess: "showOpenFilePicker" in window,
      clipboard: "clipboard" in navigator,
      indexedDB: "indexedDB" in window,
      webGPU: "gpu" in navigator,
      serviceWorker: "serviceWorker" in navigator,
    };
  }

  /**
   * Generate tool schemas for AI agent
   */
  generateToolSchemas() {
    return Object.entries(this.tools).map(([id, tool]) => ({
      nodeId: `browser_${id}`,
      name: tool.name,
      type: "browserTool",
      description: tool.description,
      inputSchema: { input: "any" },
    }));
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "BrowserToolkit",
        message,
        data,
      });
    }
  }
}

// Singleton
const browserToolkit = new BrowserToolkit();
export default browserToolkit;

export { BrowserToolkit, BROWSER_TOOLS };
