/**
 * WebhookTriggerConfig Component
 * Configuration panel for Webhook Trigger
 */
import { memo } from "react";

function WebhookTriggerConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Endpoint Settings</div>

        <div className="config-field">
          <label>HTTP Method</label>
          <select
            value={data.method || "POST"}
            onChange={(e) => onUpdate({ method: e.target.value })}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
          </select>
        </div>

        <div className="config-field">
          <label>Endpoint URL path</label>
          <input
            type="text"
            value={data.endpoint || "/webhook/default"}
            onChange={(e) => onUpdate({ endpoint: e.target.value })}
            placeholder="/webhook/my-trigger"
          />
          <p className="hint">Relative path from server root</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Security</div>

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.authRequired || false}
              onChange={(e) => onUpdate({ authRequired: e.target.checked })}
            />
            Require Authentication
          </label>
          <p className="hint">Validates "Authorization" header</p>
        </div>
      </div>
    </div>
  );
}

export default memo(WebhookTriggerConfig);
