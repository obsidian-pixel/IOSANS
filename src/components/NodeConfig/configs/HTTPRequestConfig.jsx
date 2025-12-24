/**
 * HTTPRequestConfig Component
 * Configuration panel for HTTP Request nodes
 */
import { memo } from "react";
import ExpressionInput from "../../ExpressionInput/ExpressionInput";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

function HTTPRequestConfig({ data, onUpdate }) {
  return (
    <div className="http-request-config">
      <div className="config-section">
        <div className="config-section-title">Request</div>

        <div className="config-row">
          <div className="config-field" style={{ flex: "0 0 100px" }}>
            <label>Method</label>
            <select
              value={data.method || "GET"}
              onChange={(e) => onUpdate({ method: e.target.value })}
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="config-field">
            <label>URL</label>
            <ExpressionInput
              value={data.url || ""}
              onChange={(url) => onUpdate({ url })}
              placeholder="https://api.example.com/{{ $json.endpoint }}"
            />
            <p className="hint">Use {"{{ expression }}"} for dynamic values</p>
          </div>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Headers</div>
        <div className="config-field">
          <textarea
            value={
              typeof data.headers === "object"
                ? JSON.stringify(data.headers, null, 2)
                : data.headers || ""
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onUpdate({ headers: parsed });
              } catch {
                // Keep as string if not valid JSON
                onUpdate({ headers: e.target.value });
              }
            }}
            placeholder='{"Content-Type": "application/json"}'
            style={{ minHeight: "80px" }}
          />
          <p className="hint">JSON object with header key-value pairs</p>
        </div>
      </div>

      {data.method !== "GET" && data.method !== "HEAD" && (
        <div className="config-section">
          <div className="config-section-title">Body</div>
          <div className="config-field">
            <textarea
              value={
                typeof data.body === "object"
                  ? JSON.stringify(data.body, null, 2)
                  : data.body || ""
              }
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder='{"key": "value"}'
              style={{ minHeight: "100px" }}
            />
            <p className="hint">
              Request body (JSON or text). Use {"{{field}}"} for templating.
            </p>
          </div>
        </div>
      )}

      <div className="config-section">
        <div className="config-section-title">Options & Error Handling</div>
        <div className="config-row">
          <div className="config-field">
            <label>Timeout (ms)</label>
            <input
              type="number"
              value={data.timeout || 30000}
              onChange={(e) =>
                onUpdate({ timeout: parseInt(e.target.value, 10) })
              }
              min={1000}
              max={300000}
            />
          </div>
          <div className="config-field">
            <label>Retry Count</label>
            <input
              type="number"
              value={data.retries || 0}
              onChange={(e) =>
                onUpdate({ retries: parseInt(e.target.value, 10) })
              }
              min={0}
              max={10}
            />
            <p className="hint">0 = no retries</p>
          </div>
          <div className="config-field">
            <label>Retry Delay (ms)</label>
            <input
              type="number"
              value={data.retryDelay || 1000}
              onChange={(e) =>
                onUpdate({ retryDelay: parseInt(e.target.value, 10) })
              }
              min={100}
              max={30000}
              disabled={!data.retries || data.retries === 0}
            />
            <p className="hint">Uses exponential backoff</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(HTTPRequestConfig);
