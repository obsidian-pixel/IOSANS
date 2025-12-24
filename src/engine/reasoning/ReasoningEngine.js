/**
 * ReasoningEngine
 * Core orchestrator for multiple reasoning strategies
 * Supports Chain-of-Thought, Tree-of-Thoughts, and ReAct patterns
 */
// Note: webLLMService imported in ChainOfThought/TreeOfThoughts
import ChainOfThought from "./ChainOfThought";
import TreeOfThoughts from "./TreeOfThoughts";

// Reasoning strategy types
export const REASONING_STRATEGIES = {
  COT: "cot", // Chain-of-Thought: Linear step-by-step
  TOT: "tot", // Tree-of-Thoughts: Branching exploration
  REACT: "react", // ReAct: Thought-Action-Observation loop
  AUTO: "auto", // Auto-select based on task complexity
};

/**
 * ReasoningEngine - Orchestrates reasoning strategies
 */
class ReasoningEngine {
  constructor() {
    this.strategies = {
      [REASONING_STRATEGIES.COT]: new ChainOfThought(),
      [REASONING_STRATEGIES.TOT]: new TreeOfThoughts(),
    };
    this.auditTrail = [];
  }

  /**
   * Execute reasoning with selected strategy
   * @param {string} input - User query/task
   * @param {string} strategy - Reasoning strategy to use
   * @param {Object} options - Configuration options
   * @param {Object} context - Execution context with logging
   * @returns {Object} { steps, finalAnswer, auditTrail, metadata }
   */
  async reason(
    input,
    strategy = REASONING_STRATEGIES.AUTO,
    options = {},
    context = {}
  ) {
    const startTime = Date.now();

    // Auto-select strategy based on task complexity
    const selectedStrategy =
      strategy === REASONING_STRATEGIES.AUTO
        ? this.selectStrategy(input, options)
        : strategy;

    this.log(
      context,
      "info",
      `Starting reasoning with strategy: ${selectedStrategy.toUpperCase()}`
    );

    // Initialize audit trail for this run
    const auditTrail = {
      strategy: selectedStrategy,
      input,
      startTime: new Date().toISOString(),
      steps: [],
    };

    let result;

    try {
      switch (selectedStrategy) {
        case REASONING_STRATEGIES.COT:
          result = await this.strategies[REASONING_STRATEGIES.COT].execute(
            input,
            options,
            context,
            auditTrail
          );
          break;

        case REASONING_STRATEGIES.TOT:
          result = await this.strategies[REASONING_STRATEGIES.TOT].execute(
            input,
            options,
            context,
            auditTrail
          );
          break;

        case REASONING_STRATEGIES.REACT:
          // ReAct is handled separately via ToolCallingService
          result = {
            finalAnswer: null,
            steps: [],
            requiresReAct: true,
          };
          break;

        default:
          throw new Error(`Unknown reasoning strategy: ${selectedStrategy}`);
      }

      // Finalize audit trail
      auditTrail.endTime = new Date().toISOString();
      auditTrail.duration = Date.now() - startTime;
      auditTrail.success = true;

      this.log(
        context,
        "success",
        `Reasoning completed in ${auditTrail.duration}ms with ${auditTrail.steps.length} steps`
      );

      return {
        ...result,
        auditTrail,
        strategy: selectedStrategy,
      };
    } catch (error) {
      auditTrail.endTime = new Date().toISOString();
      auditTrail.duration = Date.now() - startTime;
      auditTrail.success = false;
      auditTrail.error = error.message;

      this.log(context, "error", `Reasoning failed: ${error.message}`);

      throw error;
    }
  }

  /**
   * Auto-select reasoning strategy based on input analysis
   */
  selectStrategy(input, options) {
    // Heuristics for strategy selection
    const inputLower = input.toLowerCase();

    // Use ToT for complex decision-making
    const totTriggers = [
      "compare",
      "evaluate",
      "choose between",
      "best option",
      "trade-off",
      "pros and cons",
      "analyze options",
      "decision",
    ];

    if (totTriggers.some((trigger) => inputLower.includes(trigger))) {
      return REASONING_STRATEGIES.TOT;
    }

    // Use ReAct if tools are available
    if (options.tools && options.tools.length > 0) {
      return REASONING_STRATEGIES.REACT;
    }

    // Default to CoT for general reasoning
    return REASONING_STRATEGIES.COT;
  }

  /**
   * Generate Chain-of-Thought prompt enhancement
   */
  static getCotPromptEnhancement() {
    return `Think through this step by step. For each step:
1. State what you're thinking about
2. Show your reasoning
3. Draw a conclusion before moving to the next step

Format your response with numbered steps:
Step 1: [Your first thought and reasoning]
Step 2: [Your second thought and reasoning]
...
Final Answer: [Your conclusion based on the steps above]`;
  }

  /**
   * Generate Tree-of-Thoughts prompt enhancement
   */
  static getTotPromptEnhancement() {
    return `Explore multiple reasoning paths for this problem:

For each approach:
- Branch A: [First approach and reasoning]
- Branch B: [Alternative approach and reasoning]
- Branch C: [Another alternative if applicable]

Evaluate each branch (score 1-10 for viability).
Select the best branch and provide your final answer.

Format:
Branch A: [reasoning] → Score: X/10
Branch B: [reasoning] → Score: X/10
Selected Branch: [A/B/C]
Final Answer: [Your conclusion from the best branch]`;
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "ReasoningEngine",
        message: `🧠 ${message}`,
        data,
      });
    }
  }
}

// Singleton
const reasoningEngine = new ReasoningEngine();
export default reasoningEngine;

export { ReasoningEngine };
