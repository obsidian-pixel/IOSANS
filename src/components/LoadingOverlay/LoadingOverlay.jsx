/**
 * LoadingOverlay Component
 * Displays loading progress during model initialization
 */
import { memo } from "react";
import useModelStore from "../../store/modelStore";
import "./LoadingOverlay.css";

function LoadingOverlay() {
  const status = useModelStore((state) => state.status);
  const loadProgress = useModelStore((state) => state.loadProgress);
  const currentModel = useModelStore((state) => state.currentModel);
  const availableModels = useModelStore((state) => state.availableModels);

  // Only show when actively loading
  if (status !== "loading") {
    return null;
  }

  // Find model info
  const modelInfo = availableModels.find((m) => m.id === currentModel);

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-header">
          <h1 className="brand-title">IOSANS</h1>
          <span className="brand-tagline">
            Infinite Open Source Automation System
          </span>
        </div>

        <div className="loading-spinner">
          <div className="spinner-ring" />
          <span className="spinner-icon">∞</span>
        </div>

        <h2 className="loading-title">Preparing Your Sovereign AI</h2>

        <div className="loading-model-info">
          <span className="model-name">{modelInfo?.name || currentModel}</span>
          {modelInfo?.size && (
            <span className="model-size">{modelInfo.size}</span>
          )}
        </div>

        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.round((loadProgress || 0) * 100)}%` }}
            />
          </div>
          <span className="progress-text">
            {Math.round((loadProgress || 0) * 100)}%
          </span>
        </div>

        <p className="loading-hint">
          Your AI runs locally. No cloud. No data harvesting.
          <br />
          <strong>You own your intelligence.</strong>
        </p>
      </div>
    </div>
  );
}

export default memo(LoadingOverlay);
