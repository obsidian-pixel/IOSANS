/**
 * AIAgentConfig Component
 * Configuration panel for AI Agent nodes (WebLLM)
 */
import { memo, useMemo } from "react";
import useModelStore from "../../../store/modelStore";

// Category labels
const CATEGORY_LABELS = {
  recommended: "⭐ Recommended",
  qwen: "🔮 Qwen Models",
  medium: "📦 Medium Models",
  tiny: "⚡ Tiny Models",
};

function AIAgentConfig({ data, onUpdate }) {
  const availableModels = useModelStore((state) => state.availableModels);
  const downloadedModels = useModelStore((state) => state.downloadedModels);
  const modelStatus = useModelStore((state) => state.status);
  const currentModelId = useModelStore((state) => state.currentModelId);

  // Filter models to only those that are downloaded (or currently loaded/active as fallback)
  const filteredModels = useMemo(() => {
    return availableModels.filter((m) => downloadedModels.includes(m.id));
  }, [availableModels, downloadedModels]);

  // Group models by category
  const modelsByCategory = useMemo(() => {
    const groups = {};
    for (const model of filteredModels) {
      const cat = model.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(model);
    }
    return groups;
  }, [filteredModels]);

  return (
    <div className="ai-agent-config">
      <div className="config-section">
        <div className="config-section-title">Model</div>

        <div className="config-field">
          <label>
            AI Model {filteredModels.length === 0 && "(No models downloaded)"}
          </label>

          {filteredModels.length > 0 ? (
            <select
              value={
                data.modelId || currentModelId || String(filteredModels[0]?.id)
              }
              onChange={(e) => onUpdate({ modelId: e.target.value })}
            >
              {Object.entries(modelsByCategory).map(([category, models]) => (
                <optgroup
                  key={category}
                  label={CATEGORY_LABELS[category] || category}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.size})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <div
              className="warning-box"
              style={{
                padding: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#fca5a5",
              }}
            >
              Please download a model using the Model Switcher (🔄) in the AI
              Control Panel.
            </div>
          )}

          <p className="hint">
            Status:{" "}
            <span
              style={{
                color:
                  modelStatus === "ready"
                    ? "var(--color-success)"
                    : "var(--color-warning)",
              }}
            >
              {modelStatus === "ready"
                ? "● Ready"
                : modelStatus === "loading"
                ? "○ Loading..."
                : "○ Not loaded"}
            </span>
          </p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">System Prompt</div>

        <div className="config-field">
          <textarea
            value={data.systemPrompt || ""}
            onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
            placeholder="You are a helpful AI assistant..."
            style={{ minHeight: "150px" }}
          />
          <p className="hint">Define the agent's behavior and personality</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Reasoning Mode</div>

        <div className="config-field">
          <label>Strategy</label>
          <select
            value={data.reasoningMode || "auto"}
            onChange={(e) => onUpdate({ reasoningMode: e.target.value })}
          >
            <option value="auto">🤖 Auto (Smart Selection)</option>
            <option value="cot">📝 Chain-of-Thought (Step-by-Step)</option>
            <option value="tot">🌳 Tree-of-Thoughts (Branching)</option>
            <option value="react">⚡ ReAct (Tool Calling)</option>
          </select>
          <p className="hint">
            {data.reasoningMode === "cot"
              ? "Linear step-by-step reasoning with audit trail"
              : data.reasoningMode === "tot"
              ? "Explores multiple branches, picks the best path"
              : data.reasoningMode === "react"
              ? "Thought → Action → Observation loop with tools"
              : "Automatically selects based on task complexity"}
          </p>
        </div>

        {data.reasoningMode === "tot" && (
          <div className="config-row">
            <div className="config-field">
              <label>Branch Count</label>
              <input
                type="number"
                value={data.branchCount || 3}
                onChange={(e) =>
                  onUpdate({ branchCount: parseInt(e.target.value, 10) })
                }
                min={2}
                max={5}
              />
              <p className="hint">Number of reasoning paths to explore</p>
            </div>
          </div>
        )}

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.enableSelfCorrection || false}
              onChange={(e) =>
                onUpdate({ enableSelfCorrection: e.target.checked })
              }
            />
            Enable Self-Correction (Critic)
          </label>
          <p className="hint">
            Second-pass verification to detect and fix errors before output
          </p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Parameters</div>

        <div className="config-row">
          <div className="config-field">
            <label>Temperature</label>
            <input
              type="number"
              value={data.temperature ?? 0.7}
              onChange={(e) =>
                onUpdate({ temperature: parseFloat(e.target.value) })
              }
              min={0}
              max={2}
              step={0.1}
            />
            <p className="hint">0 = focused, 2 = creative</p>
          </div>

          <div className="config-field">
            <label>Max Tokens</label>
            <input
              type="number"
              value={data.maxTokens || 2000}
              onChange={(e) =>
                onUpdate({ maxTokens: parseInt(e.target.value, 10) })
              }
              min={100}
              max={8000}
              step={100}
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Tool Calling (ReAct)</div>

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.enableToolCalling !== false}
              onChange={(e) =>
                onUpdate({ enableToolCalling: e.target.checked })
              }
            />
            Enable Tool Calling
          </label>
          <p className="hint">
            When enabled, the agent can call connected nodes as tools during
            reasoning
          </p>
        </div>

        {data.enableToolCalling !== false && (
          <div className="config-field">
            <label>Max Iterations</label>
            <input
              type="number"
              value={data.maxIterations || 10}
              onChange={(e) =>
                onUpdate({ maxIterations: parseInt(e.target.value, 10) })
              }
              min={1}
              max={20}
            />
            <p className="hint">
              Maximum ReAct loop iterations (prevents infinite loops)
            </p>
          </div>
        )}

        <div className="tools-info">
          <h4 style={{ margin: "0 0 8px", fontSize: "13px" }}>
            Connected Tools
          </h4>
          {data.tools && data.tools.length > 0 ? (
            <ul className="tools-list">
              {data.tools.map((tool, i) => (
                <li key={i}>
                  <span className="tool-icon">🔧</span>
                  <span className="tool-name">{tool.name || tool.nodeId}</span>
                  <span className="tool-type">{tool.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint" style={{ fontStyle: "italic" }}>
              No tools connected. Connect nodes to this agent to use them as
              tools.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(AIAgentConfig);
