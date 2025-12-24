/**
 * ExecutionAnalytics Component
 * Visual dashboard showing execution history and performance metrics
 */
import { memo, useMemo, useState } from "react";
import useExecutionStore from "../../store/executionStore";
import "./ExecutionAnalytics.css";

function ExecutionAnalytics({ onClose }) {
  const logs = useExecutionStore((state) => state.logs);
  const nodeResults = useExecutionStore((state) => state.nodeResults);
  const [activeTab, setActiveTab] = useState("timeline");

  // Calculate execution statistics
  const stats = useMemo(() => {
    const nodeTimings = {};
    const errorCount = { total: 0, byNode: {} };
    let totalExecutions = 0;
    let totalTime = 0;

    // Aggregate data from node results
    Object.entries(nodeResults).forEach(([nodeId, result]) => {
      totalExecutions++;

      if (result.executionTime) {
        totalTime += result.executionTime;
        if (!nodeTimings[nodeId]) {
          nodeTimings[nodeId] = { times: [], avg: 0, max: 0, min: Infinity };
        }
        nodeTimings[nodeId].times.push(result.executionTime);
        nodeTimings[nodeId].max = Math.max(
          nodeTimings[nodeId].max,
          result.executionTime
        );
        nodeTimings[nodeId].min = Math.min(
          nodeTimings[nodeId].min,
          result.executionTime
        );
        nodeTimings[nodeId].avg =
          nodeTimings[nodeId].times.reduce((a, b) => a + b, 0) /
          nodeTimings[nodeId].times.length;
      }

      if (result.error || result.success === false) {
        errorCount.total++;
        errorCount.byNode[nodeId] = (errorCount.byNode[nodeId] || 0) + 1;
      }
    });

    // Calculate slowest nodes
    const slowestNodes = Object.entries(nodeTimings)
      .map(([nodeId, timing]) => ({ nodeId, avg: timing.avg, max: timing.max }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return {
      totalExecutions,
      totalTime,
      avgTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
      errorCount,
      slowestNodes,
      nodeTimings,
    };
  }, [nodeResults]);

  // Group logs by execution
  const recentLogs = useMemo(() => {
    return logs.slice(-50).reverse();
  }, [logs]);

  // Format time
  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="analytics-overlay" onClick={onClose}>
      <div className="analytics-panel" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>📊 Execution Analytics</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tab navigation */}
        <div className="analytics-tabs">
          <button
            className={`tab ${activeTab === "timeline" ? "active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            Timeline
          </button>
          <button
            className={`tab ${activeTab === "performance" ? "active" : ""}`}
            onClick={() => setActiveTab("performance")}
          >
            Performance
          </button>
          <button
            className={`tab ${activeTab === "errors" ? "active" : ""}`}
            onClick={() => setActiveTab("errors")}
          >
            Errors{" "}
            {stats.errorCount.total > 0 && (
              <span className="error-badge">{stats.errorCount.total}</span>
            )}
          </button>
        </div>

        <div className="analytics-body">
          {/* Stats summary */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.totalExecutions}</span>
              <span className="stat-label">Executions</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatTime(stats.avgTime)}</span>
              <span className="stat-label">Avg Time</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatTime(stats.totalTime)}</span>
              <span className="stat-label">Total Time</span>
            </div>
            <div className="stat-card error">
              <span className="stat-value">{stats.errorCount.total}</span>
              <span className="stat-label">Errors</span>
            </div>
          </div>

          {/* Tab content */}
          {activeTab === "timeline" && (
            <div className="timeline-section">
              <h3>Recent Activity</h3>
              <div className="timeline-list">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, i) => (
                    <div key={i} className={`timeline-item ${log.type}`}>
                      <span className="timeline-icon">
                        {log.type === "success"
                          ? "✓"
                          : log.type === "error"
                          ? "✗"
                          : log.type === "warning"
                          ? "⚠"
                          : "•"}
                      </span>
                      <span className="timeline-node">{log.nodeName}</span>
                      <span className="timeline-msg">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No execution history yet</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="performance-section">
              <h3>Slowest Nodes</h3>
              <div className="performance-list">
                {stats.slowestNodes.length > 0 ? (
                  stats.slowestNodes.map((node, i) => (
                    <div key={node.nodeId} className="performance-item">
                      <span className="rank">#{i + 1}</span>
                      <span className="node-id">
                        {node.nodeId.split("-")[0]}
                      </span>
                      <div
                        className="timing-bar"
                        style={{
                          width: `${Math.min(
                            (node.avg / (stats.slowestNodes[0]?.avg || 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                      <span className="timing-value">
                        {formatTime(node.avg)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No performance data yet</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "errors" && (
            <div className="errors-section">
              <h3>Error Log</h3>
              <div className="errors-list">
                {stats.errorCount.total > 0 ? (
                  Object.entries(stats.errorCount.byNode).map(
                    ([nodeId, count]) => (
                      <div key={nodeId} className="error-item">
                        <span className="error-count">{count}x</span>
                        <span className="error-node">
                          {nodeId.split("-")[0]}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <div className="empty-state">🎉 No errors!</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ExecutionAnalytics);
