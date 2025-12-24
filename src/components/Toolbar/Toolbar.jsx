/**
 * Toolbar Component
 * Editor controls for workflow execution and management
 */
import { memo, useCallback, useRef, useState, useEffect } from "react";
import useWorkflowStore from "../../store/workflowStore";
import useExecutionStore from "../../store/executionStore";
import { useToastStore } from "../../store/toastStore";
import TutorialModal from "./TutorialModal";
import DocsModal from "./DocsModal";
import {
  saveWorkflow,
  exportWorkflow,
  importWorkflow,
} from "../../utils/serialization";

import "./Toolbar.css";

function Toolbar() {
  const fileInputRef = useRef(null);
  const toast = useToastStore();

  // Modal state
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Workflow store
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const nodes = useWorkflowStore((state) => state.nodes);
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const getWorkflowData = useWorkflowStore((state) => state.getWorkflowData);

  // Execution store
  const clearLogs = useExecutionStore((state) => state.clearLogs);

  // Audio state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    const handleAudioStart = () => setIsAudioPlaying(true);
    const handleAudioEnd = () => setIsAudioPlaying(false);

    window.addEventListener("audioStart", handleAudioStart);
    window.addEventListener("audioEnd", handleAudioEnd);

    return () => {
      window.removeEventListener("audioStart", handleAudioStart);
      window.removeEventListener("audioEnd", handleAudioEnd);
    };
  }, []);

  const handleStopAudio = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent("audioEnd"));
    }
  }, []);

  // Handlers
  const handleSave = useCallback(() => {
    const workflow = getWorkflowData();
    saveWorkflow(workflow);
    toast.success("Workflow saved successfully!");
  }, [getWorkflowData, toast]);

  const handleExport = useCallback(() => {
    const workflow = getWorkflowData();
    exportWorkflow(workflow);
    toast.success(`Exported "${workflow.name}.json"`);
  }, [getWorkflowData, toast]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const workflow = await importWorkflow(file);
        loadWorkflow(workflow);
        toast.success(`Imported "${workflow.name}"`);
      } catch (error) {
        console.error("Import failed:", error);
        toast.error("Import failed: " + error.message);
      }

      event.target.value = "";
    },
    [loadWorkflow, toast]
  );

  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    clearWorkflow();
    clearLogs();
    toast.info("Workflow cleared");
  }, [nodes.length, clearWorkflow, clearLogs, toast]);

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button className="btn-nav" onClick={() => setShowTutorial(true)}>
          Tutorial
        </button>
        <button className="btn-nav" onClick={() => setShowDocs(true)}>
          Docs
        </button>
      </div>

      <div className="toolbar-center">
        <input
          type="text"
          className="workflow-name-input"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Untitled Workflow"
        />

        {isAudioPlaying && (
          <button
            className="btn-stop-audio"
            onClick={handleStopAudio}
            title="Stop all audio playback"
          >
            🔇 Stop Audio
          </button>
        )}
      </div>

      <div className="toolbar-right">
        <button
          onClick={handleSave}
          title="Save workflow"
          disabled={nodes.length === 0}
        >
          💾 Save
        </button>

        <button
          onClick={handleExport}
          title="Export to JSON"
          disabled={nodes.length === 0}
        >
          📤 Export
        </button>

        <button onClick={handleImportClick} title="Import from JSON">
          📥 Import
        </button>

        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("openWorkflowManager"))
          }
          title="Manage saved workflows"
        >
          📁 Manage
        </button>

        <button
          onClick={handleClear}
          title="Clear canvas"
          className="btn-danger"
          disabled={nodes.length === 0}
        >
          🗑️ Clear
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleImportFile}
          style={{ display: "none" }}
        />
      </div>

      {/* Modals */}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
    </header>
  );
}

export default memo(Toolbar);
