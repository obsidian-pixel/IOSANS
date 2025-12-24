/**
 * LoopConfig Component
 * Configuration panel for Loop nodes
 */
import { memo } from "react";

function LoopConfig({ data, onUpdate }) {
  return (
    <div className="loop-config">
      <div className="config-section">
        <div className="config-section-title">Loop Settings</div>

        <div className="config-field">
          <label>Iterations (repeat count)</label>
          <input
            type="number"
            value={data.iterations || 1}
            onChange={(e) =>
              onUpdate({ iterations: parseInt(e.target.value, 10) || 1 })
            }
            min={1}
            max={1000}
          />
          <p className="hint">
            How many times the loop will repeat the workflow
          </p>
        </div>

        <div className="config-field">
          <label>Items Path (optional)</label>
          <input
            type="text"
            value={data.itemsPath || ""}
            onChange={(e) => onUpdate({ itemsPath: e.target.value })}
            placeholder="items"
          />
          <p className="hint">
            Path to array in input data for item-based looping
          </p>
        </div>

        <div className="config-field">
          <label>Max Items</label>
          <input
            type="number"
            value={data.maxIterations || 100}
            onChange={(e) =>
              onUpdate({ maxIterations: parseInt(e.target.value, 10) })
            }
            min={1}
            max={10000}
          />
          <p className="hint">Maximum array items to process per iteration</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Outputs</div>
        <div className="output-info">
          <div className="output-row">
            <span className="output-badge loop">loop →</span>
            <span>Connect back to repeat the workflow</span>
          </div>
          <div className="output-row">
            <span className="output-badge done">done ✓</span>
            <span>Fires when all iterations complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(LoopConfig);
