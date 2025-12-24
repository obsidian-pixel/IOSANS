/**
 * DecompositionEngine (Parsel-inspired)
 * Breaks complex tasks into hierarchical sub-functions
 * Enables testable, modular task execution
 */

// Configuration
const MAX_DEPTH = 5;
const MIN_COMPLEXITY_FOR_DECOMPOSITION = 50; // Character threshold

class DecompositionEngine {
  constructor() {
    this.name = "DecompositionEngine";
  }

  /**
   * Decompose a complex task into subtasks
   * @param {string} task - The task description
   * @param {Object} options - Configuration options
   * @param {Object} context - Execution context
   * @returns {Object} Hierarchical task tree
   */
  async decompose(task, options = {}, context = {}) {
    const {
      maxDepth = MAX_DEPTH,
      minComplexity = MIN_COMPLEXITY_FOR_DECOMPOSITION,
    } = options;

    this.log(context, "info", "🔨 Decomposing task into subtasks...");

    try {
      const taskTree = await this.buildTaskTree(
        task,
        0,
        maxDepth,
        minComplexity,
        context
      );

      const subtaskCount = this.countSubtasks(taskTree);
      this.log(
        context,
        "success",
        `✅ Decomposed into ${subtaskCount} subtasks`
      );

      return taskTree;
    } catch (error) {
      this.log(context, "error", `Decomposition failed: ${error.message}`);
      // Return simple task on failure
      return {
        id: "root",
        task,
        subtasks: [],
        isLeaf: true,
      };
    }
  }

  /**
   * Build task tree recursively
   */
  async buildTaskTree(task, depth, maxDepth, minComplexity) {
    const taskNode = {
      id: `task_${depth}_${Date.now()}`,
      task,
      depth,
      subtasks: [],
      isLeaf: true,
      status: "pending",
    };

    // Check if further decomposition is needed
    if (depth >= maxDepth || task.length < minComplexity) {
      return taskNode;
    }

    // Analyze task for decomposition opportunities
    const subtasks = this.identifySubtasks(task);

    if (subtasks.length > 1) {
      taskNode.isLeaf = false;
      taskNode.subtasks = subtasks.map((st, i) => ({
        id: `task_${depth + 1}_${i}_${Date.now()}`,
        task: st.task,
        description: st.description,
        depth: depth + 1,
        subtasks: [],
        isLeaf: true,
        status: "pending",
        preconditions: st.preconditions || [],
        postconditions: st.postconditions || [],
      }));
    }

    return taskNode;
  }

  /**
   * Identify subtasks from task description using heuristics
   */
  identifySubtasks(task) {
    const subtasks = [];
    const taskLower = task.toLowerCase();

    // Pattern 1: "X and Y and Z" structure
    if (taskLower.includes(" and ")) {
      const parts = task
        .split(/\s+and\s+/i)
        .filter((p) => p.trim().length > 10);
      if (parts.length > 1) {
        for (const part of parts) {
          subtasks.push({
            task: part.trim(),
            description: `Handle: ${part.trim().slice(0, 50)}...`,
          });
        }
        return subtasks;
      }
    }

    // Pattern 2: Numbered items "1. X 2. Y"
    const numberedPattern = /(?:^|\s)(\d+)[.)]\s*(.+?)(?=(?:\s\d+[.)])|$)/g;
    let match;
    while ((match = numberedPattern.exec(task)) !== null) {
      subtasks.push({
        task: match[2].trim(),
        description: `Step ${match[1]}`,
      });
    }
    if (subtasks.length > 1) return subtasks;

    // Pattern 3: "First... Then... Finally..."
    const sequenceWords = [
      "first",
      "then",
      "next",
      "after that",
      "finally",
      "lastly",
    ];
    for (const word of sequenceWords) {
      if (taskLower.includes(word)) {
        const parts = task.split(new RegExp(`\\b${word}\\b`, "i"));
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.length > 20) {
            subtasks.push({
              task: trimmed,
              description: `Sequential step`,
            });
          }
        }
        if (subtasks.length > 1) return subtasks;
        subtasks.length = 0; // Reset if not enough
      }
    }

    // Pattern 4: Comma-separated list of actions
    if (taskLower.includes(",") && taskLower.split(",").length >= 3) {
      const parts = task
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 15);
      if (parts.length >= 3) {
        for (const part of parts) {
          subtasks.push({
            task: part,
            description: `Component task`,
          });
        }
        return subtasks;
      }
    }

    // No decomposition patterns found
    return [];
  }

  /**
   * Count total subtasks in tree
   */
  countSubtasks(node) {
    if (!node.subtasks || node.subtasks.length === 0) {
      return 1;
    }
    return (
      1 + node.subtasks.reduce((sum, st) => sum + this.countSubtasks(st), 0)
    );
  }

  /**
   * Execute a decomposed task tree
   * @param {Object} taskTree - The task tree to execute
   * @param {Function} executor - Function to execute leaf tasks
   * @param {Object} context - Execution context
   */
  async execute(taskTree, executor, context = {}) {
    this.log(context, "info", `▶️ Executing task tree...`);

    const results = await this.executeNode(taskTree, executor, context);

    const completedCount = this.countCompleted(taskTree);
    const totalCount = this.countSubtasks(taskTree);

    this.log(
      context,
      "success",
      `📊 Execution complete: ${completedCount}/${totalCount} tasks`
    );

    return results;
  }

  /**
   * Execute a single node and its children
   */
  async executeNode(node, executor, context) {
    if (node.isLeaf) {
      // Execute leaf task
      node.status = "running";
      this.log(context, "info", `🔄 Executing: ${node.task.slice(0, 50)}...`);

      try {
        node.result = await executor(node.task, context);
        node.status = "completed";
        return node.result;
      } catch (error) {
        node.status = "failed";
        node.error = error.message;
        throw error;
      }
    }

    // Execute subtasks
    node.status = "running";
    const results = [];

    for (const subtask of node.subtasks) {
      const result = await this.executeNode(subtask, executor, context);
      results.push(result);
    }

    node.status = "completed";
    node.result = results;
    return results;
  }

  /**
   * Count completed tasks
   */
  countCompleted(node) {
    if (!node.subtasks || node.subtasks.length === 0) {
      return node.status === "completed" ? 1 : 0;
    }
    return node.subtasks.reduce(
      (sum, st) => sum + this.countCompleted(st),
      node.status === "completed" ? 1 : 0
    );
  }

  /**
   * Get flattened list of all leaf tasks
   */
  getLeafTasks(node, leaves = []) {
    if (node.isLeaf) {
      leaves.push(node);
    } else {
      for (const subtask of node.subtasks) {
        this.getLeafTasks(subtask, leaves);
      }
    }
    return leaves;
  }

  /**
   * Generate progress report
   */
  getProgress(taskTree) {
    const total = this.countSubtasks(taskTree);
    const completed = this.countCompleted(taskTree);
    const leaves = this.getLeafTasks(taskTree);
    const pending = leaves.filter((l) => l.status === "pending").length;
    const running = leaves.filter((l) => l.status === "running").length;
    const failed = leaves.filter((l) => l.status === "failed").length;

    return {
      total,
      completed,
      pending,
      running,
      failed,
      percentComplete: Math.round((completed / total) * 100),
    };
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "DecompositionEngine",
        message,
        data,
      });
    }
  }
}

// Singleton
const decompositionEngine = new DecompositionEngine();
export default decompositionEngine;

export { DecompositionEngine };
