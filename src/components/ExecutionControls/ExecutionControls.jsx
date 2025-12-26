import { useCallback } from "react";
import useWorkflowStore from "../../store/workflowStore";
import useExecutionStore from "../../store/executionStore";
import executionEngine from "../../engine/ExecutionEngine";
import "./ExecutionControls.css";

export default function ExecutionControls() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);

  const isRunning = useExecutionStore((state) => state.isRunning);
  const isPaused = useExecutionStore((state) => state.isPaused);
  const isDebugMode = useExecutionStore((state) => state.isDebugMode);
  const setDebugMode = useExecutionStore((state) => state.setDebugMode);
  const setPaused = useExecutionStore((state) => state.setPaused);

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    const executionStore = useExecutionStore.getState();
    const workflowStore = useWorkflowStore.getState();
    await executionEngine.execute(
      nodes,
      edges,
      { executionStore, workflowStore },
      {},
      { debug: isDebugMode }
    );
  }, [nodes, edges, isRunning, isDebugMode]);

  const handleStop = useCallback(() => executionEngine.stop(), []);

  const handlePause = useCallback(() => {
    executionEngine.pause();
    setPaused(true);
  }, [setPaused]);

  const handleResume = useCallback(() => {
    executionEngine.resume();
    setPaused(false);
  }, [setPaused]);

  const handleStep = useCallback(() => executionEngine.step(), []);

  return (
    <div className="execution-controls-panel">
      <div className="exec-btn-group">
        {!isRunning ? (
          <button
            className="exec-btn btn-run"
            onClick={handleRun}
            disabled={nodes.length === 0}
            title={isDebugMode ? "Start Debug Run" : "Start Workflow"}
          >
            {isDebugMode ? "🐛 Debug Run" : "▶️ Run"}
          </button>
        ) : (
          <>
            <button
              className="exec-btn btn-stop"
              onClick={handleStop}
              title="Stop Execution"
            >
              ⏹️ Stop
            </button>
            {isPaused ? (
              <button
                className="exec-btn btn-resume"
                onClick={handleResume}
                title="Resume"
              >
                ▶️ Resume
              </button>
            ) : (
              <button
                className="exec-btn btn-pause"
                onClick={handlePause}
                title="Pause"
              >
                ⏸️ Pause
              </button>
            )}
            {isDebugMode && (
              <button
                className="exec-btn btn-step"
                onClick={handleStep}
                title="Step Next"
              >
                ⏭️ Step
              </button>
            )}
          </>
        )}
      </div>

      <div className="separator" />

      <button
        className={`exec-btn btn-toggle-debug ${isDebugMode ? "active" : ""}`}
        onClick={() => setDebugMode(!isDebugMode)}
        title="Toggle Debug Mode"
      >
        {isDebugMode ? "🐛 Debug On" : "🐛 Debug Off"}
      </button>
    </div>
  );
}
