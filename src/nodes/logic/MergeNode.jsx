/**
 * MergeNode Component
 * Logic node for combining multiple inputs
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";

function MergeNode({ data }) {
  return (
    <BaseNode type="merge" data={data} inputs={2} outputs={1}>
      <div className="node-preview">Mode: {data.mode || "wait"}</div>
    </BaseNode>
  );
}

export default memo(MergeNode);
