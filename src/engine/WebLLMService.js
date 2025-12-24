/**
 * WebLLM Service - Browser-based LLM inference via Web Worker
 * Uses a Web Worker to prevent UI blocking during inference
 */

// Available models - organized by size and capability
export const AVAILABLE_MODELS = [
  // === Recommended (Small & Fast) ===
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    name: "Gemma 2 2B",
    size: "~1.4GB",
    description: "Google's fast, lightweight model (Recommended)",
    category: "recommended",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B",
    size: "~1GB",
    description: "Alibaba's efficient small model",
    category: "recommended",
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    name: "SmolLM2 1.7B",
    size: "~1.1GB",
    description: "HuggingFace's compact model",
    category: "recommended",
  },

  // === Qwen Models ===
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 0.5B",
    size: "~350MB",
    description: "Ultra-light Qwen for basic tasks",
    category: "qwen",
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 3B",
    size: "~2GB",
    description: "Balanced Qwen with good reasoning",
    category: "qwen",
  },
  {
    id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 7B",
    size: "~4.5GB",
    description: "Powerful Qwen for complex tasks",
    category: "qwen",
  },
  {
    id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 Coder 1.5B",
    size: "~1GB",
    description: "Optimized for code generation",
    category: "qwen",
  },
  {
    id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 Coder 7B",
    size: "~4.5GB",
    description: "Advanced coding assistant",
    category: "qwen",
  },

  // === Medium Models ===
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi-3.5 Mini",
    size: "~2.4GB",
    description: "Microsoft's balanced 3.8B model",
    category: "medium",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 3B",
    size: "~2GB",
    description: "Meta's capable small model",
    category: "medium",
  },
  {
    id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
    name: "Mistral 7B v0.3",
    size: "~4.5GB",
    description: "Mistral AI's flagship model",
    category: "medium",
  },

  // === Tiny Models (Ultra-fast) ===
  {
    id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",
    name: "TinyLlama 1.1B",
    size: "~700MB",
    description: "Ultra-fast for simple tasks",
    category: "tiny",
  },
  {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    name: "SmolLM2 360M",
    size: "~250MB",
    description: "Smallest practical model",
    category: "tiny",
  },
];

class WebLLMService {
  constructor() {
    this.worker = null;
    this.isLoading = false;
    this.isReady = false;
    this.currentModel = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * Check if WebGPU is available
   */
  static async checkWebGPUSupport() {
    if (!navigator.gpu) {
      return {
        supported: false,
        reason: "WebGPU not available in this browser",
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: "No WebGPU adapter found" };
      }
      return { supported: true, adapter };
    } catch (error) {
      return { supported: false, reason: error.message };
    }
  }

  /**
   * Download model in background (using temporary worker)
   * This downloads files to cache without replacing the active model
   */
  async downloadModel(modelId, onProgress = null) {
    return new Promise((resolve, reject) => {
      // Create temporary worker
      const tempWorker = new Worker(
        new URL("./webllm.worker.js", import.meta.url),
        {
          type: "module",
        }
      );

      const messageId = this.getNextMessageId();

      tempWorker.onmessage = (event) => {
        const { type, id, progress, text, error } = event.data;

        if (id !== messageId && type !== "INIT_PROGRESS") return;

        switch (type) {
          case "INIT_PROGRESS":
            // Only report progress, ignore text unless it's an error
            if (onProgress) {
              onProgress({ progress, text });
            }
            break;
          case "INIT_COMPLETE":
            // Download and load finished (now cached)
            tempWorker.terminate();
            resolve(true);
            break;
          case "ERROR":
            tempWorker.terminate();
            reject(new Error(error));
            break;
        }
      };

      tempWorker.onerror = (error) => {
        tempWorker.terminate();
        reject(error);
      };

      // Send init message (triggers download)
      tempWorker.postMessage({
        type: "INIT",
        id: messageId,
        payload: { modelId },
      });
    });
  }

  /**
   * Initialize the worker and load model
   */
  async initialize(modelId = AVAILABLE_MODELS[0].id, onProgress = null) {
    if (this.isLoading) {
      throw new Error("Model is already loading");
    }

    this.isLoading = true;

    return new Promise((resolve, reject) => {
      // Create worker
      this.worker = new Worker(new URL("./webllm.worker.js", import.meta.url), {
        type: "module",
      });

      const messageId = this.getNextMessageId();

      this.worker.onmessage = (event) => {
        const { type, id, progress, text, timeElapsed, error } = event.data;

        if (id !== messageId && type !== "INIT_PROGRESS") return;

        switch (type) {
          case "INIT_PROGRESS":
            if (onProgress) {
              onProgress({ progress, text, timeElapsed });
            }
            break;
          case "INIT_COMPLETE":
            this.isReady = true;
            this.isLoading = false;
            this.currentModel = modelId;
            resolve(true);
            break;
          case "ERROR":
            this.isLoading = false;
            reject(new Error(error));
            break;
        }
      };

      this.worker.onerror = (error) => {
        this.isLoading = false;
        reject(error);
      };

      // Send init message
      this.worker.postMessage({
        type: "INIT",
        id: messageId,
        payload: { modelId },
      });
    });
  }

  /**
   * Generate a response (non-blocking via worker)
   * @param {string} userMessage - The user's input
   * @param {Array} history - Conversation history
   * @param {Object} options - Generation options
   * @param {Function} onToken - Optional callback for streaming tokens
   */
  async generateWithHistory(
    userMessage,
    history = [],
    options = {},
    onToken = null
  ) {
    if (!this.isReady || !this.worker) {
      throw new Error("Model not loaded");
    }

    // Default to 4096 tokens to prevent infinite loops (was 4M!)
    const { maxTokens = 4096, temperature = 1, systemPrompt = "" } = options;
    const messageId = this.getNextMessageId();
    const streaming = !!onToken;

    return new Promise((resolve, reject) => {
      // Safety timeout: If no response within 60s, assume worker died
      const timeoutId = setTimeout(() => {
        this.worker.removeEventListener("message", handler);
        reject(new Error("Model generation timed out (worker unresponsive)"));
      }, 60000);

      const handler = (event) => {
        const { type, id, text, token, error } = event.data;

        if (id !== messageId) return;

        // Reset timeout on activity
        if (type === "GENERATE_TOKEN" || type === "GENERATE_COMPLETE") {
          clearTimeout(timeoutId);
        }

        switch (type) {
          case "GENERATE_TOKEN":
            if (onToken) {
              onToken(token, text);
            }
            break;
          case "GENERATE_COMPLETE":
            this.worker.removeEventListener("message", handler);
            resolve(text);
            break;
          case "ERROR":
            this.worker.removeEventListener("message", handler);
            clearTimeout(timeoutId);
            reject(new Error(error));
            break;
        }
      };

      this.worker.addEventListener("message", handler);

      this.worker.postMessage({
        type: "GENERATE",
        id: messageId,
        payload: {
          userMessage,
          history,
          maxTokens,
          temperature,
          systemPrompt,
          streaming,
        },
      });
    });
  }

  /**
   * Reset conversation context
   */
  async resetChat() {
    if (!this.worker) return;

    const messageId = this.getNextMessageId();
    this.worker.postMessage({ type: "RESET", id: messageId });
  }

  /**
   * Unload and terminate worker
   */
  async unload() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.currentModel = null;
    }
  }

  getNextMessageId() {
    return ++this.messageId;
  }
}

// Singleton instance
const webLLMService = new WebLLMService();
export default webLLMService;
