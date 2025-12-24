/**
 * WorkflowManager Component
 * Modal for managing saved workflows
 */
import { memo, useState, useEffect, useCallback } from "react";
import useWorkflowStore from "../../store/workflowStore";
import { useToastStore } from "../../store/toastStore";
import "./WorkflowManager.css";

// Storage key for workflows list
const WORKFLOWS_STORAGE_KEY = "flownode-workflows";

function WorkflowManager({ isOpen, onClose }) {
  const [workflows, setWorkflows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // Store actions
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const getWorkflowData = useWorkflowStore((state) => state.getWorkflowData);
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const toast = useToastStore();

  // Load workflows from localStorage
  const loadWorkflowsList = useCallback(() => {
    try {
      const saved = localStorage.getItem(WORKFLOWS_STORAGE_KEY);
      if (saved) {
        setWorkflows(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line
      loadWorkflowsList();
    }
  }, [isOpen, loadWorkflowsList]);

  const saveWorkflowsList = (newWorkflows) => {
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(newWorkflows));
    setWorkflows(newWorkflows);
  };

  // Filter workflows by search
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Save current workflow
  const handleSaveNew = useCallback(() => {
    const workflow = getWorkflowData();
    const newEntry = {
      id: Date.now().toString(),
      name: workflow.name || "Untitled Workflow",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeCount: workflow.nodes.length,
      data: workflow,
    };

    saveWorkflowsList([newEntry, ...workflows]);
    toast.success(`Saved "${newEntry.name}"`);
  }, [getWorkflowData, workflows, toast]);

  // Load a workflow
  const handleLoad = useCallback(
    (workflow) => {
      loadWorkflow(workflow.data);
      setWorkflowName(workflow.name);
      toast.success(`Loaded "${workflow.name}"`);
      onClose();
    },
    [loadWorkflow, setWorkflowName, toast, onClose]
  );

  // Delete a workflow
  const handleDelete = useCallback(
    (id) => {
      const workflow = workflows.find((w) => w.id === id);
      const newWorkflows = workflows.filter((w) => w.id !== id);
      saveWorkflowsList(newWorkflows);
      toast.info(`Deleted "${workflow?.name}"`);
    },
    [workflows, toast]
  );

  // Duplicate a workflow
  const handleDuplicate = useCallback(
    (workflow) => {
      const duplicate = {
        ...workflow,
        id: Date.now().toString(),
        name: `${workflow.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveWorkflowsList([duplicate, ...workflows]);
      toast.success(`Duplicated "${workflow.name}"`);
    },
    [workflows, toast]
  );

  // Start editing name
  const handleStartEdit = (workflow) => {
    setEditingId(workflow.id);
    setEditName(workflow.name);
  };

  // Save edited name
  const handleSaveName = useCallback(
    (id) => {
      const newWorkflows = workflows.map((w) =>
        w.id === id
          ? { ...w, name: editName, updatedAt: new Date().toISOString() }
          : w
      );
      saveWorkflowsList(newWorkflows);
      setEditingId(null);
      toast.success("Renamed workflow");
    },
    [workflows, editName, toast]
  );

  // Create new workflow
  const handleCreateNew = useCallback(() => {
    clearWorkflow();
    setWorkflowName("New Workflow");
    toast.info("Created new workflow");
    onClose();
  }, [clearWorkflow, setWorkflowName, toast, onClose]);

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="workflow-manager-overlay" onClick={onClose}>
      <div
        className="workflow-manager-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="manager-header">
          <h2>Workflow Manager</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="manager-toolbar">
          <input
            type="text"
            className="manager-search"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="manager-actions">
            <button className="btn-primary" onClick={handleSaveNew}>
              💾 Save Current
            </button>
            <button className="btn-secondary" onClick={handleCreateNew}>
              ➕ New Workflow
            </button>
          </div>
        </div>

        <div className="manager-content">
          {filteredWorkflows.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <p>No workflows match "{searchQuery}"</p>
              ) : (
                <div>
                  <p>No saved workflows yet</p>
                  <p className="hint">
                    Click "Save Current" to save your first workflow
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="workflow-list">
              {filteredWorkflows.map((workflow) => (
                <div key={workflow.id} className="workflow-item">
                  <div className="workflow-info">
                    {editingId === workflow.id ? (
                      <input
                        type="text"
                        className="edit-name-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveName(workflow.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveName(workflow.id)
                        }
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="workflow-name"
                        onClick={() => handleStartEdit(workflow)}
                      >
                        {workflow.name}
                      </h3>
                    )}
                    <div className="workflow-meta">
                      <span>{workflow.nodeCount} nodes</span>
                      <span>•</span>
                      <span>{formatDate(workflow.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="workflow-actions">
                    <button
                      className="action-btn load"
                      onClick={() => handleLoad(workflow)}
                      title="Load workflow"
                    >
                      📂
                    </button>
                    <button
                      className="action-btn duplicate"
                      onClick={() => handleDuplicate(workflow)}
                      title="Duplicate workflow"
                    >
                      📋
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(workflow.id)}
                      title="Delete workflow"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="manager-footer">
          <span className="workflow-count">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""} saved
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(WorkflowManager);
