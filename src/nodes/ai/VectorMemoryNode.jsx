/**
 * VectorMemoryNode Component
 * Node for storing and querying local vector memory
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./VectorMemoryNode.css";

function VectorMemoryNode({ data }) {
  const mode = data.mode || "query";
  const namespace = data.namespace || "default";

  return (
    <BaseNode
      type="vectorMemory"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "memory-out", type: "memory", label: null }}
    >
      <div className="vector-memory-content">
        <div className="mode-badge">
          <span className="mode-icon">{mode === "upsert" ? "📝" : "🔍"}</span>
          <span className="mode-label">
            {mode === "upsert" ? "Store" : "Query"}
          </span>
        </div>

        <div className="namespace-tag">
          <span className="namespace-icon">📁</span>
          <span className="namespace-name">{namespace}</span>
        </div>

        {data.topK && mode === "query" && (
          <div className="config-preview">Top {data.topK} results</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(VectorMemoryNode);
