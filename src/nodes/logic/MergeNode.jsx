/**
 * MergeNode Component
 * Waits for all parallel branches to complete before continuing
 * Aggregates outputs from multiple inputs into a single output
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./MergeNode.css";

function MergeNode({ data }) {
  const inputCount = data.inputCount || 2;
  const mode = data.mode || "wait"; // "wait" (all) or "first" (race)

  return (
    <BaseNode
      type="merge"
      data={data}
      inputs={inputCount}
      outputs={1}
      outputLabels={["merged"]}
    >
      <div className="merge-node-content">
        <div className="merge-mode">
          <span className="mode-icon">{mode === "wait" ? "⏳" : "🏃"}</span>
          <span className="mode-text">
            {mode === "wait" ? "Wait for all" : "First to arrive"}
          </span>
        </div>

        <div className="merge-inputs">
          <span className="inputs-label">Inputs:</span>
          <span className="inputs-count">{inputCount}</span>
        </div>

        {data.aggregator && (
          <div className="merge-aggregator">
            <span className="agg-label">Combine:</span>
            <span className="agg-value">{data.aggregator}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(MergeNode);
