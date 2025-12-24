import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import "./FileSystemNode.css";

function FileSystemNode({ data, isConnectable }) {
  const [operation, setOperation] = useState(data.operation || "read");
  const [path, setPath] = useState(data.path || "./data.txt");

  return (
    <div className="fs-node">
      <div className="node-header">
        <span className="node-icon">📂</span>
        <span className="node-title">File System</span>
      </div>

      <div className="node-content">
        <div className="input-group">
          <label>Op:</label>
          <select
            value={operation}
            onChange={(e) => {
              setOperation(e.target.value);
              // eslint-disable-next-line
              data.operation = e.target.value;
            }}
            className="op-select"
          >
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="append">Append</option>
            <option value="list">List Dir</option>
          </select>
        </div>

        <div className="input-group">
          <label>Path:</label>
          <input
            type="text"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              // eslint-disable-next-line
              data.path = e.target.value;
            }}
            className="path-input"
            placeholder="./path/to/file"
          />
        </div>
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

export default memo(FileSystemNode);
