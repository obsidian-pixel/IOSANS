/**
 * ExecutionEngine
 * Traverses and executes workflow graphs with full branching and loop support
 */
import { executeNode } from "./NodeExecutors";
import { findTriggerNodes } from "../utils/validation";

class ExecutionEngine {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.debugMode = false;
    this.stepResolve = null;
    this.abortController = null;
    this.executedNodes = new Set();
  }

  /**
   * Execute a workflow
   */
  async execute(nodes, edges, stores, initialData = {}, options = {}) {
    const { executionStore } = stores;
    const { debug = false } = options;

    if (this.isRunning) {
      throw new Error("Workflow is already running");
    }

    this.isRunning = true;
    this.isPaused = false;
    this.debugMode = debug;
    this.abortController = new AbortController();
    this.executedNodes = new Set();

    // Store references for graph traversal
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap = new Map(nodes.map((n) => [n.id, n]));
    this.executionStore = executionStore;

    executionStore.startExecution();

    try {
      // Find trigger nodes
      const triggers = findTriggerNodes(nodes);

      if (triggers.length === 0) {
        executionStore.addLog({
          type: "error",
          message:
            "No trigger node found. Add a trigger to start the workflow.",
        });
        throw new Error("No trigger node found");
      }

      executionStore.addLog({
        type: "info",
        message: `Starting workflow${debug ? " (debug mode)" : ""} with ${
          triggers.length
        } trigger(s)`,
      });

      // Execute from each trigger
      const results = [];
      for (const trigger of triggers) {
        const result = await this.executeFromNode(trigger.id, initialData);
        results.push(result);
      }

      executionStore.stopExecution();
      executionStore.addLog({
        type: "success",
        message: "Workflow completed successfully",
      });

      this.isRunning = false;
      return { success: true, results };
    } catch (error) {
      executionStore.addLog({
        type: "error",
        message: `Workflow failed: ${error.message}`,
      });
      executionStore.stopExecution();
      this.isRunning = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute from a specific node and follow edges
   */
  async executeFromNode(nodeId, inputData, visited = new Set()) {
    // Prevent infinite loops
    const visitKey = `${nodeId}-${JSON.stringify(inputData).slice(0, 50)}`;
    if (visited.has(visitKey)) {
      return { success: true, output: inputData, skipped: true };
    }
    visited.add(visitKey);

    // Check if aborted
    if (this.abortController?.signal.aborted) {
      throw new Error("Workflow was stopped");
    }

    // Wait if paused
    await this.waitIfPaused();

    // Debug mode: wait for step
    if (this.debugMode) {
      await this.waitForStep();
    }

    const node = this.nodeMap.get(nodeId);
    if (!node) {
      return { success: false, error: `Node ${nodeId} not found` };
    }

    // Mark as executing
    this.executionStore.setCurrentNode(nodeId);
    this.executionStore.addLog({
      type: "node",
      nodeId,
      nodeName: node.data?.label || node.type,
      message: `Executing ${node.data?.label || node.type}`,
    });

    // For AI Agent nodes, detect connected resources and tools
    if (node.type === "aiAgent") {
      // Get resources connected via diamond handles (model-slot, memory-slot, tool-slot)
      const connectedResources = this.getConnectedResources(nodeId);

      // Inject connected resources into node data
      if (connectedResources.model) {
        node.data = {
          ...node.data,
          connectedModel: connectedResources.model,
        };
        this.executionStore.addLog({
          type: "info",
          nodeId,
          nodeName: node.data?.label || "AI Agent",
          message: `Using connected model: ${
            connectedResources.model.modelName ||
            connectedResources.model.modelId ||
            "WebLLM"
          }`,
        });
      }

      if (connectedResources.memory) {
        node.data = {
          ...node.data,
          connectedMemory: connectedResources.memory,
        };
        this.executionStore.addLog({
          type: "info",
          nodeId,
          nodeName: node.data?.label || "AI Agent",
          message: `Using connected memory: ${connectedResources.memory.namespace}`,
        });
      }

      // Combine tools from outgoing edges AND tool-slot connections
      if (node.data?.enableToolCalling !== false) {
        const outgoingTools = this.getConnectedTools(nodeId);
        const allTools = [...connectedResources.tools, ...outgoingTools];

        if (allTools.length > 0) {
          node.data = {
            ...node.data,
            tools: allTools,
          };
          this.executionStore.addLog({
            type: "info",
            nodeId,
            nodeName: node.data?.label || "AI Agent",
            message: `Detected ${allTools.length} tool(s): ${allTools
              .map((t) => t.name)
              .join(", ")}`,
          });
        }
      }

      // HIGHLIGHT SUPPORTING NODES
      // Collect IDs of all connected resources to highlight them
      const supportingNodeIds = [];

      if (connectedResources.model?.nodeId)
        supportingNodeIds.push(connectedResources.model.nodeId);
      if (connectedResources.memory?.nodeId)
        supportingNodeIds.push(connectedResources.memory.nodeId);
      connectedResources.tools.forEach((t) => supportingNodeIds.push(t.nodeId));

      // We don't highlight user-defined tool nodes connected via flow edges yet,
      // only those explicitly connected to the tool-slot or resource slots.

      if (
        supportingNodeIds.length > 0 &&
        this.executionStore.setActiveSupportingNodes
      ) {
        this.executionStore.setActiveSupportingNodes(supportingNodeIds);
      }
    }

    // Create execution context
    const context = {
      nodeId,
      nodes: this.nodes,
      edges: this.edges,
      executionStore: this.executionStore,
      addLog: (log) => this.executionStore.addLog({ ...log, nodeId }),
    };

    // Get retry settings from node config
    // AI nodes get longer timeout (300s) to allow for model loading + generation
    const maxRetries = node.data?.retries || 0;
    const retryDelay = node.data?.retryDelay || 1000;
    const isAINode =
      node.type === "aiAgent" ||
      node.type === "textToSpeech" ||
      node.type === "imageGeneration";
    const nodeTimeout = node.data?.timeout || (isAINode ? 300000 : 60000);

    // Execute with retry logic
    let result;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Calculate exponential backoff delay
        const delay = retryDelay * Math.pow(2, attempt - 1);
        this.executionStore.addLog({
          type: "warning",
          nodeId,
          nodeName: node.data?.label || node.type,
          message: `Retrying (attempt ${attempt + 1}/${
            maxRetries + 1
          }) after ${delay}ms...`,
        });
        await new Promise((r) => setTimeout(r, delay));
      }

      try {
        // Execute with timeout
        result = await this.executeWithTimeout(
          node,
          inputData,
          context,
          nodeTimeout
        );

        // Check if node returned a failure (not a thrown error)
        if (!result.success) {
          throw new Error(result.error || "Node execution failed");
        }

        break; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          // Final attempt failed, record error
          const executionTime = Date.now() - startTime;
          this.executionStore.setNodeResult(nodeId, {
            success: false,
            error: error.message,
            executionTime,
            attempts: attempt + 1,
          });
          this.executionStore.addLog({
            type: "error",
            nodeId,
            nodeName: node.data?.label || node.type,
            message: `Node failed after ${attempt + 1} attempt(s): ${
              error.message
            }`,
            data: {
              error: error.message,
              executionTime,
              canRetry: true,
              nodeId,
            },
          });
          throw new Error(
            `Node ${node.data?.label || nodeId} failed: ${error.message}`
          );
        }
      }
    }

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Store result with execution time
    this.executionStore.setNodeResult(nodeId, { ...result, executionTime });
    this.executedNodes.add(nodeId);

    this.executionStore.addLog({
      type: "success",
      nodeId,
      nodeName: node.data?.label || node.type,
      message: `Completed in ${executionTime}ms`,
      data: result.output
        ? { preview: this.getOutputPreview(result.output), executionTime }
        : undefined,
    });

    // Small delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Handle different execution patterns
    if (result.loopData) {
      // Loop node - iterate through items
      return await this.executeLoop(node, result, visited);
    } else if (result.outputIndex !== undefined) {
      // Branching node (if/else, switch) - follow specific output
      return await this.executeBranch(node, result, visited);
    } else {
      // Normal node - follow all connected edges
      return await this.executeNextNodes(nodeId, result.output, visited);
    }
  }

  /**
   * Execute a loop node (iterate through items)
   */
  async executeLoop(loopNode, result, visited) {
    const { items, index: startIndex } = result.loopData;
    const nodeId = loopNode.id;
    const outputData = [];

    this.executionStore.addLog({
      type: "info",
      nodeId,
      nodeName: loopNode.data?.label || "Loop",
      message: `Starting loop with ${items.length} items`,
    });

    // Find the edge connected to output-0 (loop body)
    const loopBodyEdge = this.edges.find(
      (e) => e.source === nodeId && e.sourceHandle === "output-0"
    );

    if (loopBodyEdge) {
      for (let i = startIndex; i < items.length; i++) {
        // Check for abort
        if (this.abortController?.signal.aborted) {
          throw new Error("Workflow was stopped");
        }

        const item = items[i];
        const iterationData = {
          item,
          index: i,
          total: items.length,
          isFirst: i === 0,
          isLast: i === items.length - 1,
          ...result.output,
        };

        this.executionStore.addLog({
          type: "info",
          nodeId,
          message: `Loop iteration ${i + 1}/${items.length}`,
        });

        // Execute the loop body with this item
        const iterationResult = await this.executeFromNode(
          loopBodyEdge.target,
          iterationData,
          new Set() // Fresh visited set for each iteration
        );

        if (iterationResult.success) {
          outputData.push(iterationResult.output);
        }
      }
    }

    this.executionStore.addLog({
      type: "success",
      nodeId,
      message: `Loop completed (${items.length} iterations)`,
    });

    // After loop, continue to "done" output (output-1)
    const doneEdge = this.edges.find(
      (e) => e.source === nodeId && e.sourceHandle === "output-1"
    );

    if (doneEdge) {
      const doneData = {
        ...result.output,
        loopResults: outputData,
        itemCount: items.length,
      };
      return await this.executeFromNode(doneEdge.target, doneData, visited);
    }

    return { success: true, output: outputData };
  }

  /**
   * Execute branching node (if/else, switch)
   */
  async executeBranch(node, result, visited) {
    const { output, outputIndex } = result;
    const nodeId = node.id;

    // Find the edge for the selected output
    const targetEdge = this.edges.find(
      (e) => e.source === nodeId && e.sourceHandle === `output-${outputIndex}`
    );

    if (targetEdge) {
      this.executionStore.addLog({
        type: "info",
        nodeId,
        message: `Taking branch: output ${outputIndex + 1}`,
      });
      return await this.executeFromNode(targetEdge.target, output, visited);
    }

    // No connected edge for this output
    this.executionStore.addLog({
      type: "info",
      nodeId,
      message: `Branch output ${
        outputIndex + 1
      } has no connection, ending path`,
    });

    return { success: true, output };
  }

  /**
   * Execute all nodes connected to this node's outputs
   */
  async executeNextNodes(nodeId, outputData, visited) {
    // Find all edges from this node's outputs
    const outgoingEdges = this.edges.filter((e) => e.source === nodeId);

    if (outgoingEdges.length === 0) {
      // End of workflow branch
      return { success: true, output: outputData };
    }

    // Execute each connected node
    const results = [];
    for (const edge of outgoingEdges) {
      // Record edge snapshot for Ghost Data debugging
      if (this.executionStore?.addEdgeSnapshot) {
        this.executionStore.addEdgeSnapshot(edge.id, outputData);
      }

      const result = await this.executeFromNode(
        edge.target,
        outputData,
        visited
      );
      results.push(result);
    }

    // Return the last result (for linear flows) or aggregate for parallel
    return results.length === 1
      ? results[0]
      : { success: true, outputs: results };
  }

  /**
   * Wait while paused
   */
  async waitIfPaused() {
    while (this.isPaused && !this.abortController?.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Wait for debug step command
   */
  async waitForStep() {
    return new Promise((resolve) => {
      this.stepResolve = resolve;
      this.executionStore.addLog({
        type: "debug",
        message: "Waiting for step (press Step to continue)...",
      });
    });
  }

  /**
   * Step to next node in debug mode
   */
  step() {
    if (this.stepResolve) {
      const resolve = this.stepResolve;
      this.stepResolve = null;
      resolve();
    }
  }

  /**
   * Stop execution
   */
  stop() {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    this.debugMode = false;
  }

  /**
   * Pause execution
   */
  pause() {
    this.isPaused = true;
    this.executionStore?.addLog({
      type: "info",
      message: "Execution paused",
    });
  }

  /**
   * Resume execution
   */
  resume() {
    this.isPaused = false;
    this.executionStore?.addLog({
      type: "info",
      message: "Execution resumed",
    });
  }

  /**
   * Toggle debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Execute a node with resettable heartbeat timeout
   */
  async executeWithTimeout(node, inputData, context, timeout) {
    let timer;
    let rejectPromise;

    // Create a promise that rejects on timeout
    const timeoutPromise = new Promise((_, reject) => {
      rejectPromise = reject;
    });

    // Function to start/reset the timer
    const startTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        rejectPromise(new Error(`Timeout after ${timeout}ms`));
      }, timeout);
    };

    // Initial start
    startTimer();

    // Listen for abort signal
    if (this.abortController?.signal) {
      if (this.abortController.signal.aborted) {
        return Promise.reject(new Error("Workflow was stopped"));
      }
      this.abortController.signal.addEventListener("abort", () => {
        rejectPromise(new Error("Workflow was stopped"));
      });
    }

    // Add heartbeat function to context so nodes can reset the timer
    context.heartbeat = () => {
      // Only reset if still running (timer exists)
      if (timer) {
        startTimer();
      }
    };

    try {
      // Execute with timeout and abort race
      const result = await Promise.race([
        executeNode(node, inputData, context),
        timeoutPromise,
        // Add a promise that never resolves but rejects on abort
        // (The abort listener above handles the rejection)
        new Promise((_, reject) => {
          if (this.abortController?.signal) {
            this.abortController.signal.addEventListener("abort", () => {
              reject(new Error("Workflow was stopped"));
            });
          }
        }),
      ]);
      return result;
    } finally {
      // Clean up timer when execution finishes (success or failure)
      if (timer) clearTimeout(timer);
      timer = null;
    }
  }

  /**
   * Get connected resource providers for AI Agent
   * Finds nodes connected TO the AI Agent's diamond handle input slots
   */
  getConnectedResources(nodeId) {
    // Find all edges targeting this node's resource slots
    const incomingEdges = this.edges.filter(
      (e) =>
        e.target === nodeId &&
        ["model-slot", "memory-slot", "tool-slot"].includes(e.targetHandle)
    );

    const resources = { model: null, memory: null, tools: [] };

    for (const edge of incomingEdges) {
      const sourceNode = this.nodeMap.get(edge.source);
      if (!sourceNode) continue;

      switch (edge.targetHandle) {
        case "model-slot":
          // Get model configuration from Chat Model node
          resources.model = {
            nodeId: sourceNode.id,
            modelId: sourceNode.data?.modelId,
            modelName: sourceNode.data?.modelName,
            provider: sourceNode.data?.provider || "webllm",
            temperature: sourceNode.data?.temperature,
            maxTokens: sourceNode.data?.maxTokens,
          };
          break;
        case "memory-slot":
          // Get memory configuration from Vector Memory node
          resources.memory = {
            nodeId: sourceNode.id,
            namespace: sourceNode.data?.namespace || "default",
            mode: sourceNode.data?.mode || "query",
            topK: sourceNode.data?.topK || 5,
          };
          break;
        case "tool-slot":
          // Tool provider node
          resources.tools.push({
            nodeId: sourceNode.id,
            name: sourceNode.data?.label || sourceNode.type,
            type: sourceNode.type,
            description: this.getToolDescription(sourceNode.type),
          });
          break;
      }
    }

    return resources;
  }

  /**
   * Get connected tool nodes for AI Agent
   * Finds all nodes connected via outgoing edges from the AI Agent
   */
  getConnectedTools(nodeId) {
    // Find all edges going OUT from this AI Agent node
    const outgoingEdges = this.edges.filter((e) => e.source === nodeId);

    const tools = [];
    for (const edge of outgoingEdges) {
      const targetNode = this.nodeMap.get(edge.target);
      if (targetNode && this.isToolNode(targetNode.type)) {
        tools.push({
          nodeId: targetNode.id,
          name: targetNode.data?.label || targetNode.type,
          type: targetNode.type,
          description: this.getToolDescription(targetNode.type),
          inputSchema: { input: "any" },
        });
      }
    }

    return tools;
  }

  /**
   * Check if a node type can be used as a tool
   */
  isToolNode(nodeType) {
    // These node types can be called as tools by the AI
    const toolableTypes = [
      "codeExecutor",
      "httpRequest",
      "setVariable",
      "ifElse",
      "loopEach",
      "switchNode",
      "delay",
      "merge",
    ];
    return toolableTypes.includes(nodeType);
  }

  /**
   * Get description for a tool node type
   */
  getToolDescription(nodeType) {
    const descriptions = {
      codeExecutor:
        "Execute JavaScript code. Pass data to process and receive the result.",
      httpRequest: "Make HTTP requests to APIs. Returns the response data.",
      setVariable: "Store a value in workflow memory for later use.",
      ifElse: "Evaluate a condition and return the result.",
      loopEach: "Iterate through an array of items.",
      switchNode: "Route based on a value matching specific cases.",
      delay: "Wait for a specified duration.",
      merge: "Combine multiple inputs into one output.",
    };
    return descriptions[nodeType] || `Execute ${nodeType} node.`;
  }

  /**
   * Get a preview of output data
   */
  getOutputPreview(output) {
    if (typeof output === "string") {
      return output.slice(0, 100) + (output.length > 100 ? "..." : "");
    }
    if (typeof output === "object") {
      const str = JSON.stringify(output);
      return str.slice(0, 100) + (str.length > 100 ? "..." : "");
    }
    return String(output);
  }
}

// Singleton instance
const executionEngine = new ExecutionEngine();
export default executionEngine;
