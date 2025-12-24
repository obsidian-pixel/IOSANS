import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import "./HTTPRequestNode.css";

function HTTPRequestNode({ data, isConnectable }) {
  const [method, setMethod] = useState(data.method || "GET");
  const [url, setUrl] = useState(data.url || "https://api.example.com/data");

  const handleMethodChange = (e) => {
    setMethod(e.target.value);
    data.method = e.target.value;
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    data.url = e.target.value;
  };

  return (
    <div className="http-node">
      <div className="node-header">
        <span className="node-icon">🌐</span>
        <span className="node-title">HTTP Request</span>
      </div>

      <div className="node-content">
        <div className="input-group">
          <select
            value={method}
            onChange={handleMethodChange}
            className="method-select"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            className="url-input"
            placeholder="https://..."
          />
        </div>
        <div className="headers-preview">
          Headers: {data.headers ? Object.keys(data.headers).length : 0}
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

export default memo(HTTPRequestNode);
