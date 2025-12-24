/**
 * WaitForApprovalConfig Component
 * Configuration panel for Approval Node
 */
import { memo } from "react";

function WaitForApprovalConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Approval Request</div>

        <div className="config-field">
          <label>Title</label>
          <input
            type="text"
            value={data.title || "Approval Required"}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Action Header"
          />
        </div>

        <div className="config-field">
          <label>Message / Description</label>
          <textarea
            value={data.message || ""}
            onChange={(e) => onUpdate({ message: e.target.value })}
            placeholder="Please review the data before proceeding..."
            style={{ minHeight: "80px" }}
          />
          <p className="hint">Explain what needs to be approved</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Settings</div>

        <div className="config-field">
          <label>Timeout (seconds)</label>
          <input
            type="number"
            value={data.timeout || 0}
            onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) })}
            min={0}
            placeholder="0 = No timeout"
          />
          <p className="hint">Auto-reject after N seconds (0 to disable)</p>
        </div>

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.notifyBrowser !== false}
              onChange={(e) => onUpdate({ notifyBrowser: e.target.checked })}
            />
            Browser Notification
          </label>
        </div>
      </div>
    </div>
  );
}

export default memo(WaitForApprovalConfig);
