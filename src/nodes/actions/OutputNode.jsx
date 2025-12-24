import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import "./OutputNode.css";

function OutputNode({ data, isConnectable }) {
  return (
    <div className="output-node">
      <div className="node-header">
        <span className="node-icon">📤</span>
        <span className="node-title">Output</span>
      </div>

      <div className="node-content">
        <div className="output-display">
          {data.lastOutput ? (
            <pre>{JSON.stringify(data.lastOutput, null, 2)}</pre>
          ) : (
            <span className="placeholder">No output yet...</span>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input-0"
        isConnectable={isConnectable}
        className="handle-input"
      />
    </div>
  );
}

export default memo(OutputNode);
