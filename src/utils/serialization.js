/**
 * Workflow Serialization Utilities
 * Save/load workflows to localStorage and JSON files
 */

const STORAGE_KEY = "workflow_automations";
const ACTIVE_WORKFLOW_KEY = "active_workflow_id";

/**
 * Save workflow to localStorage
 * @param {Object} workflow - Workflow data
 * @returns {string} Workflow ID
 */
export function saveWorkflow(workflow) {
  const workflows = getAllWorkflows();
  const workflowId = workflow.id || Date.now().toString();

  const workflowData = {
    ...workflow,
    id: workflowId,
    updatedAt: new Date().toISOString(),
    createdAt: workflow.createdAt || new Date().toISOString(),
  };

  workflows[workflowId] = workflowData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));

  return workflowId;
}

/**
 * Load workflow from localStorage
 * @param {string} workflowId - Workflow ID
 * @returns {Object|null} Workflow data or null
 */
export function loadWorkflow(workflowId) {
  const workflows = getAllWorkflows();
  return workflows[workflowId] || null;
}

/**
 * Get all saved workflows
 * @returns {Object} Map of workflow ID to workflow data
 */
export function getAllWorkflows() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to load workflows:", error);
    return {};
  }
}

/**
 * Delete a workflow
 * @param {string} workflowId - Workflow ID to delete
 */
export function deleteWorkflow(workflowId) {
  const workflows = getAllWorkflows();
  delete workflows[workflowId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));

  // Clear active if deleted
  if (getActiveWorkflowId() === workflowId) {
    setActiveWorkflowId(null);
  }
}

/**
 * Get active workflow ID
 * @returns {string|null} Active workflow ID
 */
export function getActiveWorkflowId() {
  return localStorage.getItem(ACTIVE_WORKFLOW_KEY);
}

/**
 * Set active workflow ID
 * @param {string|null} workflowId - Workflow ID or null
 */
export function setActiveWorkflowId(workflowId) {
  if (workflowId) {
    localStorage.setItem(ACTIVE_WORKFLOW_KEY, workflowId);
  } else {
    localStorage.removeItem(ACTIVE_WORKFLOW_KEY);
  }
}

/**
 * Export workflow to JSON file
 * @param {Object} workflow - Workflow data
 */
export function exportWorkflow(workflow) {
  const dataStr = JSON.stringify(workflow, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${workflow.name || "workflow"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import workflow from JSON file
 * @param {File} file - JSON file
 * @returns {Promise<Object>} Workflow data
 */
export function importWorkflow(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workflow = JSON.parse(event.target.result);

        // SECURITY: Validate basic structure (additional validation in workflowValidator.js)
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
          throw new Error("Invalid workflow: missing nodes array");
        }
        if (!workflow.edges || !Array.isArray(workflow.edges)) {
          throw new Error("Invalid workflow: missing edges array");
        }

        // Assign new ID to avoid conflicts
        workflow.id = Date.now().toString();
        workflow.name = workflow.name + " (Imported)";

        resolve(workflow);
      } catch (error) {
        reject(new Error("Failed to parse workflow file: " + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Create a new empty workflow
 * @param {string} name - Workflow name
 * @returns {Object} New workflow data
 */
export function createNewWorkflow(name = "Untitled Workflow") {
  return {
    id: Date.now().toString(),
    name,
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
