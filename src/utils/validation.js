/**
 * Edge/Connection Validation
 * Rules for valid node connections
 */

import { NODE_TYPES } from "./nodeTypes";

/**
 * Validate if a connection is allowed
 * @param {Object} connection - {source, target, sourceHandle, targetHandle}
 * @param {Array} nodes - Current nodes in the workflow
 * @param {Array} edges - Current edges in the workflow
 * @returns {boolean} Whether the connection is valid
 */
export function isValidConnection(connection, nodes, edges) {
  const { source, target } = connection;

  // Prevent self-connections
  if (source === target) {
    return false;
  }

  // Find source and target nodes
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  // Trigger nodes can only be sources, not targets (except Schedule Trigger and Output)
  const targetType = NODE_TYPES[targetNode.type];
  if (
    targetType?.category === "trigger" &&
    targetNode.type !== "scheduleTrigger" &&
    targetNode.type !== "output"
  ) {
    return false;
  }

  // Check for duplicate connections
  const duplicateEdge = edges.find(
    (e) => e.source === source && e.target === target
  );
  if (duplicateEdge) {
    return false;
  }

  // Prevent cycles (but allow loop-back for Loop nodes)
  const isLoopNode = sourceNode.type === "loop";

  const reverseEdge = edges.find(
    (e) => e.source === target && e.target === source
  );
  if (reverseEdge && !isLoopNode) {
    return false;
  }

  // Validate diamond handle connections (AI Agent resource slots)
  const { targetHandle } = connection;

  // Model slot only accepts connections from Chat Model nodes
  if (targetHandle === "model-slot") {
    if (sourceNode.type !== "chatModel") {
      return false;
    }
  }

  // Memory slot only accepts connections from Vector Memory nodes
  if (targetHandle === "memory-slot") {
    if (sourceNode.type !== "vectorMemory") {
      return false;
    }
  }

  // Tool slot accepts connections from tool-capable nodes
  if (targetHandle === "tool-slot") {
    const toolTypes = [
      "codeExecutor",
      "pythonExecutor",
      "httpRequest",
      "textToSpeech",
      "imageGeneration",
      "aiAgent",
      "fileSystem",
      "setVariable",
      "ifElse",
      "loop",
      "switchNode",
      "merge",
      "vectorMemory",
      "semanticRouter",
      "evaluator",
      "output",
      "webhookTrigger",
      "browserEventTrigger",
      "speechToText",
      "dataTransformer",
      "delay",
    ];
    if (!toolTypes.includes(sourceNode.type)) {
      return false;
    }
  }

  return true;
}

/**
 * Get connection style based on source node type
 * @param {string} sourceType - Source node type
 * @returns {Object} Edge style configuration
 */
export function getConnectionStyle(sourceType) {
  const nodeType = NODE_TYPES[sourceType];
  const category = nodeType?.category || "action";

  const categoryColors = {
    trigger: "#00c853",
    action: "#2979ff",
    logic: "#ffab00",
    ai: "#e040fb",
  };

  return {
    stroke: categoryColors[category] || "#666666",
    strokeWidth: 2,
    animated: category === "ai",
  };
}

/**
 * Get all nodes that would be affected if a node is deleted
 * (downstream nodes that would become disconnected)
 * @param {string} nodeId - Node to delete
 * @param {Array} nodes - Current nodes
 * @param {Array} edges - Current edges
 * @returns {Array} Array of affected node IDs
 */
export function getAffectedNodes(nodeId, nodes, edges) {
  const affected = new Set();
  const visited = new Set();

  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    // Find all edges where this node is the source
    edges
      .filter((e) => e.source === id)
      .forEach((e) => {
        affected.add(e.target);
        traverse(e.target);
      });
  }

  traverse(nodeId);
  return Array.from(affected);
}

/**
 * Find all trigger nodes in the workflow
 * @param {Array} nodes - Workflow nodes
 * @returns {Array} Trigger nodes
 */
export function findTriggerNodes(nodes) {
  return nodes.filter((node) => {
    const nodeType = NODE_TYPES[node.type];
    return nodeType?.category === "trigger";
  });
}

/**
 * Topologically sort nodes for execution order
 * @param {Array} nodes - Workflow nodes
 * @param {Array} edges - Workflow edges
 * @param {string} startNodeId - Starting node ID
 * @returns {Array} Ordered array of node IDs
 */
export function getExecutionOrder(nodes, edges, startNodeId) {
  const order = [];
  const visited = new Set();

  function visit(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    order.push(nodeId);

    // Find outgoing edges and visit those nodes
    edges
      .filter((e) => e.source === nodeId)
      .sort((a, b) => {
        // Sort by handle index for consistent ordering
        const aHandle = parseInt(a.sourceHandle?.split("-")[1] || "0", 10);
        const bHandle = parseInt(b.sourceHandle?.split("-")[1] || "0", 10);
        return aHandle - bHandle;
      })
      .forEach((e) => visit(e.target));
  }

  visit(startNodeId);
  return order;
}
