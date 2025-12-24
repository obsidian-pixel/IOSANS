import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import "./TextToSpeechNode.css";

function TextToSpeechNode({ data, isConnectable }) {
  const [text, setText] = useState(data.text || "");
  const [voice, setVoice] = useState(data.voice || "default");

  return (
    <div className="tts-node">
      <div className="node-header">
        <span className="node-icon">🔊</span>
        <span className="node-title">Text to Speech</span>
      </div>

      <div className="node-content">
        <label>Voice:</label>
        <select
          className="voice-select"
          value={voice}
          onChange={(e) => {
            setVoice(e.target.value);
            // eslint-disable-next-line
            data.voice = e.target.value;
          }}
        >
          <option value="default">Default Voice</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="robot">Robot</option>
        </select>

        <label>Text to Speak:</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // eslint-disable-next-line
            data.text = e.target.value;
          }}
          className="tts-input"
          placeholder="Enter text..."
          rows={3}
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
        id="output-audio"
        isConnectable={isConnectable}
        className="handle-output"
      />
    </div>
  );
}

export default memo(TextToSpeechNode);
