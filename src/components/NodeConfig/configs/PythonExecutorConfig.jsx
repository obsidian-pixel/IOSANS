/**
 * PythonExecutorConfig Component
 * Configuration panel for Python Executor node with Monaco Editor
 */
import { memo, useCallback } from "react";
import Editor from "@monaco-editor/react";

function PythonExecutorConfig({ data, onUpdate }) {
  const handleEditorChange = useCallback(
    (value) => {
      onUpdate({ code: value || "" });
    },
    [onUpdate]
  );

  const defaultCode = `# Access input via 'input' variable
# Set 'result' to output data
result = input`;

  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Python Code</div>

        <div className="config-field monaco-container">
          <Editor
            height="250px"
            language="python"
            theme="vs-dark"
            value={data.code || defaultCode}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "gutter",
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
          <p className="hint">
            Use 'input' to access incoming data. Set 'result' for output.
          </p>
        </div>

        <div className="config-field">
          <label>Required Packages</label>
          <input
            type="text"
            value={(data.packages || []).join(", ")}
            onChange={(e) =>
              onUpdate({
                packages: e.target.value
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
            }
            placeholder="numpy, pandas, matplotlib"
          />
          <p className="hint">Comma-separated list of pip packages</p>
        </div>

        <div className="config-field">
          <label>Timeout (ms)</label>
          <input
            type="number"
            value={data.timeout || 30000}
            onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) })}
            min={1000}
            max={300000}
          />
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">💡 Tips</div>
        <ul className="hint-list">
          <li>First run downloads Pyodide (~15MB)</li>
          <li>Supports numpy, pandas, scipy, matplotlib</li>
          <li>All execution happens locally</li>
        </ul>
      </div>
    </div>
  );
}

export default memo(PythonExecutorConfig);
