/**
 * IfElseNode Component
 * Logic node for conditional branching
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";

function IfElseNode({ data }) {
  return (
    <BaseNode
      type="ifElse"
      data={data}
      inputs={1}
      outputs={2}
      outputLabels={["true", "false"]}
    >
      <div className="node-preview">{data.condition || "No condition set"}</div>
    </BaseNode>
  );
}

export default memo(IfElseNode);
