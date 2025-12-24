/**
 * ErrorTriggerConfig Component
 * Configuration panel for global Error Handler Trigger
 */
import { memo } from "react";

function ErrorTriggerConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Error Scope</div>

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.watchAll !== false}
              onChange={(e) => onUpdate({ watchAll: e.target.checked })}
            />
            Watch All Nodes (Global Handler)
          </label>
          <p className="hint">Catches errors from any node in the workflow</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Recovery</div>

        <div className="config-field">
          <label>Auto-Retry</label>
          <select
            value={data.retryEnabled ? "yes" : "no"}
            onChange={(e) =>
              onUpdate({ retryEnabled: e.target.value === "yes" })
            }
          >
            <option value="no">Disabled</option>
            <option value="yes">Attempt Retry</option>
          </select>
        </div>

        {data.retryEnabled && (
          <div className="config-field">
            <label>Max Retries</label>
            <input
              type="number"
              value={data.retryCount || 3}
              onChange={(e) =>
                onUpdate({ retryCount: parseInt(e.target.value) })
              }
              min={1}
              max={10}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ErrorTriggerConfig);
