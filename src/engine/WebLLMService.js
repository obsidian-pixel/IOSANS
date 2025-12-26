/**
 * WebLLM Service - Browser-based LLM inference via Web Worker
 * Uses a Web Worker to prevent UI blocking during inference
 */

// Model registry is now centralized in modelStore.js
// Import it there if you need the list:
// import useModelStore from '../store/modelStore';
// const models = useModelStore.getState().availableModels;

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
  async initialize(modelId, onProgress = null) {
    if (!modelId) {
      throw new Error(
        "Model ID is required. Get models from modelStore.availableModels."
      );
    }
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
      // Safety timeout: If no activity within 60s, assume worker died
      // This is reset on each token for streaming responses
      let timeoutId;
      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          this.worker.removeEventListener("message", handler);
          reject(new Error("Model generation timed out (worker unresponsive)"));
        }, 60000);
      };
      resetTimeout(); // Initial start

      const handler = (event) => {
        const { type, id, text, token, error } = event.data;

        if (id !== messageId) return;

        switch (type) {
          case "GENERATE_TOKEN":
            // Reset timeout on each token - generation is still active
            resetTimeout();
            if (onToken) {
              onToken(token, text);
            }
            break;
          case "GENERATE_COMPLETE":
            clearTimeout(timeoutId);
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
