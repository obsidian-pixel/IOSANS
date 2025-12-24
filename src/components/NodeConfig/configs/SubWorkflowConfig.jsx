/**
 * SubWorkflowConfig Component
 * Configuration panel for Sub-Workflow Node
 */
import { memo } from "react";

function SubWorkflowConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Target Workflow</div>

        <div className="config-field">
          <label>Workflow ID</label>
          <input
            type="text"
            value={data.workflowId || ""}
            onChange={(e) => onUpdate({ workflowId: e.target.value })}
            placeholder="UUID of target workflow"
          />
          <p className="hint">
            The ID of the workflow to execute. (Future: Dropdown selection)
          </p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Execution Mode</div>

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.passInput !== false}
              onChange={(e) => onUpdate({ passInput: e.target.checked })}
            />
            Pass Input Data
          </label>
          <p className="hint">
            Forward input from this node to the start of the sub-workflow
          </p>
        </div>

        <div className="config-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={data.async || false}
              onChange={(e) => onUpdate({ async: e.target.checked })}
            />
            Run Asynchronously (Fire & Forget)
          </label>
          <p className="hint">
            If checked, this node completes immediately without waiting for
            result
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SubWorkflowConfig);
