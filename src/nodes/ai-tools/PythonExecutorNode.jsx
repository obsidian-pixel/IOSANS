/**
 * PythonExecutorNode Component
 * Execute Python code locally using Pyodide
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./PythonExecutorNode.css";

function PythonExecutorNode({ data }) {
  // const packages = data.packages || []; // Removed unused

  return (
    <BaseNode
      type="pythonExecutor"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "tool-out", type: "tool", label: null }}
    >
      <div
        className="python-content"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px",
        }}
      >
        <div
          className="python-icon"
          style={{ fontSize: "24px", marginBottom: "8px" }}
        >
          🐍
        </div>
        <div
          className="python-label"
          style={{ fontSize: "12px", fontWeight: "500" }}
        >
          Python (Pyodide)
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(PythonExecutorNode);
