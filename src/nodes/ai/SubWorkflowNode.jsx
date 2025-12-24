/**
 * SubWorkflowNode Component
 * Executes another workflow as a subroutine
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./SubWorkflowNode.css";

function SubWorkflowNode({ data }) {
  const workflowName = data.workflowName || "Select workflow...";
  const passInput = data.passInput !== false;

  return (
    <BaseNode type="subWorkflow" data={data} inputs={1} outputs={1}>
      <div className="subworkflow-content">
        <div className="workflow-icon">🔀</div>

        <div className="workflow-name">{workflowName}</div>

        <div className="workflow-config">
          {passInput && <span className="config-tag">↳ Pass input</span>}
          {data.async && <span className="config-tag">⚡ Async</span>}
        </div>

        {data.description && (
          <div className="workflow-desc">
            {data.description.slice(0, 50)}...
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(SubWorkflowNode);
