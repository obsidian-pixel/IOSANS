import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import "./PythonExecutorNode.css";

function PythonExecutorNode({ data, isConnectable }) {
  const [code, setCode] = useState(
    data.code || "# Write Python code here\nprint('Hello World')"
  );

  const handleChange = (e) => {
    setCode(e.target.value);
    // Simple mock update
    // eslint-disable-next-line
    data.code = e.target.value;
  };

  return (
    <div className="python-node">
      <div className="node-header">
        <span className="node-icon">🐍</span>
        <span className="node-title">Python Executor</span>
      </div>

      <div className="node-content">
        <label>Packages:</label>
        <input
          type="text"
          placeholder="numpy, pandas"
          defaultValue={data.packages?.join(", ")}
          className="packages-input"
        />

        <label>Code:</label>
        <textarea
          value={code}
          onChange={handleChange}
          className="code-editor"
          rows={5}
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input-0"
        isConnectable={isConnectable}
        className="handle-input"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output-0"
        isConnectable={isConnectable}
        style={{ top: "30%" }}
        className="handle-output"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output-error"
        isConnectable={isConnectable}
        style={{ top: "70%" }}
        className="handle-error"
      />
    </div>
  );
}

export default memo(PythonExecutorNode);
