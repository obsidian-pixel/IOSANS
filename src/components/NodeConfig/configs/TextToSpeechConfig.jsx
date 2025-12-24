/**
 * TextToSpeechConfig Component
 * Configuration panel for Text to Speech node
 */
import { memo } from "react";

function TextToSpeechConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Voice Settings</div>

        <div className="config-field">
          <label>Provider</label>
          <select
            value={data.provider || "webSpeech"}
            onChange={(e) => onUpdate({ provider: e.target.value })}
          >
            <option value="webSpeech">Web Speech API (Local)</option>
            <option value="elevenlabs">ElevenLabs (API Key Required)</option>
          </select>
        </div>

        <div className="config-field">
          <label>Voice</label>
          <select
            value={data.voice || "default"}
            onChange={(e) => onUpdate({ voice: e.target.value })}
          >
            <option value="default">Default</option>
            <option value="Microsoft David">Microsoft David</option>
            <option value="Microsoft Zira">Microsoft Zira</option>
            <option value="Google US English">Google US English</option>
          </select>
          <p className="hint">Available voices depend on your browser</p>
        </div>

        <div className="config-row">
          <div className="config-field">
            <label>Speed</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={data.speed || 1.0}
              onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) })}
            />
            <span className="hint">{data.speed || 1.0}x</span>
          </div>

          <div className="config-field">
            <label>Pitch</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={data.pitch || 1.0}
              onChange={(e) => onUpdate({ pitch: parseFloat(e.target.value) })}
            />
            <span className="hint">{data.pitch || 1.0}</span>
          </div>
        </div>

        <div className="config-toggle">
          <label>Auto-play audio</label>
          <div
            className={`toggle-switch ${
              data.autoPlay !== false ? "active" : ""
            }`}
            onClick={() => onUpdate({ autoPlay: data.autoPlay === false })}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(TextToSpeechConfig);
