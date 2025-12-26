/**
 * ExecutionPanel Component
 * Shows execution logs, debug output, and node results with tabbed interface
 */
import { memo, useRef, useEffect, useState, useCallback, useMemo } from "react";
import useExecutionStore from "../../store/executionStore";
import DataViewer from "../DataViewer/DataViewer";
import {
  getAllArtifacts,
  deleteArtifact,
  deleteArtifacts,
} from "../../utils/artifactStorage";
import "./ExecutionPanel.css";

function ExecutionPanel() {
  const logsEndRef = useRef(null);
  const [selectedLogId] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [expandedArtifacts, setExpandedArtifacts] = useState(new Set());
  const [activeTab, setActiveTab] = useState("logs"); // logs, output, artifacts
  const [persistedArtifacts, setPersistedArtifacts] = useState([]);
  const [artifactUrls, setArtifactUrls] = useState({}); // Object URL cache
  const [selectedArtifacts, setSelectedArtifacts] = useState(new Set()); // For batch delete // Object URL cache

  // Resize state
  const [panelWidth, setPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startWidth: 320 });

  const logs = useExecutionStore((state) => state.logs);
  const sessionArtifacts = useExecutionStore((state) => state.artifacts);
  const isRunning = useExecutionStore((state) => state.isRunning);
  const currentNodeId = useExecutionStore((state) => state.currentNodeId);
  const getExecutionDuration = useExecutionStore(
    (state) => state.getExecutionDuration
  );
  const clearLogs = useExecutionStore((state) => state.clearLogs);
  const removeArtifactsFromStore = useExecutionStore(
    (state) => state.removeArtifacts
  );

  // Combine session artifacts with persisted artifacts (dedupe by id)
  const artifacts = useMemo(() => {
    const combined = [...sessionArtifacts];
    for (const pa of persistedArtifacts) {
      if (!combined.find((a) => a.id === pa.id)) {
        combined.push(pa);
      }
    }
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [sessionArtifacts, persistedArtifacts]);

  // Load artifacts from IndexedDB on mount
  useEffect(() => {
    getAllArtifacts(50).then(setPersistedArtifacts).catch(console.error);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(artifactUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [artifactUrls]);

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
    if (type.includes("speech")) return "🔊"; // Speech synthesis metadata
    if (type.includes("audio")) return "🎵";
    if (type.includes("video")) return "🎬";
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

  // Toggle artifact selection for batch delete
  const toggleArtifactSelection = useCallback((artifactId) => {
    setSelectedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(artifactId)) {
        next.delete(artifactId);
      } else {
        next.add(artifactId);
      }
      return next;
    });
  }, []);

  // Select/deselect all artifacts
  const toggleSelectAll = useCallback(() => {
    if (selectedArtifacts.size === artifacts.length) {
      setSelectedArtifacts(new Set());
    } else {
      setSelectedArtifacts(new Set(artifacts.map((a) => a.id)));
    }
  }, [selectedArtifacts.size, artifacts]);

  // Batch delete selected artifacts
  const handleBatchDelete = useCallback(async () => {
    if (selectedArtifacts.size === 0) return;

    const count = selectedArtifacts.size;
    if (!window.confirm(`Delete ${count} artifact${count > 1 ? "s" : ""}?`))
      return;

    const idsToDelete = Array.from(selectedArtifacts);
    await deleteArtifacts(idsToDelete);

    // Update persisted state
    setPersistedArtifacts((prev) =>
      prev.filter((a) => !selectedArtifacts.has(a.id))
    );

    // Also remove from session store
    removeArtifactsFromStore(idsToDelete);

    // Revoke URLs for deleted artifacts
    idsToDelete.forEach((id) => {
      if (artifactUrls[id]) {
        URL.revokeObjectURL(artifactUrls[id]);
      }
    });
    setArtifactUrls((prev) => {
      const next = { ...prev };
      idsToDelete.forEach((id) => delete next[id]);
      return next;
    });

    setSelectedArtifacts(new Set());
  }, [selectedArtifacts, artifactUrls, removeArtifactsFromStore]);

  // Batch download selected artifacts
  const handleBatchDownload = useCallback(() => {
    if (selectedArtifacts.size === 0) return;

    const selectedList = artifacts.filter((a) => selectedArtifacts.has(a.id));

    // Download each artifact sequentially with small delay to avoid browser blocking
    selectedList.forEach((artifact, index) => {
      setTimeout(() => {
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
      }, index * 200); // 200ms delay between downloads
    });
  }, [selectedArtifacts, artifacts]);

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
                {/* Batch action toolbar */}
                <div className="artifacts-toolbar">
                  <label className="select-all-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedArtifacts.size === artifacts.length}
                      onChange={toggleSelectAll}
                    />
                    Select All
                  </label>
                  {selectedArtifacts.size > 0 && (
                    <>
                      <button
                        className="batch-download-btn"
                        onClick={handleBatchDownload}
                      >
                        📥 Download {selectedArtifacts.size}
                      </button>
                      <button
                        className="batch-delete-btn"
                        onClick={handleBatchDelete}
                      >
                        🗑️ Delete {selectedArtifacts.size}
                      </button>
                    </>
                  )}
                </div>
                {artifacts.map((artifact) => {
                  const isExpanded = expandedArtifacts.has(artifact.id);
                  const isSelected = selectedArtifacts.has(artifact.id);
                  const isTextType =
                    artifact.type?.includes("text") ||
                    artifact.type?.includes("json");
                  const isAudioType = artifact.type?.includes("audio");
                  const isImageType = artifact.type?.includes("image");
                  const isVideoType = artifact.type?.includes("video");
                  const isSpeechType = artifact.type?.includes("speech"); // TTS metadata

                  // Safe data preview - handle Blobs and circular refs
                  const getDataPreview = () => {
                    if (artifact.data instanceof Blob) {
                      return `[Blob: ${artifact.data.size} bytes, ${artifact.data.type}]`;
                    }
                    try {
                      if (typeof artifact.data === "string") {
                        return artifact.data.slice(0, 500);
                      }
                      return JSON.stringify(artifact.data, null, 2).slice(
                        0,
                        500
                      );
                    } catch {
                      return "[Unable to preview data]";
                    }
                  };

                  // Get or create Object URL for media preview
                  const getMediaUrl = () => {
                    if (artifactUrls[artifact.id]) {
                      return artifactUrls[artifact.id];
                    }
                    if (artifact.data instanceof Blob) {
                      const url = URL.createObjectURL(artifact.data);
                      setArtifactUrls((prev) => ({
                        ...prev,
                        [artifact.id]: url,
                      }));
                      return url;
                    }
                    // Handle data URIs
                    if (
                      typeof artifact.data === "string" &&
                      artifact.data.startsWith("data:")
                    ) {
                      return artifact.data;
                    }
                    return null;
                  };

                  // Handle delete
                  const handleDelete = async (e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this artifact?")) {
                      await deleteArtifact(artifact.id);
                      setPersistedArtifacts((prev) =>
                        prev.filter((a) => a.id !== artifact.id)
                      );
                      // Revoke URL if cached
                      if (artifactUrls[artifact.id]) {
                        URL.revokeObjectURL(artifactUrls[artifact.id]);
                        setArtifactUrls((prev) => {
                          const next = { ...prev };
                          delete next[artifact.id];
                          return next;
                        });
                      }
                    }
                  };

                  return (
                    <div
                      key={artifact.id}
                      className={`artifact-item ${
                        isExpanded ? "expanded" : ""
                      } ${isSelected ? "selected" : ""}`}
                    >
                      <div
                        className="artifact-header"
                        onClick={() => toggleArtifactExpand(artifact.id)}
                      >
                        <input
                          type="checkbox"
                          className="artifact-checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleArtifactSelection(artifact.id)}
                        />
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
                              {getDataPreview()}
                              {typeof artifact.data === "string" &&
                                artifact.data.length > 500 && (
                                  <span className="preview-truncated">
                                    ... (truncated)
                                  </span>
                                )}
                            </pre>
                          )}

                          {/* Image Preview */}
                          {isImageType && (
                            <div className="artifact-image-preview">
                              {artifact.data instanceof Blob ? (
                                <img
                                  src={getMediaUrl()}
                                  alt={artifact.name || "Image"}
                                  className="artifact-image"
                                />
                              ) : typeof artifact.data === "string" &&
                                artifact.data.startsWith("data:") ? (
                                <img
                                  src={artifact.data}
                                  alt={artifact.name || "Image"}
                                  className="artifact-image"
                                />
                              ) : (
                                <span className="preview-placeholder">
                                  Image data unavailable
                                </span>
                              )}
                            </div>
                          )}

                          {/* Audio Player */}
                          {isAudioType &&
                            (artifact.data instanceof Blob ||
                              (typeof artifact.data === "string" &&
                                artifact.data.startsWith("data:audio"))) && (
                              <audio
                                className="artifact-audio-player"
                                controls
                                src={getMediaUrl()}
                              />
                            )}

                          {/* Video Player */}
                          {isVideoType &&
                            (artifact.data instanceof Blob ||
                              (typeof artifact.data === "string" &&
                                artifact.data.startsWith("data:video"))) && (
                              <video
                                className="artifact-video-player"
                                controls
                                src={getMediaUrl()}
                              />
                            )}

                          {/* Speech Playback (TTS Metadata) */}
                          {isSpeechType && (
                            <div className="artifact-speech-player">
                              <button
                                className="speech-play-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Parse speech metadata and play via Web Speech API
                                  try {
                                    const speechData =
                                      typeof artifact.data === "string"
                                        ? JSON.parse(artifact.data)
                                        : artifact.data;
                                    if (speechData?.text) {
                                      const utterance =
                                        new SpeechSynthesisUtterance(
                                          speechData.text
                                        );
                                      if (speechData.speed)
                                        utterance.rate = speechData.speed;
                                      if (speechData.pitch)
                                        utterance.pitch = speechData.pitch;
                                      window.speechSynthesis.speak(utterance);
                                    }
                                  } catch (err) {
                                    console.error(
                                      "Failed to play speech:",
                                      err
                                    );
                                  }
                                }}
                              >
                                ▶️ Play Speech
                              </button>
                              <button
                                className="speech-stop-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.speechSynthesis.cancel();
                                }}
                              >
                                ⏹️ Stop
                              </button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="artifact-actions">
                            <button
                              className="artifact-download-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadArtifact(artifact);
                              }}
                            >
                              ⬇️ Download
                            </button>
                            <button
                              className="artifact-delete-btn"
                              onClick={handleDelete}
                            >
                              🗑️ Delete
                            </button>
                          </div>
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
