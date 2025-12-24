/**
 * LocalStorageNode Component
 * Read/write to IndexedDB or LocalStorage
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./LocalStorageNode.css";

function LocalStorageNode({ data }) {
  const mode = data.mode || "get";
  const storageType = data.storageType || "indexedDB";
  const key = data.key || "";

  return (
    <BaseNode type="localStorage" data={data} inputs={1} outputs={1}>
      <div className="localstorage-content">
        <div className="storage-badge">
          <span className="storage-icon">💾</span>
          <span className="storage-type">{storageType}</span>
        </div>

        <div className="operation-row">
          <span className={`operation-mode ${mode}`}>
            {mode === "get" ? "GET" : mode === "set" ? "SET" : "DELETE"}
          </span>
          {key && <span className="key-name">{key}</span>}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(LocalStorageNode);
