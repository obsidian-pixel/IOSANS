/**
 * BrowserEventConfig Component
 * Configuration panel for Browser Event Trigger
 */
import { memo } from "react";

function BrowserEventConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Event Listener</div>

        <div className="config-field">
          <label>Event Type</label>
          <select
            value={data.eventType || "focus"}
            onChange={(e) => onUpdate({ eventType: e.target.value })}
          >
            <option value="focus">Window Focus</option>
            <option value="blur">Window Blur</option>
            <option value="urlChange">URL Change (Navigation)</option>
            <option value="domClick">Element Click</option>
            <option value="domChange">DOM Change (Observer)</option>
          </select>
        </div>

        {data.eventType === "domClick" && (
          <div className="config-field">
            <label>CSS Selector</label>
            <input
              type="text"
              value={data.selector || ""}
              onChange={(e) => onUpdate({ selector: e.target.value })}
              placeholder="#submit-button, .link"
            />
          </div>
        )}

        <div className="config-field">
          <label>URL Pattern (Optional)</label>
          <input
            type="text"
            value={data.urlPattern || ""}
            onChange={(e) => onUpdate({ urlPattern: e.target.value })}
            placeholder="example.com/*"
          />
          <p className="hint">Only trigger on specific pages</p>
        </div>
      </div>
    </div>
  );
}

export default memo(BrowserEventConfig);
