import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import "./ImageGenerationNode.css";

function ImageGenerationNode({ data, isConnectable }) {
  const [prompt, setPrompt] = useState(data.prompt || "");

  return (
    <div className="image-gen-node">
      <div className="node-header">
        <span className="node-icon">🎨</span>
        <span className="node-title">Image Generation</span>
      </div>

      <div className="node-content">
        <label>Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            // eslint-disable-next-line
            data.prompt = e.target.value;
          }}
          className="prompt-input"
          placeholder="Describe image..."
          rows={3}
        />

        <div className="image-preview">
          {data.lastImage ? (
            <img src={data.lastImage} alt="Generated" />
          ) : (
            <div className="placeholder">No image generated</div>
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
      <Handle
        type="source"
        position={Position.Right}
        id="output-image"
        isConnectable={isConnectable}
        className="handle-output"
      />
    </div>
  );
}

export default memo(ImageGenerationNode);
