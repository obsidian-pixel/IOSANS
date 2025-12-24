/**
 * SwarmConfig Component
 * Configuration panel for Swarm Node (Multi-Agent System)
 */
import { memo } from "react";

function SwarmConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Swarm Size</div>

        <div className="config-field">
          <label>Agent Count</label>
          <input
            type="number"
            value={data.agentCount || 3}
            onChange={(e) => onUpdate({ agentCount: parseInt(e.target.value) })}
            min={2}
            max={10}
            step={1}
          />
          <p className="hint">Number of parallel agents to spawn (2-10)</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Execution</div>

        <div className="config-field">
          <label>Aggregation Mode</label>
          <select
            value={data.aggregationMode || "consensus"}
            onChange={(e) => onUpdate({ aggregationMode: e.target.value })}
          >
            <option value="consensus">Consensus (Vote)</option>
            <option value="first">First to Finish</option>
            <option value="all">Return All Results</option>
          </select>
          <p className="hint">
            {data.aggregationMode === "consensus"
              ? "Agents vote on the best answer"
              : data.aggregationMode === "first"
              ? "Fastest response wins (race)"
              : "Collect responses from all agents"}
          </p>
        </div>

        <div className="config-field">
          <label>Timeout (ms)</label>
          <input
            type="number"
            value={data.timeout || 30000}
            onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) })}
            min={1000}
            max={300000}
            step={1000}
          />
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Shared Context</div>

        <div className="config-field">
          <label>System Prompt</label>
          <textarea
            value={data.systemPrompt || ""}
            onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
            placeholder="You are a swarm of experts solving a problem..."
            style={{ minHeight: "120px" }}
          />
          <p className="hint">Shared instruction for all agents in the swarm</p>
        </div>
      </div>
    </div>
  );
}

export default memo(SwarmConfig);
