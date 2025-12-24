/**
 * ExecutionPanel Component
 * Shows execution logs, debug output, and node results with tabbed interface
 */
import { memo, useRef, useEffect, useState, useCallback } from "react";
import useExecutionStore from "../../store/executionStore";
import DataViewer from "../DataViewer/DataViewer";
import "./ExecutionPanel.css";

function ExecutionPanel() {
  const logsEndRef = useRef(null);
  const [selectedLogId] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [expandedArtifacts, setExpandedArtifacts] = useState(new Set());
  const [activeTab, setActiveTab] = useState("logs"); // logs, output, artifacts

  // Resize state
  const [panelWidth, setPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startWidth: 320 });

  const logs = useExecutionStore((state) => state.logs);
  const artifacts = useExecutionStore((state) => state.artifacts);
  const isRunning = useExecutionStore((state) => state.isRunning);
  const currentNodeId = useExecutionStore((state) => state.currentNodeId);
  const getExecutionDuration = useExecutionStore(
    (state) => state.getExecutionDuration
  );
  const clearLogs = useExecutionStore((state) => state.clearLogs);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (activeTab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  // Get selected log data for DataViewer
  const selectedLog = logs.find((l) => l.id === selectedLogId);

  // Extract outputs from logs (for output tab)
  const outputs = logs.filter((l) => l.data && l.type !== "artifact");

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const getLogIcon = (type) => {
    switch (type) {
      case "info":
        return "ℹ️";
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "ai":
        return "🤖";
      case "node":
        return "📦";
      case "artifact":
        return "📎";
      default:
        return "•";
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Toggle log expansion
  const toggleLogExpand = (logId) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Toggle artifact expansion for preview
  const toggleArtifactExpand = useCallback((artifactId) => {
    setExpandedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(artifactId)) {
        next.delete(artifactId);
      } else {
        next.add(artifactId);
      }
      return next;
    });
  }, []);

  // Download artifact
  const handleDownloadArtifact = useCallback((artifact) => {
    const content = artifact.data;
    let blob;

    if (content instanceof Blob) {
      blob = content;
    } else if (typeof content === "string") {
      blob = new Blob([content], { type: artifact.type || "text/plain" });
    } else {
      blob = new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.name || `artifact_${artifact.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Get artifact icon based on type
  const getArtifactIcon = useCallback((type) => {
    if (!type) return "📎";
    if (type.includes("audio")) return "🎵";
    if (type.includes("image")) return "🖼️";
    if (type.includes("json")) return "📋";
    if (type.includes("text")) return "📄";
    return "📎";
  }, []);

  // Copy all logs to clipboard
  const handleCopyLogs = async () => {
    const logText = logs
      .map((log) => {
        const time = formatTimestamp(log.timestamp);
        const node = log.nodeName || log.nodeId || "";
        const data = log.data
          ? `\n  Data: ${JSON.stringify(log.data, null, 2)}`
          : "";
        return `[${time}] ${node ? `[${node}] ` : ""}${log.message}${data}`;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(logText);
      alert("Logs copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  // Handle resize
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: panelWidth,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = resizeRef.current.startX - e.clientX;
      const newWidth = Math.max(
        240,
        Math.min(600, resizeRef.current.startWidth + deltaX)
      );
      setPanelWidth(newWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  return (
    <aside
      className={`execution-panel ${isResizing ? "resizing" : ""}`}
      style={{ width: `${panelWidth}px` }}
    >
      {/* Resize handle */}
      <div
        className="ep-resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
      <header className="panel-header">
        <div className="panel-tabs">
          <button
            className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            📋 Logs
            {logs.length > 0 && (
              <span className="tab-badge">{logs.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === "output" ? "active" : ""}`}
            onClick={() => setActiveTab("output")}
          >
            📊 Output
            {outputs.length > 0 && (
              <span className="tab-badge">{outputs.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === "artifacts" ? "active" : ""}`}
            onClick={() => setActiveTab("artifacts")}
          >
            📎 Artifacts
            {artifacts.length > 0 && (
              <span className="tab-badge">{artifacts.length}</span>
            )}
          </button>
        </div>
        <div className="panel-actions">
          {isRunning && (
            <span className="running-indicator">
              <span className="pulse-dot" />
              Running...
            </span>
          )}
          <button
            className="btn-icon"
            onClick={handleCopyLogs}
            title="Copy all logs"
            disabled={logs.length === 0}
          >
            📋
          </button>
          <button
            className="btn-icon"
            onClick={clearLogs}
            title="Clear logs"
            disabled={logs.length === 0}
          >
            🗑️
          </button>
        </div>
      </header>

      <div className="panel-content">
        {/* Logs Tab */}
        {activeTab === "logs" && (
          <>
            {logs.length === 0 ? (
              <div className="empty-logs">
                <p>No logs yet</p>
                <p className="hint">Run a workflow to see execution logs</p>
              </div>
            ) : (
              <div className="logs-list">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`log-entry log-${log.type || "info"} ${
                      selectedLogId === log.id ? "selected" : ""
                    } ${log.data ? "has-data" : ""} ${
                      expandedLogs.has(log.id) ? "expanded" : ""
                    }`}
                  >
                    <div
                      className="log-main"
                      onClick={() => toggleLogExpand(log.id)}
                    >
                      <span className="log-icon">{getLogIcon(log.type)}</span>
                      <span className="log-time">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <div className="log-content">
                        {log.nodeId && (
                          <span className="log-node">
                            [{log.nodeName || log.nodeId}]
                          </span>
                        )}
                        <span
                          className={`log-message ${
                            expandedLogs.has(log.id) ? "expanded" : ""
                          }`}
                        >
                          {log.message}
                        </span>
                        {(log.data || log.message.length > 60) && (
                          <span
                            className="log-expand-indicator"
                            title="Click to expand"
                          >
                            {expandedLogs.has(log.id) ? "▼" : "▶"}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedLogs.has(log.id) && log.data && (
                      <div className="log-data-expanded">
                        <DataViewer data={log.data} />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </>
        )}

        {/* Output Tab */}
        {activeTab === "output" && (
          <>
            {outputs.length === 0 ? (
              <div className="empty-logs">
                <p>No output data yet</p>
                <p className="hint">Node outputs will appear here</p>
              </div>
            ) : (
              <div className="outputs-list">
                {outputs.map((log) => (
                  <div key={log.id} className="output-item">
                    <div className="output-header">
                      <span className="output-node">
                        {getLogIcon(log.type)} {log.nodeName || log.nodeId}
                      </span>
                      <span className="output-time">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="output-data">
                      <DataViewer data={log.data} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Artifacts Tab */}
        {activeTab === "artifacts" && (
          <>
            {artifacts.length === 0 ? (
              <div className="empty-logs">
                <p>No artifacts yet</p>
                <p className="hint">
                  Generated files and data will appear here
                </p>
              </div>
            ) : (
              <div className="artifacts-list">
                {artifacts.map((artifact) => {
                  const isExpanded = expandedArtifacts.has(artifact.id);
                  const isTextType =
                    artifact.type?.includes("text") ||
                    artifact.type?.includes("json");
                  const isAudioType = artifact.type?.includes("audio");
                  const dataPreview =
                    typeof artifact.data === "string"
                      ? artifact.data.slice(0, 500)
                      : JSON.stringify(artifact.data, null, 2).slice(0, 500);

                  return (
                    <div
                      key={artifact.id}
                      className={`artifact-item ${
                        isExpanded ? "expanded" : ""
                      }`}
                    >
                      <div
                        className="artifact-header"
                        onClick={() => toggleArtifactExpand(artifact.id)}
                      >
                        <span className="artifact-icon">
                          {getArtifactIcon(artifact.type)}
                        </span>
                        <div className="artifact-info">
                          <span className="artifact-name">
                            {artifact.name || "Artifact"}
                          </span>
                          <span className="artifact-meta">
                            {artifact.type?.split("/")[1] || "file"} •{" "}
                            {new Date(artifact.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="artifact-expand-icon">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="artifact-content">
                          {/* Text Preview */}
                          {isTextType && artifact.data && (
                            <pre className="artifact-preview">
                              {dataPreview}
                              {typeof artifact.data === "string" &&
                                artifact.data.length > 500 && (
                                  <span className="preview-truncated">
                                    ... (truncated)
                                  </span>
                                )}
                            </pre>
                          )}

                          {/* Audio Player */}
                          {isAudioType && artifact.data instanceof Blob && (
                            <audio
                              className="artifact-audio-player"
                              controls
                              src={URL.createObjectURL(artifact.data)}
                            />
                          )}

                          {/* Download Button */}
                          <button
                            className="artifact-download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadArtifact(artifact);
                            }}
                          >
                            ⬇️ Download
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Data Viewer Panel */}
      {selectedLog?.data && activeTab === "logs" && (
        <div className="data-viewer-panel">
          <DataViewer
            data={selectedLog.data}
            title={`Output: ${
              selectedLog.nodeName || selectedLog.nodeId || "Data"
            }`}
          />
        </div>
      )}

      {/* Status footer */}
      <footer className="panel-footer">
        <span className="execution-stats">
          {isRunning && currentNodeId && (
            <span>
              Current: <strong>{currentNodeId}</strong>
            </span>
          )}
          {!isRunning && logs.length > 0 && (
            <span>Total: {formatDuration(getExecutionDuration())}</span>
          )}
        </span>
      </footer>
    </aside>
  );
}

export default memo(ExecutionPanel);
