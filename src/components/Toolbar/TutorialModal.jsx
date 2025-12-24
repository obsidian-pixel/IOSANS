import { memo } from "react";
import "./Toolbar.css";

function TutorialModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎓 Getting Started</h2>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="tutorial-intro">
            <p>
              Welcome to <strong>IOSANS</strong>. You can learn the basics by
              reading below, or take an interactive tour of the interface.
            </p>
            <button
              className="btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                margin: "16px 0",
                fontSize: "1.1em",
              }}
              onClick={() => {
                onClose();
                window.dispatchEvent(new Event("startTour"));
              }}
            >
              🚀 Start Guided Onboarding
            </button>
          </div>

          <hr
            style={{ borderColor: "rgba(255,255,255,0.1)", margin: "20px 0" }}
          />

          <h3>📚 Quick Start Guide</h3>

          <div className="tutorial-step">
            <h4>1. Start with a Trigger</h4>
            <p>
              Drag a <strong>Manual Trigger</strong> from the sidebar (green
              category). This tells the workflow when to start running.
            </p>
          </div>

          <div className="tutorial-step">
            <h4>2. Add Intelligence</h4>
            <p>
              Add an <strong>AI Agent</strong> node. Configure its system prompt
              to define its personality and task (e.g., "Summarize this text").
            </p>
          </div>

          <div className="tutorial-step">
            <h4>3. Connect & Flow</h4>
            <p>
              Connect nodes by dragging from{" "}
              <span style={{ color: "var(--color-success)" }}>Source</span> to{" "}
              <span style={{ color: "var(--text-muted)" }}>Target</span>{" "}
              handles. Data flows along these lines.
            </p>
          </div>

          <div className="tutorial-step">
            <h4>4. View Results</h4>
            <p>
              Add an <strong>Output Node</strong> to visualize the final result,
              or inspect the <strong>Logs Panel</strong> on the right for
              detailed execution steps.
            </p>
          </div>

          <div className="tip-box">
            <strong>Pro Tip:</strong> Use the <strong>Overseer Agent</strong>{" "}
            (Eye icon) to help you build complex workflows automatically!
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TutorialModal);
