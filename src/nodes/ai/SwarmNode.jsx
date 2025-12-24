/**
 * SwarmNode Component
 * Executes multiple AI agents in parallel and aggregates results
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./SwarmNode.css";

function SwarmNode({ data }) {
  const agentCount = data.agentCount || 3;
  const aggregationMode = data.aggregationMode || "consensus";
  const timeout = data.timeout || 30000;

  return (
    <BaseNode
      type="swarm"
      data={data}
      inputs={1}
      outputs={2}
      outputLabels={["result", "all"]}
    >
      <div className="swarm-node-content">
        <div className="swarm-header">
          <span className="swarm-icon">🐝</span>
          <span className="swarm-count">{agentCount} agents</span>
        </div>

        <div className="swarm-mode">
          <span className="mode-label">Mode:</span>
          <span className={`mode-value ${aggregationMode}`}>
            {aggregationMode}
          </span>
        </div>

        <div className="swarm-agents">
          {Array.from({ length: Math.min(agentCount, 5) }).map((_, i) => (
            <div key={i} className="agent-indicator" />
          ))}
          {agentCount > 5 && (
            <span className="agent-overflow">+{agentCount - 5}</span>
          )}
        </div>

        <div className="swarm-timeout">
          <span className="timeout-label">Timeout:</span>
          <span className="timeout-value">{timeout / 1000}s</span>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(SwarmNode);
