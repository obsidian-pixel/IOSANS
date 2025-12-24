/**
 * FileSystemConfig Component
 * Configuration panel for File System node
 */
import { memo } from "react";

function FileSystemConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">File Operation</div>

        <div className="config-field">
          <label>Mode</label>
          <select
            value={data.mode || "read"}
            onChange={(e) => onUpdate({ mode: e.target.value })}
          >
            <option value="read">Read File</option>
            <option value="write">Write File</option>
          </select>
        </div>

        {data.mode === "write" && (
          <div className="config-field">
            <label>Suggested Filename</label>
            <input
              type="text"
              value={data.filename || ""}
              onChange={(e) => onUpdate({ filename: e.target.value })}
              placeholder="output.txt"
            />
          </div>
        )}
      </div>

      <div className="config-section">
        <div className="config-section-title">💡 Info</div>
        <p className="hint">
          Uses the File System Access API. A file picker will open when the node
          runs.
        </p>
      </div>
    </div>
  );
}

export default memo(FileSystemConfig);
