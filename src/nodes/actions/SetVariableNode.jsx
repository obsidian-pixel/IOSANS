/**
 * SetVariableNode Component
 * Action node for setting or transforming data
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";

function SetVariableNode({ data }) {
  return (
    <BaseNode type="setVariable" data={data} inputs={1} outputs={1}>
      <div className="node-field">
        <label>Variable</label>
        <div className="node-preview">{data.variableName || "data"}</div>
      </div>
      <div className="node-preview" style={{ marginTop: "4px" }}>
        Mode: {data.mode || "set"}
      </div>
    </BaseNode>
  );
}

export default memo(SetVariableNode);
