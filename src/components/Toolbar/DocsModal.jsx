import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NODE_DOCS } from "../../data/nodeDocsData";
import "./DocsModal.css";

// Navigation structure organized by category
const NAV_STRUCTURE = [
  { type: "welcome", nodes: ["welcome", "shortcuts"] },
  {
    type: "category",
    name: "Triggers",
    color: "#00c853",
    nodes: [
      "manualTrigger",
      "scheduleTrigger",
      "webhookTrigger",
      "errorTrigger",
      "browserEventTrigger",
    ],
  },
  {
    type: "category",
    name: "Actions",
    color: "#2979ff",
    nodes: [
      "output",
      "httpRequest",
      "codeExecutor",
      "setVariable",
      "fileSystem",
      "localStorage",
    ],
  },
  {
    type: "category",
    name: "Logic",
    color: "#ffab00",
    nodes: ["ifElse", "loop", "switchNode", "merge"],
  },
  {
    type: "category",
    name: "AI",
    color: "#e040fb",
    nodes: [
      "aiAgent",
      "vectorMemory",
      "waitForApproval",
      "subWorkflow",
      "textToSpeech",
      "imageGeneration",
      "pythonExecutor",
    ],
  },
];

// Static pages that aren't nodes
const STATIC_PAGES = {
  welcome: {
    id: "welcome",
    icon: "📚",
    title: "Documentation",
  },
  shortcuts: {
    id: "shortcuts",
    icon: "⌨️",
    title: "Keyboard Shortcuts",
  },
};

function DocsModal({ onClose }) {
  const [activeDoc, setActiveDoc] = useState("welcome");

  const renderNavigation = () => (
    <nav className="docs-nav">
      {NAV_STRUCTURE.map((group, idx) => (
        <div key={idx} className="nav-category">
          {group.type === "category" && (
            <div className="nav-category-title" style={{ color: group.color }}>
              {group.name}
            </div>
          )}
          {group.nodes.map((nodeId) => {
            const doc = NODE_DOCS[nodeId] || STATIC_PAGES[nodeId];
            if (!doc) return null;
            return (
              <div
                key={nodeId}
                className={`nav-item ${activeDoc === nodeId ? "active" : ""}`}
                onClick={() => setActiveDoc(nodeId)}
              >
                <span className="nav-item-icon">{doc.icon}</span>
                <span>{doc.title}</span>
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const renderWelcome = () => (
    <div className="welcome-content">
      <h1>📚 IOSANS Documentation</h1>
      <p className="tagline">
        Welcome to the Infinite Open Source Automation System. Build powerful,
        local-first AI workflows with complete privacy and control.
      </p>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon">🔒</div>
          <h4>100% Local</h4>
          <p>
            All processing happens in your browser. No data leaves your device.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">🤖</div>
          <h4>WebLLM AI</h4>
          <p>Run powerful LLMs directly in your browser using WebGPU.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">🔄</div>
          <h4>Visual Workflows</h4>
          <p>Drag-and-drop node editor for building complex automations.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">💾</div>
          <h4>Artifacts</h4>
          <p>All outputs are saved as artifacts for future reference.</p>
        </div>
      </div>

      <div className="article-section" style={{ marginTop: 32 }}>
        <h3>🚀 Getting Started</h3>
        <p>
          1. Drag a <strong>Manual Trigger</strong> from the sidebar to start
          your workflow.
          <br />
          2. Add nodes like <strong>AI Agent</strong>,{" "}
          <strong>Code Executor</strong>, or <strong>HTTP Request</strong>.
          <br />
          3. Connect nodes by dragging from output handles (right) to input
          handles (left).
          <br />
          4. Click <strong>Run</strong> to execute your workflow.
        </p>
      </div>

      <div className="article-section">
        <h3>📦 Node Categories</h3>
        <div className="config-table">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: "#00c853" }}>Triggers</td>
                <td>5</td>
                <td>
                  Start workflows (manual, schedule, webhook, error, browser)
                </td>
              </tr>
              <tr>
                <td style={{ color: "#2979ff" }}>Actions</td>
                <td>6</td>
                <td>Perform operations (HTTP, code, files, storage)</td>
              </tr>
              <tr>
                <td style={{ color: "#ffab00" }}>Logic</td>
                <td>4</td>
                <td>Control flow (if/else, loop, switch, merge)</td>
              </tr>
              <tr>
                <td style={{ color: "#e040fb" }}>AI</td>
                <td>7</td>
                <td>AI capabilities (LLM, memory, TTS, images, Python)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderShortcuts = () => (
    <div className="docs-article">
      <div className="article-header">
        <div className="article-icon">⌨️</div>
        <div>
          <h2 className="article-title">Keyboard Shortcuts</h2>
        </div>
      </div>

      <div className="article-section">
        <h3>General</h3>
        <div className="shortcuts-list">
          <div className="shortcut-row">
            <span>Save Workflow</span>
            <span className="shortcut-key">Ctrl + S</span>
          </div>
          <div className="shortcut-row">
            <span>Run Workflow</span>
            <span className="shortcut-key">Ctrl + Enter</span>
          </div>
          <div className="shortcut-row">
            <span>Undo</span>
            <span className="shortcut-key">Ctrl + Z</span>
          </div>
          <div className="shortcut-row">
            <span>Redo</span>
            <span className="shortcut-key">Ctrl + Shift + Z</span>
          </div>
        </div>
      </div>

      <div className="article-section">
        <h3>Node Operations</h3>
        <div className="shortcuts-list">
          <div className="shortcut-row">
            <span>Delete Selected</span>
            <span className="shortcut-key">Delete / Backspace</span>
          </div>
          <div className="shortcut-row">
            <span>Copy Node</span>
            <span className="shortcut-key">Ctrl + C</span>
          </div>
          <div className="shortcut-row">
            <span>Paste Node</span>
            <span className="shortcut-key">Ctrl + V</span>
          </div>
          <div className="shortcut-row">
            <span>Duplicate Node</span>
            <span className="shortcut-key">Ctrl + D</span>
          </div>
          <div className="shortcut-row">
            <span>Select All</span>
            <span className="shortcut-key">Ctrl + A</span>
          </div>
        </div>
      </div>

      <div className="article-section">
        <h3>Canvas Navigation</h3>
        <div className="shortcuts-list">
          <div className="shortcut-row">
            <span>Pan Canvas</span>
            <span className="shortcut-key">Space + Drag</span>
          </div>
          <div className="shortcut-row">
            <span>Zoom In/Out</span>
            <span className="shortcut-key">Ctrl + +/-</span>
          </div>
          <div className="shortcut-row">
            <span>Fit to Screen</span>
            <span className="shortcut-key">Ctrl + 0</span>
          </div>
          <div className="shortcut-row">
            <span>Scroll Zoom</span>
            <span className="shortcut-key">Mouse Wheel</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNodeArticle = (nodeId) => {
    const doc = NODE_DOCS[nodeId];
    if (!doc) return null;

    return (
      <div className="docs-article">
        {/* Header */}
        <div className="article-header">
          <div className="article-icon">{doc.icon}</div>
          <div>
            <h2 className="article-title">{doc.title}</h2>
            {doc.category && (
              <div className="article-category">{doc.category}</div>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="article-section">
          <h3>📖 Overview</h3>
          <p>{doc.overview}</p>
        </div>

        {/* Technical Details */}
        {doc.technicalDetails && (
          <div className="article-section">
            <h3>🔧 Technical Details</h3>
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {doc.technicalDetails.trim()}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Configuration */}
        {doc.config && doc.config.length > 0 && (
          <div className="article-section">
            <h3>⚙️ Configuration</h3>
            <table className="config-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {doc.config.map((cfg, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{cfg.name}</strong>
                    </td>
                    <td>
                      <code>{cfg.type}</code>
                    </td>
                    <td>{cfg.desc}</td>
                    <td>
                      <code>{cfg.default || "-"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Examples */}
        {doc.examples && doc.examples.length > 0 && (
          <div className="article-section">
            <h3>💡 Examples</h3>
            {doc.examples.map((example, i) => (
              <div key={i} className="example-block">
                <h4>{example.title}</h4>
                <p className="example-desc">{example.description}</p>

                {example.config && (
                  <div className="example-config">
                    <strong>Configuration:</strong>
                    <div className="code-block">{example.config}</div>
                  </div>
                )}

                {example.code && (
                  <div className="example-code">
                    <strong>Code:</strong>
                    <div className="code-block">{example.code}</div>
                  </div>
                )}

                {example.flow && (
                  <div className="example-flow">
                    <strong>Workflow:</strong>
                    <div className="code-block">{example.flow}</div>
                  </div>
                )}

                {example.output && (
                  <div className="example-output">
                    <strong>Output:</strong>
                    <div className="code-block">{example.output}</div>
                  </div>
                )}

                {example.routing && (
                  <div className="example-routing">
                    <strong>Routing:</strong>
                    <div className="code-block">{example.routing}</div>
                  </div>
                )}

                {example.result && (
                  <div className="example-result">
                    <strong>Result:</strong>
                    <div className="code-block">{example.result}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Connections */}
        {doc.connections && (
          <div className="article-section">
            <h3>🔌 Connections</h3>
            <div className="connections-info">
              <div className="connection-item">
                <span className="connection-label">Inputs:</span>
                <span className="connection-value">
                  {doc.connections.inputs}
                </span>
              </div>
              <div className="connection-item">
                <span className="connection-label">Outputs:</span>
                <span className="connection-value">
                  {doc.connections.outputs}
                </span>
              </div>
              {doc.connections.outputLabels && (
                <div className="connection-item">
                  <span className="connection-label">Output Labels:</span>
                  <span className="connection-value">
                    {doc.connections.outputLabels.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        {doc.tips && doc.tips.length > 0 && (
          <div className="article-section">
            <h3>💡 Tips & Best Practices</h3>
            <ul className="tips-list">
              {doc.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (activeDoc === "welcome") return renderWelcome();
    if (activeDoc === "shortcuts") return renderShortcuts();
    return renderNodeArticle(activeDoc);
  };

  return (
    <div className="docs-overlay" onClick={onClose}>
      <div className="docs-modal" onClick={(e) => e.stopPropagation()}>
        <header className="docs-header">
          <h2>📚 IOSANS Documentation</h2>
          <button className="docs-close-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="docs-body">
          {renderNavigation()}
          <div className="docs-content">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(DocsModal);
