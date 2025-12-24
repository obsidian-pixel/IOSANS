/**
 * LocalStorageConfig Component
 * Configuration panel for Local Storage node
 */
import { memo } from "react";

function LocalStorageConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Storage Settings</div>

        <div className="config-field">
          <label>Storage Type</label>
          <select
            value={data.storageType || "localStorage"}
            onChange={(e) => onUpdate({ storageType: e.target.value })}
          >
            <option value="localStorage">LocalStorage</option>
            <option value="indexedDB">IndexedDB</option>
          </select>
        </div>

        <div className="config-field">
          <label>Operation</label>
          <select
            value={data.mode || "get"}
            onChange={(e) => onUpdate({ mode: e.target.value })}
          >
            <option value="get">Get</option>
            <option value="set">Set</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        <div className="config-field">
          <label>Key</label>
          <input
            type="text"
            value={data.key || ""}
            onChange={(e) => onUpdate({ key: e.target.value })}
            placeholder="my_data_key"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(LocalStorageConfig);
