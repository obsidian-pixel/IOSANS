/**
 * HTTPRequestNode Component
 * Action node for making HTTP requests
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./HTTPRequestNode.css";

function HTTPRequestNode({ data }) {
  const methodColors = {
    GET: "#00c853",
    POST: "#2979ff",
    PUT: "#ffab00",
    DELETE: "#ff5252",
    PATCH: "#e040fb",
  };

  return (
    <BaseNode
      type="httpRequest"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "tool-out", type: "tool", label: null }}
    >
      <div
        className="http-content"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px",
        }}
      >
        <div
          className="http-icon"
          style={{ fontSize: "24px", marginBottom: "8px" }}
        >
          🌐
        </div>
        <div className="node-field">
          <span
            className="http-method"
            style={{
              color: methodColors[data.method] || "#666",
              fontWeight: 600,
              fontSize: "10px",
            }}
          >
            {data.method || "GET"}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(HTTPRequestNode);
