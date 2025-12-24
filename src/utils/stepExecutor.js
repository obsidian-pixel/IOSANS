/**
 * Step Executor
 * Execute a single node with mock or previous execution data
 */
import { executeNode } from "../engine/NodeExecutors";
import useExecutionStore from "../store/executionStore";

/**
 * Execute a single node in isolation
 * @param {Object} node - The node to execute
 * @param {Object} mockData - Optional mock input data
 * @returns {Promise<Object>} - Execution result
 */
export async function executeStep(node, mockData = null) {
  const executionStore = useExecutionStore.getState();

  // Get input data from previous execution or use mock
  let inputData = mockData;

  if (!inputData) {
    // Try to get last result from a connected input node
    const nodeResult = executionStore.nodeResults[node.id];
    if (nodeResult?.input) {
      inputData = nodeResult.input;
    } else {
      // Default mock data based on node type
      inputData = getDefaultMockData(node.type);
    }
  }

  // Create execution context
  const context = {
    nodeId: node.id,
    nodes: [],
    edges: [],
    addLog: (log) => {
      executionStore.addLog({ ...log, nodeId: node.id });
    },
  };

  // Log start
  executionStore.addLog({
    type: "info",
    nodeId: node.id,
    nodeName: node.data?.label || node.type,
    message: `🔬 Running step: ${node.data?.label || node.type}`,
  });

  const startTime = Date.now();

  try {
    // Execute the node
    const result = await executeNode(node, inputData, context);
    const executionTime = Date.now() - startTime;

    // Store result
    executionStore.setNodeResult(node.id, {
      ...result,
      executionTime,
      input: inputData,
      stepExecution: true,
    });

    executionStore.addLog({
      type: "success",
      nodeId: node.id,
      nodeName: node.data?.label || node.type,
      message: `✓ Step completed in ${executionTime}ms`,
      data: { preview: getPreview(result.output) },
    });

    return {
      success: true,
      output: result.output,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    executionStore.setNodeResult(node.id, {
      success: false,
      error: error.message,
      executionTime,
      input: inputData,
      stepExecution: true,
    });

    executionStore.addLog({
      type: "error",
      nodeId: node.id,
      nodeName: node.data?.label || node.type,
      message: `✗ Step failed: ${error.message}`,
    });

    return {
      success: false,
      error: error.message,
      executionTime,
    };
  }
}

/**
 * Get default mock data for a node type
 */
function getDefaultMockData(nodeType) {
  const mockDataByType = {
    manualTrigger: {
      timestamp: new Date().toISOString(),
      trigger: "manual",
      test: true,
    },
    httpRequest: {
      url: "https://api.example.com/data",
      method: "GET",
    },
    codeExecutor: {
      message: "Hello from step execution",
      value: 42,
      items: [1, 2, 3],
    },
    pythonExecutor: {
      data: [1, 2, 3, 4, 5],
      text: "Sample Python input",
    },
    aiAgent: {
      prompt: "Test prompt for AI agent",
      context: "Running in step mode",
    },
    ifElse: {
      value: true,
      status: "active",
    },
    loop: {
      items: ["item1", "item2", "item3"],
    },
    switchNode: {
      value: "case1",
      status: "pending",
    },
    setVariable: {
      key: "testVar",
      value: "testValue",
    },
    textToSpeech: {
      text: "This is a test message for text to speech.",
    },
    output: {
      result: "Test output data",
      status: "complete",
    },
  };

  return (
    mockDataByType[nodeType] || {
      input: "default mock data",
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Get a preview string of output data
 */
function getPreview(output) {
  if (typeof output === "string") {
    return output.slice(0, 100) + (output.length > 100 ? "..." : "");
  }
  if (typeof output === "object") {
    const str = JSON.stringify(output);
    return str.slice(0, 100) + (str.length > 100 ? "..." : "");
  }
  return String(output);
}

export default { executeStep };
