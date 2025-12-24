/**
 * ImageGenerationNode Component
 * Generate images using AI models (WebSD, external APIs)
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./ImageGenerationNode.css";

function ImageGenerationNode({ data }) {
  const model = data.model || "stable-diffusion";
  // const size = data.size || "512x512"; // Removed unused
  // const provider = data.provider || "local"; // Removed unused

  return (
    <BaseNode
      type="imageGeneration"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "tool-out", type: "tool", label: null }}
    >
      <div
        className="imagegen-content"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px",
        }}
      >
        <div
          className="imagegen-icon"
          style={{ fontSize: "24px", marginBottom: "8px" }}
        >
          🎨
        </div>
        <div
          className="model-info"
          style={{ fontSize: "12px", fontWeight: "500" }}
        >
          {model}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(ImageGenerationNode);
