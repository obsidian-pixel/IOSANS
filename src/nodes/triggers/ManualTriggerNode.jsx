/**
 * ManualTriggerNode Component
 * Trigger node that starts workflow on manual click
 */
import { memo, useCallback } from "react";
import { useNodeId } from "@xyflow/react";
import BaseNode from "../base/BaseNode";
import useWorkflowStore from "../../store/workflowStore";

function ManualTriggerNode({ data }) {
  const nodeId = useNodeId();
  const updateNode = useWorkflowStore((state) => state.updateNode);

  const handleChange = useCallback(
    (e) => {
      updateNode(nodeId, { defaultPayload: e.target.value });
    },
    [nodeId, updateNode]
  );

  return (
    <BaseNode type="manualTrigger" data={data} inputs={0} outputs={1}>
      <div className="node-field">
        <label>Default Payload</label>
        <textarea
          className="node-input nodrag"
          placeholder="Enter text to start flow..."
          value={data.defaultPayload || ""}
          onChange={handleChange}
          rows={3}
          style={{ width: "100%", resize: "vertical" }}
        />
      </div>
    </BaseNode>
  );
}

export default memo(ManualTriggerNode);
