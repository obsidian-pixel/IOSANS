/**
 * FlowNode - Workflow Automation App
 * Main Application Component
 */
import { useEffect, useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

// Components
import WorkflowEditor from "./components/Editor/WorkflowEditor";
import NodeSidebar from "./components/Sidebar/NodeSidebar";
import Toolbar from "./components/Toolbar/Toolbar";
import ExecutionPanel from "./components/ExecutionPanel/ExecutionPanel";
import NodeConfigPanel from "./components/NodeConfig/NodeConfigPanel";
import ToastContainer from "./components/Toast/Toast";
import LoadingOverlay from "./components/LoadingOverlay/LoadingOverlay";
import WorkflowManager from "./components/WorkflowManager/WorkflowManager";
import OverseerPanel from "./components/Overseer/OverseerPanel";
import OnboardingTour from "./components/Onboarding/OnboardingTour";

// Stores
import useWorkflowStore from "./store/workflowStore";
import useExecutionStore from "./store/executionStore";
import useModelStore from "./store/modelStore";

// Engine
import webLLMService from "./engine/WebLLMService";
import executionEngine from "./engine/ExecutionEngine";

// Utilities
import { verifyDownloadedModels } from "./utils/cacheUtils";

// Styles
import "./App.css";

function App() {
  // Stores
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);

  const isRunning = useExecutionStore((state) => state.isRunning);

  const setLoading = useModelStore((state) => state.setLoading);
  const setReady = useModelStore((state) => state.setReady);
  const setError = useModelStore((state) => state.setError);

  // WorkflowManager modal state
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  // Overseer state
  const [showOverseer, setShowOverseer] = useState(false);
  // Tour state
  const [showTour, setShowTour] = useState(false);

  // Listen for openWorkflowManager and openOverseer events
  useEffect(() => {
    const handleOpenWM = () => setShowWorkflowManager(true);
    const handleToggleOverseer = () => setShowOverseer((prev) => !prev);
    const handleStartTour = () => setShowTour(true);

    window.addEventListener("openWorkflowManager", handleOpenWM);
    window.addEventListener("toggleOverseer", handleToggleOverseer);
    window.addEventListener("startTour", handleStartTour);

    return () => {
      window.removeEventListener("openWorkflowManager", handleOpenWM);
      window.removeEventListener("toggleOverseer", handleToggleOverseer);
      window.removeEventListener("startTour", handleStartTour);
    };
  }, []);

  // Cache rehydration: verify downloaded models against actual cache on startup
  useEffect(() => {
    const rehydrateCache = async () => {
      const store = useModelStore.getState();
      const claimed = store.downloadedModels;

      if (claimed.length === 0) return;

      console.log("🔍 Verifying cached models...");
      const verified = await verifyDownloadedModels(claimed);

      // Remove any models that aren't actually cached
      if (verified.length !== claimed.length) {
        console.warn(
          `Removed ${claimed.length - verified.length} ghost models from list`
        );
        useModelStore.setState({ downloadedModels: verified });
      } else {
        console.log(`✅ All ${verified.length} models verified`);
      }
    };

    rehydrateCache();
  }, []);

  // Initialize WebLLM model on mount (with guard for StrictMode double-invoke)
  useEffect(() => {
    let cancelled = false;

    const initModel = async () => {
      // Skip if already loading or loaded
      if (webLLMService.isLoading || webLLMService.isReady) {
        return;
      }

      try {
        const selectedModel =
          localStorage.getItem("selectedModel") || "gemma-2-2b-it-q4f16_1-MLC";

        await webLLMService.initialize(selectedModel, (progress) => {
          if (cancelled) return;
          setLoading(
            progress.progress,
            progress.text ||
              `Loading model... ${Math.round(progress.progress * 100)}%`
          );
        });

        if (!cancelled) {
          setReady(selectedModel);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to initialize WebLLM:", error);
          setError(error.message || "Failed to load AI model");
        }
      }
    };

    initModel();

    return () => {
      cancelled = true;
    };
  }, [setLoading, setReady, setError]);

  // Listen for model switch events from ModelSwitcher
  useEffect(() => {
    const handleLoadModel = async (event) => {
      const { modelId } = event.detail;
      try {
        setLoading(0, `Switching to ${modelId}...`);

        await webLLMService.initialize(modelId, (progress) => {
          setLoading(
            progress.progress,
            progress.text ||
              `Loading ${modelId}... ${Math.round(progress.progress * 100)}%`
          );
        });

        localStorage.setItem("selectedModel", modelId);
        setReady(modelId);
      } catch (error) {
        console.error("Failed to switch model:", error);
        setError(error.message || "Failed to switch model");
      }
    };

    const handleDownloadModel = async (event) => {
      const { modelId } = event.detail;
      const store = useModelStore.getState();

      // Show "starting" state
      store.setDownloadProgress(modelId, 0, "downloading");

      try {
        await webLLMService.downloadModel(modelId, (progress) => {
          store.setDownloadProgress(
            modelId,
            progress.progress * 100,
            "downloading"
          );
        });

        // Success: mark as downloaded in persisted store
        store.markDownloaded(modelId);
        console.log(`✅ Model ${modelId} downloaded and cached`);
      } catch (error) {
        console.error("Download failed:", error);
        store.setDownloadProgress(modelId, 0, "error");
      }
    };

    window.addEventListener("loadModel", handleLoadModel);
    window.addEventListener("downloadModel", handleDownloadModel);

    return () => {
      window.removeEventListener("loadModel", handleLoadModel);
      window.removeEventListener("downloadModel", handleDownloadModel);
    };
  }, [setLoading, setReady, setError]);

  // Run workflow handler
  const handleRun = useCallback(
    async (options = {}) => {
      if (isRunning) return;

      const { debug = false } = options;
      const executionStore = useExecutionStore.getState();

      // Set debug mode in store
      if (debug) {
        useExecutionStore.getState().setDebugMode(true);
      }

      await executionEngine.execute(
        nodes,
        edges,
        { executionStore },
        {}, // Initial data
        { debug } // Options
      );
    },
    [nodes, edges, isRunning]
  );

  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar onRun={handleRun} />
        <div className="app-body">
          <NodeSidebar />
          <WorkflowEditor />
          <NodeConfigPanel key={selectedNodeId || "none"} />
          <ExecutionPanel />
          <OverseerPanel
            isOpen={showOverseer}
            onClose={() => setShowOverseer(false)}
          />
        </div>
        <ToastContainer />
        <LoadingOverlay />
        <WorkflowManager
          isOpen={showWorkflowManager}
          onClose={() => setShowWorkflowManager(false)}
        />
        <OnboardingTour
          isActive={showTour}
          onComplete={() => setShowTour(false)}
        />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
