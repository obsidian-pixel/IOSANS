/**
 * IfElseConfig Component
 * Configuration panel for If/Else conditional nodes
 */
import { memo } from "react";

const OPERATORS = [
  { value: "equals", label: "Equals (==)" },
  { value: "notEquals", label: "Not Equals (!=)" },
  { value: "contains", label: "Contains" },
  { value: "greaterThan", label: "Greater Than (>)" },
  { value: "lessThan", label: "Less Than (<)" },
  { value: "isEmpty", label: "Is Empty" },
  { value: "isNotEmpty", label: "Is Not Empty" },
  { value: "isTrue", label: "Is Truthy" },
  { value: "isFalse", label: "Is Falsy" },
];

function IfElseConfig({ data, onUpdate }) {
  const needsCompareValue = ![
    "isEmpty",
    "isNotEmpty",
    "isTrue",
    "isFalse",
  ].includes(data.operator);

  return (
    <div className="if-else-config">
      <div className="config-section">
        <div className="config-section-title">Condition</div>

        <div className="config-field">
          <label>Field Path</label>
          <input
            type="text"
            value={data.condition || ""}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            placeholder="data.status"
          />
          <p className="hint">
            Path to the field to check (e.g., response.status)
          </p>
        </div>

        <div className="config-field">
          <label>Operator</label>
          <select
            value={data.operator || "equals"}
            onChange={(e) => onUpdate({ operator: e.target.value })}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {needsCompareValue && (
          <div className="config-field">
            <label>Compare Value</label>
            <input
              type="text"
              value={data.compareValue || ""}
              onChange={(e) => onUpdate({ compareValue: e.target.value })}
              placeholder="value to compare"
            />
          </div>
        )}
      </div>

      <div className="config-section">
        <div className="config-section-title">Outputs</div>
        <div className="output-info">
          <div className="output-row">
            <span className="output-badge true">Output 1</span>
            <span>Condition is TRUE</span>
          </div>
          <div className="output-row">
            <span className="output-badge false">Output 2</span>
            <span>Condition is FALSE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(IfElseConfig);
