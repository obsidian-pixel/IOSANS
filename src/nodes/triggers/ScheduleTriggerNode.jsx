/**
 * ScheduleTriggerNode Component
 * Trigger node that runs on a schedule (simulated in browser)
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";

function ScheduleTriggerNode({ data }) {
  return (
    <BaseNode type="scheduleTrigger" data={data} inputs={1} outputs={1}>
      <div className="node-field">
        <label>Schedule (cron)</label>
        <div className="node-preview">{data.schedule || "*/5 * * * *"}</div>
      </div>
      <div className="node-preview">
        {data.enabled ? "✓ Enabled" : "○ Disabled"}
      </div>
    </BaseNode>
  );
}

export default memo(ScheduleTriggerNode);
