/**
 * CodeExecutorNode Component
 * Action node for executing JavaScript code
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";

function CodeExecutorNode({ data }) {
  const previewCode = (data.code || "").split("\n")[0].slice(0, 40);

  return (
    <BaseNode type="codeExecutor" data={data} inputs={1} outputs={1}>
      <div className="node-preview" style={{ fontFamily: "var(--font-mono)" }}>
        {previewCode || "// JavaScript code"}
        {previewCode && previewCode.length >= 40 && "..."}
      </div>
    </BaseNode>
  );
}

export default memo(CodeExecutorNode);
