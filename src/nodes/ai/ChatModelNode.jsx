/**
 * ChatModelNode Component
 * Provider node that uses BaseNode for consistent styling
 * Provides AI model to connected AI Agent nodes via diamond handle
 */
import { memo } from "react";
import useModelStore from "../../store/modelStore";
import BaseNode from "../base/BaseNode";
import "./ChatModelNode.css";

function ChatModelNode({ data }) {
  // Model store state
  const availableModels = useModelStore((state) => state.availableModels);
  const modelStatus = useModelStore((state) => state.status);

  // Get provider info
  const provider = data.provider || "webllm";
  const currentModel = availableModels.find((m) => m.id === data.modelId);
  const modelName = currentModel?.name || data.modelName || "Gemma 2 2B";

  const providerIcons = {
    webllm: "🧠",
    openai: "⚡",
    anthropic: "🔮",
    local: "💻",
  };

  return (
    <BaseNode
      type="chatModel"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "model-out", type: "model" }}
    >
      <div className="chat-model-content">
        <div className="model-provider-row">
          <span className="provider-icon-badge">
            {providerIcons[provider] || "🤖"}
          </span>
          <div className="model-details">
            <div className="model-name-label">{modelName}</div>
            <div className="provider-name">{provider.toUpperCase()}</div>
          </div>
          <div className={`model-status-indicator ${modelStatus}`}>
            {modelStatus === "ready" && "●"}
            {modelStatus === "loading" && "◐"}
            {modelStatus === "error" && "×"}
          </div>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(ChatModelNode);
