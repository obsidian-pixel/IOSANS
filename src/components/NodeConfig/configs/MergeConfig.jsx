/**
 * MergeConfig Component
 * Configuration panel for Merge Node (Parallel Flow Control)
 */
import { memo } from "react";

function MergeConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Synchronization</div>

        <div className="config-field">
          <label>Wait Mode</label>
          <select
            value={data.mode || "wait"}
            onChange={(e) => onUpdate({ mode: e.target.value })}
          >
            <option value="wait">Wait for ALL Inputs</option>
            <option value="first">Proceed on FIRST Input</option>
          </select>
          <p className="hint">
            {data.mode === "wait"
              ? "Acts as a barrier. Waits until all connected branches finish."
              : "Race condition. Continues as soon as one branch finishes."}
          </p>
        </div>

        {data.mode === "wait" && (
          <div className="config-field">
            <label>Input Count (Manual Override)</label>
            <input
              type="number"
              value={data.inputCount || 2}
              onChange={(e) =>
                onUpdate({ inputCount: parseInt(e.target.value) })
              }
              min={2}
              max={10}
            />
            <p className="hint">Usually auto-detected, but can be forced.</p>
          </div>
        )}
      </div>

      <div className="config-section">
        <div className="config-section-title">Data Aggregation</div>

        <div className="config-field">
          <label>Result Format</label>
          <select
            value={data.aggregator || "array"}
            onChange={(e) => onUpdate({ aggregator: e.target.value })}
          >
            <option value="array">Array of Results [A, B]</option>
            <option value="object">Merged Object {"{ ...A, ...B }"}</option>
            <option value="concat">String Concatenation</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default memo(MergeConfig);
