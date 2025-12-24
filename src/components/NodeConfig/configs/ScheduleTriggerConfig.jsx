/**
 * ScheduleTriggerConfig Component
 * Configuration panel for Schedule Trigger nodes
 */
import { memo } from "react";

const PRESETS = [
  { value: "* * * * *", label: "Every minute" },
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 0 * * *", label: "Every day at midnight" },
  { value: "0 9 * * 1-5", label: "Weekdays at 9 AM" },
  { value: "0 0 * * 0", label: "Every Sunday at midnight" },
];

function ScheduleTriggerConfig({ data, onUpdate }) {
  return (
    <div className="schedule-trigger-config">
      <div className="config-section">
        <div className="config-section-title">Schedule</div>

        <div className="config-field">
          <label>Cron Expression</label>
          <input
            type="text"
            value={data.schedule || "*/5 * * * *"}
            onChange={(e) => onUpdate({ schedule: e.target.value })}
            placeholder="*/5 * * * *"
          />
          <p className="hint">Format: minute hour day month weekday</p>
        </div>

        <div className="config-field">
          <label>Quick Presets</label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onUpdate({ schedule: e.target.value });
              }
            }}
          >
            <option value="">Select a preset...</option>
            {PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Status</div>

        <div className="config-toggle">
          <label>Enable Schedule</label>
          <div
            className={`toggle-switch ${data.enabled ? "active" : ""}`}
            onClick={() => onUpdate({ enabled: !data.enabled })}
          />
        </div>

        <p className="hint" style={{ marginTop: "8px" }}>
          Note: Browser schedules use setInterval simulation. For production,
          use a proper scheduler.
        </p>
      </div>
    </div>
  );
}

export default memo(ScheduleTriggerConfig);
