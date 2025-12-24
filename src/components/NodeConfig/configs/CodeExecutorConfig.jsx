/**
 * CodeExecutorConfig Component
 * Configuration panel for Code Executor nodes with Monaco Editor and CDN support
 */
import { memo, useCallback, useState } from "react";
import Editor from "@monaco-editor/react";
import { CDN_EXAMPLES } from "../../../utils/cdnLoader";

function CodeExecutorConfig({ data, onUpdate }) {
  const [showCDNPicker, setShowCDNPicker] = useState(false);

  const handleEditorChange = useCallback(
    (value) => {
      onUpdate({ code: value || "" });
    },
    [onUpdate]
  );

  const handleAddCDN = useCallback(
    (url) => {
      const currentUrls = data.cdnUrls || [];
      if (!currentUrls.includes(url)) {
        onUpdate({ cdnUrls: [...currentUrls, url] });
      }
      setShowCDNPicker(false);
    },
    [data.cdnUrls, onUpdate]
  );

  const handleRemoveCDN = useCallback(
    (url) => {
      const currentUrls = data.cdnUrls || [];
      onUpdate({ cdnUrls: currentUrls.filter((u) => u !== url) });
    },
    [data.cdnUrls, onUpdate]
  );

  const defaultCode = `// Access input data via \`input\`
// Return output data
return input;`;

  const cdnUrls = data.cdnUrls || [];

  return (
    <div className="code-executor-config">
      <div className="config-section">
        <div className="config-section-title">JavaScript Code</div>

        <div className="config-field monaco-container">
          <Editor
            height="200px"
            language="javascript"
            theme="vs-dark"
            value={data.code || defaultCode}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "gutter",
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>

        <div className="code-help">
          <p className="hint">
            <strong>Available:</strong> <code>input</code>, <code>context</code>
          </p>
        </div>
      </div>

      {/* CDN Libraries Section */}
      <div className="config-section">
        <div className="config-section-title">
          📦 CDN Libraries
          <button
            className="add-cdn-btn"
            onClick={() => setShowCDNPicker(!showCDNPicker)}
            title="Add library"
          >
            +
          </button>
        </div>

        {/* Library picker dropdown */}
        {showCDNPicker && (
          <div className="cdn-picker">
            {CDN_EXAMPLES.map((lib) => (
              <button
                key={lib.name}
                className="cdn-option"
                onClick={() => handleAddCDN(lib.url)}
              >
                <strong>{lib.name}</strong>
                <span className="cdn-global">window.{lib.globalName}</span>
              </button>
            ))}
            <div className="cdn-custom">
              <input
                type="text"
                placeholder="https://cdn.jsdelivr.net/npm/..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    handleAddCDN(e.target.value.trim());
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Loaded libraries */}
        {cdnUrls.length > 0 ? (
          <div className="cdn-list">
            {cdnUrls.map((url) => {
              const lib = CDN_EXAMPLES.find((l) => l.url === url);
              return (
                <div key={url} className="cdn-item">
                  <span className="cdn-name">
                    {lib?.name || url.split("/").pop()}
                  </span>
                  <button
                    className="cdn-remove"
                    onClick={() => handleRemoveCDN(url)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="hint" style={{ marginTop: "8px" }}>
            No libraries loaded. Click + to add.
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(CodeExecutorConfig);
