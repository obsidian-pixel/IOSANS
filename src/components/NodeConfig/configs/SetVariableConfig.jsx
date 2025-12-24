/**
 * SetVariableConfig Component
 * Configuration panel for Set Variable nodes
 */
import { memo } from "react";

const MODES = [
  { value: "set", label: "Set (replace)" },
  { value: "append", label: "Append (to array)" },
  { value: "merge", label: "Merge (objects)" },
];

function SetVariableConfig({ data, onUpdate }) {
  return (
    <div className="set-variable-config">
      <div className="config-section">
        <div className="config-section-title">Variable</div>

        <div className="config-field">
          <label>Variable Name</label>
          <input
            type="text"
            value={data.variableName || ""}
            onChange={(e) => onUpdate({ variableName: e.target.value })}
            placeholder="data"
          />
          <p className="hint">The key to set on the output object</p>
        </div>

        <div className="config-field">
          <label>Mode</label>
          <select
            value={data.mode || "set"}
            onChange={(e) => onUpdate({ mode: e.target.value })}
          >
            {MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Value</div>

        <div className="config-field">
          <textarea
            value={data.value || ""}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Value or expression"
            style={{ minHeight: "80px" }}
          />
          <p className="hint">
            Use {"{{field.path}}"} to reference input data. Leave empty to use
            entire input.
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SetVariableConfig);
