/**
 * AIAgentNode Component
 * AI-powered node using WebLLM with ReAct pattern
 */
import { memo, useState, useEffect } from "react";
import BaseNode from "../base/BaseNode";
import useModelStore from "../../store/modelStore";
import {
  detectHardware,
  getTierEmoji,
  getTierColor,
} from "../../utils/hardwareDetection";
import "./AIAgentNode.css";

function AIAgentNode({ data }) {
  const availableModels = useModelStore((state) => state.availableModels);
  const modelStatus = useModelStore((state) => state.status);

  // Hardware detection state
  const [hardware, setHardware] = useState(null);

  useEffect(() => {
    detectHardware().then(setHardware);
  }, []);

  // Get current model name
  const currentModel = availableModels.find((m) => m.id === data.modelId);
  const modelName = currentModel?.name || "Gemma 2 2B";

  // Truncate system prompt for preview
  const promptPreview = (data.systemPrompt || "").split("\n")[0].slice(0, 50);

  return (
    <BaseNode type="aiAgent" data={data} inputs={1} outputs={1}>
      <div className="ai-node-content">
        <div className="model-badge">
          <span className={`status-dot ${modelStatus}`} />
          <span className="model-name">{modelName}</span>
        </div>

        {/* Hardware tier badge */}
        {hardware && (
          <div
            className="hardware-badge"
            title={
              hardware.recommendations?.[0] || `GPU: ${hardware.gpuRenderer}`
            }
            style={{ "--tier-color": getTierColor(hardware.tier) }}
          >
            {getTierEmoji(hardware.tier)} {hardware.tier.toUpperCase()}
          </div>
        )}

        {data.systemPrompt && (
          <div className="node-preview prompt-preview">{promptPreview}...</div>
        )}

        {data.tools && data.tools.length > 0 && (
          <div className="tools-count">
            🔧 {data.tools.length} tool(s) available
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(AIAgentNode);
