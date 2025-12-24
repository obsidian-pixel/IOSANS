/**
 * EvaluatorConfig Component
 * Configuration panel for Evaluator Node (Validation & Correction)
 */
import { memo, useState, useEffect } from "react";

function EvaluatorConfig({ data, onUpdate }) {
  const [jsonError, setJsonError] = useState(null);
  const [schemaText, setSchemaText] = useState("");

  // Initialize text state from data
  useEffect(() => {
    if (data.schema) {
      try {
        const formatted = JSON.stringify(data.schema, null, 2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setSchemaText((prev) => (prev !== formatted ? formatted : prev));
      } catch {
        // Ignore serialization errors
      }
    }
  }, [data.schema]);

  const handleSchemaChange = (text) => {
    setSchemaText(text);
    try {
      if (!text.trim()) {
        onUpdate({ schema: null });
        setJsonError(null);
        return;
      }
      const parsed = JSON.parse(text);
      onUpdate({ schema: parsed });
      setJsonError(null);
    } catch (e) {
      setJsonError(e.message);
    }
  };

  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Validation Rule</div>

        <div className="config-field">
          <label>Evaluation Type</label>
          <select
            value={data.evaluationType || "schema"}
            onChange={(e) => onUpdate({ evaluationType: e.target.value })}
          >
            <option value="schema">JSON Schema (Structure)</option>
            <option value="regex">Regex (Pattern)</option>
            <option value="llm">AI Evaluator (Semantic)</option>
          </select>
        </div>

        {data.evaluationType === "schema" && (
          <div className="config-field">
            <label>Validation Schema (JSON)</label>
            <textarea
              value={schemaText}
              onChange={(e) => handleSchemaChange(e.target.value)}
              placeholder='{ "type": "object", "properties": { ... } }'
              style={{
                minHeight: "200px",
                fontFamily: "monospace",
                fontSize: "12px",
                borderColor: jsonError ? "var(--color-error)" : undefined,
              }}
            />
            {jsonError && (
              <p
                className="error-message"
                style={{
                  color: "var(--color-error)",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                Invalid JSON: {jsonError}
              </p>
            )}
            <p className="hint">Standard JSON Schema validation</p>
          </div>
        )}

        {data.evaluationType === "regex" && (
          <div className="config-field">
            <label>Regex Pattern</label>
            <input
              type="text"
              value={data.regexPattern || ""}
              onChange={(e) => onUpdate({ regexPattern: e.target.value })}
              placeholder="e.g., ^[a-z0-9]+$"
            />
          </div>
        )}
      </div>

      <div className="config-section">
        <div className="config-section-title">Correction Loop</div>

        <div className="config-field">
          <label>Max Retries</label>
          <input
            type="number"
            value={data.maxRetries || 3}
            onChange={(e) => onUpdate({ maxRetries: parseInt(e.target.value) })}
            min={1}
            max={10}
          />
          <p className="hint">
            How many times to feed errors back to the generator
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(EvaluatorConfig);
