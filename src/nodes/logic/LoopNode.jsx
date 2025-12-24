/**
 * LoopNode Component
 * Logic node for iterating over arrays
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";

function LoopNode({ data }) {
  return (
    <BaseNode
      type="loop"
      data={data}
      inputs={1}
      outputs={2}
      outputLabels={["loop →", "done ✓"]}
    >
      <div className="node-field">
        <label>Iterations</label>
        <div className="node-preview">{data.iterations || 1}×</div>
      </div>
      <div className="node-field">
        <label>Items path</label>
        <div className="node-preview">{data.itemsPath || "items"}</div>
      </div>
    </BaseNode>
  );
}

export default memo(LoopNode);
