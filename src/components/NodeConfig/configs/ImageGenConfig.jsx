/**
 * ImageGenConfig Component
 * Configuration panel for Image Generation Node
 */
import { memo } from "react";

function ImageGenConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Model Settings</div>

        <div className="config-field">
          <label>Provider</label>
          <select
            value={data.provider || "local"}
            onChange={(e) => onUpdate({ provider: e.target.value })}
          >
            <option value="local">Local (WebSD / Browser)</option>
            <option value="openai">OpenAI (DALL-E)</option>
            <option value="stability">Stability AI</option>
          </select>
        </div>

        <div className="config-field">
          <label>Model</label>
          <input
            type="text"
            value={data.model || "stable-diffusion"}
            onChange={(e) => onUpdate({ model: e.target.value })}
            placeholder="Model ID or Name"
          />
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Generation Parameters</div>

        <div className="config-field">
          <label>Size</label>
          <select
            value={data.size || "512x512"}
            onChange={(e) => onUpdate({ size: e.target.value })}
          >
            <option value="256x256">256x256 (Fastest)</option>
            <option value="512x512">512x512 (Standard)</option>
            <option value="1024x1024">1024x1024 (HD)</option>
          </select>
        </div>

        <div className="config-field">
          <label>Negative Prompt</label>
          <textarea
            value={data.negativePrompt || ""}
            onChange={(e) => onUpdate({ negativePrompt: e.target.value })}
            placeholder="blurry, bad anatomy, text, watermark..."
            style={{ minHeight: "80px" }}
          />
          <p className="hint">What to exclude from the image</p>
        </div>

        <div className="config-row">
          <div className="config-field">
            <label>Steps</label>
            <input
              type="number"
              value={data.steps || 20}
              onChange={(e) => onUpdate({ steps: parseInt(e.target.value) })}
              min={1}
              max={50}
            />
          </div>

          <div className="config-field">
            <label>Seed</label>
            <input
              type="number"
              value={data.seed || ""}
              onChange={(e) =>
                onUpdate({
                  seed: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="Random"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ImageGenConfig);
