/**
 * ModelSwitcher Component
 * Model download manager and switcher UI
 */
import { memo, useState } from "react";
import useModelStore from "../../store/modelStore";
import "./ModelSwitcher.css";

function ModelSwitcher({ isOpen, onClose }) {
  const [activeCategory, setActiveCategory] = useState("all");

  const availableModels = useModelStore((state) => state.availableModels);
  const currentModel = useModelStore((state) => state.currentModelId);
  const status = useModelStore((state) => state.status);
  const loadProgress = useModelStore((state) => state.loadProgress);
  const downloadedModels = useModelStore((state) => state.downloadedModels);
  const downloadProgress = useModelStore((state) => state.downloadProgress);
  const setDownloadProgress = useModelStore(
    (state) => state.setDownloadProgress
  );

  const handleDownloadModel = (modelId) => {
    // Mark as downloading and dispatch event to trigger WebLLM load
    setDownloadProgress(modelId, 5, "downloading");

    // Dispatch event - App.jsx handles actual WebLLM loading/caching
    window.dispatchEvent(
      new CustomEvent("downloadModel", {
        detail: { modelId },
      })
    );

    // Keep modal open so user can see progress bar
  };

  const handleLoadModel = async (modelId) => {
    // Dispatch event to load this model
    window.dispatchEvent(new CustomEvent("loadModel", { detail: { modelId } }));
    onClose();
  };

  const handleRemoveModel = async (modelId) => {
    // Remove model from WebLLM cache
    try {
      // Clear from Cache API
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        if (key.includes("webllm") || key.includes("mlc")) {
          const cache = await caches.open(key);
          const requests = await cache.keys();
          for (const req of requests) {
            if (req.url.includes(modelId)) {
              await cache.delete(req);
            }
          }
        }
      }

      // Remove from store
      const store = useModelStore.getState();
      const updated = store.downloadedModels.filter((id) => id !== modelId);
      useModelStore.setState({ downloadedModels: updated });

      console.log(`Removed model: ${modelId}`);
    } catch (error) {
      console.error("Failed to remove model:", error);
    }
  };

  const handleClearAllCache = async () => {
    if (!confirm("This will remove ALL downloaded models. Continue?")) return;

    try {
      // Clear all WebLLM/MLC caches
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        if (
          key.includes("webllm") ||
          key.includes("mlc") ||
          key.includes("huggingface")
        ) {
          await caches.delete(key);
        }
      }

      // Clear IndexedDB for WebLLM
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name?.includes("webllm") || db.name?.includes("mlc")) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      // Clear store
      useModelStore.setState({
        downloadedModels: [],
        downloadProgress: {},
        currentModelId: null,
        status: "idle",
      });

      localStorage.removeItem("selectedModel");
      console.log("All model caches cleared");
      alert("All models removed. Refresh the page to start fresh.");
    } catch (error) {
      console.error("Failed to clear cache:", error);
      alert("Failed to clear some caches. Try clearing browser data manually.");
    }
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "recommended", label: "⭐ Recommended" },
    { id: "downloaded", label: "✅ Downloaded" },
    { id: "gemma", label: "🔷 Gemma 3" },
    { id: "qwen3", label: "🔶 Qwen 3" },
    { id: "qwen", label: "Qwen 2.5" },
    { id: "medium", label: "Medium" },
    { id: "tiny", label: "Tiny" },
  ];

  const filteredModels = availableModels.filter((model) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "downloaded") {
      return downloadedModels.includes(model.id);
    }
    return model.category === activeCategory;
  });

  const getModelStatus = (modelId) => {
    if (currentModel === modelId && status === "ready") return "active";
    if (downloadedModels.includes(modelId)) return "downloaded";
    if (downloadProgress[modelId]?.status === "downloading")
      return "downloading";
    return "available";
  };

  if (!isOpen) return null;

  return (
    <div className="model-switcher-overlay" onClick={onClose}>
      <div className="model-switcher" onClick={(e) => e.stopPropagation()}>
        <header className="ms-header">
          <h2>📦 Model Manager</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* Category tabs */}
        <div className="ms-categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-btn ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
              {cat.id === "downloaded" && downloadedModels.length > 0 && (
                <span className="cat-badge">{downloadedModels.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="ms-content">
          {/* Current model status */}
          {currentModel && (
            <div className="current-model-banner">
              <span className="banner-icon">🤖</span>
              <span className="banner-text">
                Active:{" "}
                {availableModels.find((m) => m.id === currentModel)?.name}
              </span>
              <span className={`banner-status ${status}`}>
                {status === "ready"
                  ? "✅ Ready"
                  : status === "loading"
                  ? `⏳ ${Math.round(loadProgress * 100)}%`
                  : ""}
              </span>
            </div>
          )}

          {/* Models grid */}
          <div className="models-grid">
            {filteredModels.map((model) => {
              const modelStatus = getModelStatus(model.id);
              const progress = downloadProgress[model.id]?.progress || 0;

              return (
                <div key={model.id} className={`model-card ${modelStatus}`}>
                  <div className="model-card-header">
                    <span className="model-name">{model.name}</span>
                    <span className="model-size">{model.size}</span>
                  </div>

                  <p className="model-desc">{model.description}</p>

                  {modelStatus === "downloading" && (
                    <div className="download-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{progress}%</span>
                    </div>
                  )}

                  <div className="model-actions">
                    {modelStatus === "active" && (
                      <span className="status-badge active">✓ Active</span>
                    )}
                    {modelStatus === "downloaded" && (
                      <button
                        className="btn-load"
                        onClick={() => handleLoadModel(model.id)}
                      >
                        🚀 Load
                      </button>
                    )}
                    {modelStatus === "available" && (
                      <button
                        className="btn-download"
                        onClick={() => handleDownloadModel(model.id)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    {modelStatus === "downloading" && (
                      <span className="status-badge downloading">
                        Downloading...
                      </span>
                    )}
                    {(modelStatus === "downloaded" ||
                      modelStatus === "active") && (
                      <button
                        className="btn-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveModel(model.id);
                        }}
                        title="Remove from cache"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredModels.length === 0 && (
            <div className="empty-state">
              <p>No models in this category</p>
            </div>
          )}
        </div>

        <footer className="ms-footer">
          <p className="hint">
            💡 Models are cached locally after download. Larger models = better
            quality but slower.
          </p>
          <button className="btn-clear-cache" onClick={handleClearAllCache}>
            🗑️ Clear All Cache
          </button>
        </footer>
      </div>
    </div>
  );
}

export default memo(ModelSwitcher);
