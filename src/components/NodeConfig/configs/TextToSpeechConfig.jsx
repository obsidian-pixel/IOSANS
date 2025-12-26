/**
 * TextToSpeechConfig Component
 * Configuration panel for Text to Speech node
 */
import { memo } from "react";

function TextToSpeechConfig({ data, onUpdate }) {
  const provider = data.provider || "mespeak"; // Default to mespeak for audio file output

  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Voice Settings</div>

        <div className="config-field">
          <label>Provider</label>
          <select
            value={provider}
            onChange={(e) => onUpdate({ provider: e.target.value })}
          >
            <option value="mespeak">Mespeak (Local - Audio File)</option>
            <option value="webSpeech">Web Speech API (Browser Only)</option>
            <option value="elevenlabs">ElevenLabs (API Key Required)</option>
          </select>
          <p className="hint">
            {provider === "mespeak" && "Generates WAV audio files locally"}
            {provider === "webSpeech" && "Uses browser TTS - no file export"}
            {provider === "elevenlabs" && "High quality - requires API key"}
          </p>
        </div>

        {/* Voice selection for Web Speech API */}
        {provider === "webSpeech" && (
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
        )}

        {/* Voice selection for Mespeak */}
        {provider === "mespeak" && (
          <div className="config-field">
            <label>Voice</label>
            <select
              value={data.mespeakVoice || "en-us"}
              onChange={(e) => onUpdate({ mespeakVoice: e.target.value })}
            >
              <option value="en-us">English (US)</option>
              <option value="en">English (UK)</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="it">Italian</option>
            </select>
          </div>
        )}

        <div className="config-row">
          <div className="config-field">
            <label>Speed</label>
            <input
              type="range"
              min={provider === "mespeak" ? "80" : "0.5"}
              max={provider === "mespeak" ? "450" : "2"}
              step={provider === "mespeak" ? "10" : "0.1"}
              value={data.speed || (provider === "mespeak" ? 175 : 1.0)}
              onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) })}
            />
            <span className="hint">
              {provider === "mespeak"
                ? `${data.speed || 175} wpm`
                : `${data.speed || 1.0}x`}
            </span>
          </div>

          <div className="config-field">
            <label>Pitch</label>
            <input
              type="range"
              min={provider === "mespeak" ? "0" : "0.5"}
              max={provider === "mespeak" ? "99" : "2"}
              step={provider === "mespeak" ? "1" : "0.1"}
              value={data.pitch || (provider === "mespeak" ? 50 : 1.0)}
              onChange={(e) => onUpdate({ pitch: parseFloat(e.target.value) })}
            />
            <span className="hint">
              {provider === "mespeak"
                ? `${data.pitch || 50}`
                : `${data.pitch || 1.0}`}
            </span>
          </div>
        </div>

        <div className="config-toggle">
          <label>Auto-play audio</label>
          <div
            className={`toggle-switch ${
              data.autoPlay === true ? "active" : ""
            }`}
            onClick={() => onUpdate({ autoPlay: !data.autoPlay })}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(TextToSpeechConfig);
