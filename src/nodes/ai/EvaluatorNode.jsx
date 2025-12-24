/**
 * EvaluatorNode Component
 * Validates Generator output against JSON schema
 * Outputs "pass" or "feedback" to trigger self-correction loop
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./EvaluatorNode.css";

function EvaluatorNode({ data }) {
  const evaluationType = data.evaluationType || "schema";
  const maxRetries = data.maxRetries || 3;
  const schema = data.schema || null;

  return (
    <BaseNode
      type="evaluator"
      data={data}
      inputs={1}
      outputs={2}
      outputLabels={["pass ✓", "retry →"]}
    >
      <div className="evaluator-node-content">
        <div className="eval-type">
          <span className="eval-icon">🔍</span>
          <span className="eval-label">{evaluationType}</span>
        </div>

        <div className="eval-retries">
          <span className="retries-label">Max retries:</span>
          <span className="retries-count">{maxRetries}</span>
        </div>

        {schema && (
          <div className="eval-schema">
            <span className="schema-label">Schema:</span>
            <span className="schema-preview">
              {typeof schema === "object"
                ? Object.keys(schema).slice(0, 3).join(", ")
                : schema}
            </span>
          </div>
        )}

        <div className="eval-modes">
          <span
            className={`mode-chip ${
              evaluationType === "schema" ? "active" : ""
            }`}
          >
            JSON
          </span>
          <span
            className={`mode-chip ${
              evaluationType === "regex" ? "active" : ""
            }`}
          >
            Regex
          </span>
          <span
            className={`mode-chip ${evaluationType === "llm" ? "active" : ""}`}
          >
            LLM
          </span>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(EvaluatorNode);
