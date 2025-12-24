/**
 * FileSystemNode Component
 * Read/write to local file system using File System Access API
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./FileSystemNode.css";

function FileSystemNode({ data }) {
  const mode = data.mode || "read";
  // const filename = data.filename || ""; // Removed unused

  return (
    <BaseNode
      type="fileSystem"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "tool-out", type: "tool", label: null }}
    >
      <div
        className="filesystem-content"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px",
        }}
      >
        <div className="mode-badge" style={{ marginBottom: "5px" }}>
          <span className="mode-icon" style={{ fontSize: "24px" }}>
            📁
          </span>
        </div>

        <div className="filename-display">
          <span
            className="mode-label"
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              fontWeight: "bold",
            }}
          >
            {mode === "read" ? "Read File" : "Write File"}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(FileSystemNode);
