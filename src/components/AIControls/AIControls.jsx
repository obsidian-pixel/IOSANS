import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import ModelSwitcher from "../ModelSwitcher/ModelSwitcher";
import PrivacyMonitor from "../PrivacyMonitor/PrivacyMonitor";

import "./AIControls.css";

export default function AIControls() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);

  const handleOverseerToggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("toggleOverseer"));
  }, []);

  return (
    <>
      <div className="ai-controls-panel">
        <button
          className="ai-btn overseer-btn"
          onClick={handleOverseerToggle}
          title="Toggle Overseer Agent"
        >
          👁️ <span>Chat with Overseer</span>
        </button>

        <div className="divider"></div>

        <button
          className={`ai-btn ${showModelSwitcher ? "active" : ""}`}
          onClick={() => setShowModelSwitcher(true)}
          title="Switch Model"
        >
          🔄
        </button>

        <button
          className={`ai-btn ${showPrivacy ? "active" : ""}`}
          onClick={() => setShowPrivacy(true)}
          title="Privacy Monitor"
        >
          🛡️
        </button>
      </div>

      {showPrivacy &&
        createPortal(
          <PrivacyMonitor
            onClose={() => setShowPrivacy(false)}
            isOpen={true}
          />,
          document.body
        )}

      {showModelSwitcher &&
        createPortal(
          <ModelSwitcher
            onClose={() => setShowModelSwitcher(false)}
            isOpen={true}
          />,
          document.body
        )}
    </>
  );
}
