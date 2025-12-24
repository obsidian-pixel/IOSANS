/**
 * ChatModelConfig Component
 * Configuration panel for Chat Model node
 */
import { memo } from "react";
import useModelStore from "../../../store/modelStore";
import "./ChatModelConfig.css";

function ChatModelConfig({ data, onUpdate }) {
  const availableModels = useModelStore((state) => state.availableModels);
  const modelStatus = useModelStore((state) => state.status);
  const loadModel = useModelStore((state) => state.loadModel);

  const handleModelChange = (modelId) => {
    const model = availableModels.find((m) => m.id === modelId);
    onUpdate({
      modelId,
      modelName: model?.name || modelId,
    });
  };

  const handleLoadModel = async () => {
    if (data.modelId) {
      await loadModel(data.modelId);
    }
  };

  return (
    <div className="chat-model-config">
      <div className="config-section">
        <div className="config-section-title">Model Selection</div>

        <div className="config-field">
          <label>Provider</label>
          <select
            value={data.provider || "webllm"}
            onChange={(e) => onUpdate({ provider: e.target.value })}
          >
            <option value="webllm">WebLLM (Local Browser)</option>
            <option value="openai">OpenAI API</option>
            <option value="anthropic">Anthropic API</option>
            <option value="local">Local Ollama</option>
          </select>
        </div>

        <div className="config-field">
          <label>Model</label>
          <select
            value={data.modelId || ""}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            <option value="">Select a model...</option>
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.size})
              </option>
            ))}
          </select>
          <p className="hint">Choose the AI model for text generation</p>
        </div>

        {data.provider === "webllm" && (
          <div className="model-status-section">
            <div className={`status-badge ${modelStatus}`}>
              {modelStatus === "ready" && "✓ Model Ready"}
              {modelStatus === "loading" && "⏳ Loading..."}
              {modelStatus === "idle" && "○ Not Loaded"}
              {modelStatus === "error" && "✗ Error"}
            </div>
            {modelStatus !== "ready" && modelStatus !== "loading" && (
              <button
                className="load-model-btn"
                onClick={handleLoadModel}
                disabled={!data.modelId}
              >
                Load Model
              </button>
            )}
          </div>
        )}
      </div>

      <div className="config-section">
        <div className="config-section-title">Generation Settings</div>

        <div className="config-field">
          <label>Temperature</label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={data.temperature || 0.7}
              onChange={(e) =>
                onUpdate({ temperature: parseFloat(e.target.value) })
              }
            />
            <span className="slider-value">{data.temperature || 0.7}</span>
          </div>
          <p className="hint">Higher = more creative, Lower = more focused</p>
        </div>

        <div className="config-field">
          <label>Max Tokens</label>
          <input
            type="number"
            value={data.maxTokens || 2000}
            onChange={(e) =>
              onUpdate({ maxTokens: parseInt(e.target.value, 10) || 2000 })
            }
            min={100}
            max={8000}
          />
          <p className="hint">Maximum response length</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Connection</div>
        <div className="connection-info">
          <p>
            Connect the <strong>Model ◆</strong> output (top) to an AI Agent's
            Model input slot.
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(ChatModelConfig);
