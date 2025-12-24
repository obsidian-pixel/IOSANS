/**
 * WaitForApprovalNode Component
 * Human-in-the-loop pause node that requires manual approval
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./WaitForApprovalNode.css";

function WaitForApprovalNode({ data }) {
  const title = data.title || "Approval Required";
  const timeout = data.timeout || 0; // 0 = no timeout

  return (
    <BaseNode type="waitForApproval" data={data} inputs={1} outputs={2}>
      <div className="approval-content">
        <div className="approval-icon">✋</div>

        <div className="approval-title">{title}</div>

        {data.message && (
          <div className="approval-message">{data.message.slice(0, 60)}...</div>
        )}

        <div className="approval-outputs">
          <div className="output-label approved">✓ Approved</div>
          <div className="output-label rejected">✗ Rejected</div>
        </div>

        {timeout > 0 && (
          <div className="timeout-badge">⏱ {timeout}s timeout</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(WaitForApprovalNode);
