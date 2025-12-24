/**
 * OutputNode Component
 * Terminal node that collects and displays workflow output
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./OutputNode.css";

function OutputNode({ data }) {
  const getOutputTypeLabel = () => {
    switch (data.outputType) {
      case "file":
        return "📁 File";
      case "notification":
        return "🔔 Notify";
      case "artifact":
        return "📎 Artifact";
      default:
        return "🖥️ Console";
    }
  };

  return (
    <BaseNode type="output" data={data} inputs={1} outputs={0}>
      <div className="output-node-body">
        <div className="output-type-badge">{getOutputTypeLabel()}</div>
      </div>
    </BaseNode>
  );
}

export default memo(OutputNode);
