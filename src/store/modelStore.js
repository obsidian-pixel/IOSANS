/**
 * Model State Store - Zustand
 * Manages WebLLM model loading state, downloads, and settings
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useModelStore = create(
  persist(
    (set, get) => ({
      // Model state
      status: "idle", // idle, loading, ready, error
      currentModelId: null,
      loadProgress: 0,
      loadingText: "",
      errorMessage: null,

      // Download tracking per model
      downloadedModels: [], // Array of downloaded model IDs
      downloadProgress: {}, // { modelId: { progress: 0-100, status: 'downloading'|'complete'|'error' } }
      downloadQueue: [], // Queue of models to download
      isDownloading: false,

      // Available models - Capability-Based Registry (Sovereign Schema)
      // IMPORTANT: These IDs must match WebLLM's prebuiltAppConfig exactly
      availableModels: [
        // === MULTIMODAL (Vision) ===
        {
          id: "Llama-3.2-11B-Vision-Instruct-q4f16_1-MLC",
          name: "Llama 3.2 Vision (11B)",
          type: "multimodal",
          capabilities: ["vision", "reasoning", "tool_use"],
          vram: 8.5,
          size: "~6.5GB",
          description: "Gold standard for vision tasks and complex reasoning.",
          tags: ["Vision", "High-Perf"],
        },
        {
          id: "Llama-3.2-90B-Vision-Instruct-q4f16_1-MLC",
          name: "Llama 3.2 Vision (90B)",
          type: "multimodal",
          capabilities: ["vision", "reasoning", "tool_use"],
          vram: 48,
          size: "~50GB",
          description: "Largest vision model - requires high-end GPU.",
          tags: ["Vision", "Ultra"],
        },
        {
          id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
          name: "Phi-3.5 Vision",
          type: "multimodal",
          capabilities: ["vision", "reasoning"],
          vram: 4.5,
          size: "~3GB",
          description: "Compact vision model for lower VRAM systems.",
          tags: ["Vision", "Fast"],
        },

        // === REASONING (General Text) ===
        {
          id: "gemma-2-2b-it-q4f16_1-MLC",
          name: "Gemma 2 2B",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 2.0,
          size: "~1.4GB",
          description: "Google's fast, lightweight model (Recommended).",
          tags: ["Fast", "Recommended"],
        },
        {
          id: "gemma-2-9b-it-q4f16_1-MLC",
          name: "Gemma 2 9B",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 8.0,
          size: "~6GB",
          description: "Larger Gemma 2 with better reasoning.",
          tags: ["High-Perf"],
        },
        {
          id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          name: "Qwen 2.5 1.5B",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 1.5,
          size: "~1GB",
          description: "Alibaba's efficient small model.",
          tags: ["Fast", "Recommended"],
        },
        {
          id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
          name: "Qwen 2.5 3B",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 2.5,
          size: "~2GB",
          description: "Balanced Qwen with good reasoning.",
          tags: ["Balanced"],
        },
        {
          id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
          name: "Qwen 2.5 7B",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 5.0,
          size: "~4.5GB",
          description: "Powerful Qwen for complex tasks.",
          tags: ["High-Perf"],
        },
        {
          id: "Qwen3-0.6B-q4f16_1-MLC",
          name: "Qwen 3 0.6B",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 0.8,
          size: "~400MB",
          description: "Ultra-light Qwen 3 - instant responses.",
          tags: ["Tiny", "Fast"],
        },
        {
          id: "Qwen3-1.7B-q4f16_1-MLC",
          name: "Qwen 3 1.7B",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 1.8,
          size: "~1.1GB",
          description: "Fast Qwen 3 with hybrid thinking.",
          tags: ["Fast"],
        },
        {
          id: "Qwen3-4B-q4f16_1-MLC",
          name: "Qwen 3 4B",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 3.5,
          size: "~2.5GB",
          description: "Balanced Qwen 3 for most tasks.",
          tags: ["Balanced"],
        },
        {
          id: "Qwen3-8B-q4f16_1-MLC",
          name: "Qwen 3 8B",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 6.5,
          size: "~5GB",
          description: "Advanced Qwen 3 with deep reasoning.",
          tags: ["High-Perf"],
        },
        {
          id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
          name: "Llama 3.2 3B",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 2.5,
          size: "~2GB",
          description: "Meta's capable small model.",
          tags: ["Balanced"],
        },
        {
          id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
          name: "Llama 3.2 1B",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 1.2,
          size: "~900MB",
          description: "Meta's fast tiny model.",
          tags: ["Tiny", "Fast"],
        },
        {
          id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
          name: "Mistral 7B v0.3",
          type: "text",
          capabilities: ["reasoning", "chat", "tool_use"],
          vram: 5.0,
          size: "~4.5GB",
          description: "Mistral AI's flagship model.",
          tags: ["High-Perf"],
        },
        {
          id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
          name: "Phi-3.5 Mini",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 2.8,
          size: "~2.4GB",
          description: "Microsoft's balanced 3.8B model.",
          tags: ["Balanced"],
        },
        {
          id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
          name: "SmolLM2 1.7B",
          type: "text",
          capabilities: ["reasoning", "chat"],
          vram: 1.8,
          size: "~1.1GB",
          description: "HuggingFace's compact model.",
          tags: ["Fast", "Recommended"],
        },
        {
          id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
          name: "SmolLM2 360M",
          type: "text",
          capabilities: ["chat"],
          vram: 0.5,
          size: "~250MB",
          description: "Smallest practical model.",
          tags: ["Tiny"],
        },

        // === CODING ===
        {
          id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
          name: "Qwen 2.5 Coder 1.5B",
          type: "coding",
          capabilities: ["python", "javascript", "coding"],
          vram: 1.5,
          size: "~1GB",
          description: "Optimized for code generation.",
          tags: ["Coding", "Fast"],
        },
        {
          id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",
          name: "Qwen 2.5 Coder 7B",
          type: "coding",
          capabilities: ["python", "javascript", "coding", "tool_use"],
          vram: 5.2,
          size: "~4.5GB",
          description: "Advanced coding assistant.",
          tags: ["Coding", "High-Perf"],
        },
      ],

      // Actions
      setStatus: (status) => set({ status }),

      setLoading: (progress, text) => {
        set({
          status: "loading",
          loadProgress: progress,
          loadingText: text,
        });
      },

      setReady: (modelId) => {
        const { downloadedModels } = get();
        const newDownloaded = downloadedModels.includes(modelId)
          ? downloadedModels
          : [...downloadedModels, modelId];
        set({
          status: "ready",
          currentModelId: modelId,
          loadProgress: 1,
          loadingText: "",
          errorMessage: null,
          downloadedModels: newDownloaded,
        });
      },

      setError: (message) => {
        set({
          status: "error",
          errorMessage: message,
          loadProgress: 0,
          loadingText: "",
        });
      },

      reset: () => {
        set({
          status: "idle",
          currentModelId: null,
          loadProgress: 0,
          loadingText: "",
          errorMessage: null,
        });
      },

      // Download management
      addToDownloadQueue: (modelId) => {
        const { downloadQueue, downloadedModels } = get();
        if (
          !downloadQueue.includes(modelId) &&
          !downloadedModels.includes(modelId)
        ) {
          set({ downloadQueue: [...downloadQueue, modelId] });
        }
      },

      removeFromQueue: (modelId) => {
        const { downloadQueue } = get();
        set({ downloadQueue: downloadQueue.filter((id) => id !== modelId) });
      },

      setDownloadProgress: (modelId, progress, status = "downloading") => {
        const { downloadProgress } = get();
        set({
          downloadProgress: {
            ...downloadProgress,
            [modelId]: { progress, status },
          },
        });
      },

      markDownloaded: (modelId) => {
        const { downloadedModels, downloadProgress, downloadQueue } = get();
        if (!downloadedModels.includes(modelId)) {
          set({
            downloadedModels: [...downloadedModels, modelId],
            downloadProgress: {
              ...downloadProgress,
              [modelId]: { progress: 100, status: "complete" },
            },
            downloadQueue: downloadQueue.filter((id) => id !== modelId),
          });
        }
      },

      isModelDownloaded: (modelId) => {
        return get().downloadedModels.includes(modelId);
      },

      getDownloadStatus: (modelId) => {
        const { downloadProgress, downloadedModels } = get();
        if (downloadedModels.includes(modelId)) {
          return { progress: 100, status: "complete" };
        }
        return downloadProgress[modelId] || { progress: 0, status: "idle" };
      },

      // Getters
      isReady: () => get().status === "ready",
      isLoading: () => get().status === "loading",
      getDownloadedModels: () => {
        const { availableModels, downloadedModels } = get();
        return availableModels.filter((m) => downloadedModels.includes(m.id));
      },

      // VRAM-aware model helpers
      getModelsForVRAM: (availableVRAMGB) => {
        const { availableModels } = get();
        return availableModels.filter(
          (m) => (m.vram || 1.0) <= availableVRAMGB
        );
      },

      // Check if a model can run with available VRAM
      canLoadModel: (modelId, availableVRAMGB) => {
        const { availableModels } = get();
        const model = availableModels.find((m) => m.id === modelId);
        if (!model) return false;
        return (model.vram || 1.0) <= availableVRAMGB;
      },

      // Get VRAM status indicator
      getVRAMStatus: (modelId, detectedVRAMGB) => {
        const { availableModels } = get();
        const model = availableModels.find((m) => m.id === modelId);
        if (!model) return { status: "unknown", message: "Model not found" };

        const required = model.vram || 1.0;
        const ratio = detectedVRAMGB / required;

        if (ratio >= 1.5)
          return {
            status: "excellent",
            color: "#10b981",
            message: "Plenty of VRAM",
          };
        if (ratio >= 1.0)
          return {
            status: "good",
            color: "#22c55e",
            message: "Should work well",
          };
        if (ratio >= 0.8)
          return { status: "tight", color: "#f59e0b", message: "May be slow" };
        return {
          status: "insufficient",
          color: "#ef4444",
          message: "Not enough VRAM",
        };
      },

      // === NEW: Capability-Based Filters ===

      // Get models that have a specific capability
      getModelsForCapability: (capability) => {
        const { availableModels } = get();
        return availableModels.filter((m) =>
          m.capabilities?.includes(capability)
        );
      },

      // Get models by type (text, coding, multimodal)
      getModelsForType: (type) => {
        const { availableModels } = get();
        return availableModels.filter((m) => m.type === type);
      },

      // Get models with a specific tag
      getModelsWithTag: (tag) => {
        const { availableModels } = get();
        return availableModels.filter((m) => m.tags?.includes(tag));
      },

      // Auto-Fit: Get best model for VRAM and capability
      autoFitModel: (detectedVRAMGB, requiredCapability = "reasoning") => {
        const { availableModels } = get();
        const compatible = availableModels.filter(
          (m) =>
            (m.vram || 1.0) <= detectedVRAMGB &&
            m.capabilities?.includes(requiredCapability)
        );
        // Sort by VRAM descending (best quality that fits)
        compatible.sort((a, b) => (b.vram || 0) - (a.vram || 0));
        return compatible[0] || null;
      },
    }),
    {
      name: "sauvrn-models",
      partialize: (state) => ({
        downloadedModels: state.downloadedModels,
        currentModelId: state.currentModelId,
      }),
    }
  )
);

export default useModelStore;
