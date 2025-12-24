/**
 * VectorMemoryConfig Component
 * Configuration panel for Vector Memory node
 */
import { memo } from "react";

function VectorMemoryConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Memory Settings</div>

        <div className="config-field">
          <label>Mode</label>
          <select
            value={data.mode || "query"}
            onChange={(e) => onUpdate({ mode: e.target.value })}
          >
            <option value="query">Query (Search)</option>
            <option value="upsert">Upsert (Add/Update)</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        <div className="config-field">
          <label>Namespace</label>
          <input
            type="text"
            value={data.namespace || "default"}
            onChange={(e) => onUpdate({ namespace: e.target.value })}
            placeholder="default"
          />
          <p className="hint">Group related memories together</p>
        </div>

        {data.mode === "query" && (
          <>
            <div className="config-field">
              <label>Top K Results</label>
              <input
                type="number"
                value={data.topK || 5}
                onChange={(e) => onUpdate({ topK: parseInt(e.target.value) })}
                min={1}
                max={50}
              />
            </div>

            <div className="config-field">
              <label>Min Score</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={data.minScore || 0.3}
                onChange={(e) =>
                  onUpdate({ minScore: parseFloat(e.target.value) })
                }
              />
              <span className="hint">{data.minScore || 0.3}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(VectorMemoryConfig);
