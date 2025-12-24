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

      // Available models - organized by size and capability
      // IMPORTANT: These IDs must match WebLLM's prebuiltAppConfig exactly
      availableModels: [
        // === Recommended (Small & Fast) ===
        {
          id: "gemma-2-2b-it-q4f16_1-MLC",
          name: "Gemma 2 2B",
          size: "~1.4GB",
          vramRequired: 2.0, // GB of VRAM required
          description: "Google's fast, lightweight model (Recommended)",
          category: "recommended",
        },
        {
          id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          name: "Qwen 2.5 1.5B",
          size: "~1GB",
          vramRequired: 1.5,
          description: "Alibaba's efficient small model",
          category: "recommended",
        },
        {
          id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
          name: "SmolLM2 1.7B",
          size: "~1.1GB",
          vramRequired: 1.8,
          description: "HuggingFace's compact model",
          category: "recommended",
        },

        // === Gemma 2 Models ===
        {
          id: "gemma-2-2b-it-q4f32_1-MLC",
          name: "Gemma 2 2B (F32)",
          size: "~2.5GB",
          vramRequired: 3.0,
          description: "Higher precision Gemma 2",
          category: "gemma",
        },
        {
          id: "gemma-2-9b-it-q4f16_1-MLC",
          name: "Gemma 2 9B",
          size: "~6GB",
          vramRequired: 8.0,
          description: "Larger Gemma 2 with better reasoning",
          category: "gemma",
        },
        {
          id: "gemma-2-2b-jpn-it-q4f16_1-MLC",
          name: "Gemma 2 2B Japanese",
          size: "~1.4GB",
          vramRequired: 2.0,
          description: "Japanese-optimized Gemma 2",
          category: "gemma",
        },

        // === Qwen 3 Models ===
        {
          id: "Qwen3-0.6B-q4f16_1-MLC",
          name: "Qwen 3 0.6B",
          size: "~400MB",
          vramRequired: 0.8,
          description: "Ultra-light Qwen 3 - instant responses",
          category: "qwen3",
        },
        {
          id: "Qwen3-1.7B-q4f16_1-MLC",
          name: "Qwen 3 1.7B",
          size: "~1.1GB",
          vramRequired: 1.8,
          description: "Fast Qwen 3 with hybrid thinking",
          category: "qwen3",
        },
        {
          id: "Qwen3-4B-q4f16_1-MLC",
          name: "Qwen 3 4B",
          size: "~2.5GB",
          vramRequired: 3.5,
          description: "Balanced Qwen 3 for most tasks",
          category: "qwen3",
        },
        {
          id: "Qwen3-8B-q4f16_1-MLC",
          name: "Qwen 3 8B",
          size: "~5GB",
          vramRequired: 6.5,
          description: "Advanced Qwen 3 with deep reasoning",
          category: "qwen3",
        },

        // === Qwen 2.5 Models ===
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
          id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
          name: "Llama 3.2 1B",
          size: "~900MB",
          description: "Meta's fast tiny model",
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
          id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
          name: "SmolLM2 360M",
          size: "~250MB",
          description: "Smallest practical model",
          category: "tiny",
        },
        {
          id: "SmolLM2-135M-Instruct-q0f16-MLC",
          name: "SmolLM2 135M",
          size: "~150MB",
          description: "Tiny model for simple tasks",
          category: "tiny",
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
          (m) => (m.vramRequired || 1.0) <= availableVRAMGB
        );
      },

      // Check if a model can run with available VRAM
      canLoadModel: (modelId, availableVRAMGB) => {
        const { availableModels } = get();
        const model = availableModels.find((m) => m.id === modelId);
        if (!model) return false;
        return (model.vramRequired || 1.0) <= availableVRAMGB;
      },

      // Get VRAM status indicator
      getVRAMStatus: (modelId, detectedVRAMGB) => {
        const { availableModels } = get();
        const model = availableModels.find((m) => m.id === modelId);
        if (!model) return { status: "unknown", message: "Model not found" };

        const required = model.vramRequired || 1.0;
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
