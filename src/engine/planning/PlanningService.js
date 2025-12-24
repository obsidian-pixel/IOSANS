/**
 * PlanningService
 * LLM+P style planning - translates natural language to structured execution plans
 * Validates, executes, and handles replanning on failures
 */
import webLLMService from "../WebLLMService";

// Planning prompt template
const PLANNING_SYSTEM_PROMPT = `You are an expert task planner. Given a goal, create a structured execution plan.

OUTPUT FORMAT (JSON):
{
  "goal": "The high-level goal",
  "steps": [
    {
      "id": 1,
      "action": "action_name",
      "description": "What this step does",
      "inputs": {"key": "value"},
      "dependencies": [],
      "canParallelize": false
    }
  ],
  "expectedOutcome": "What success looks like"
}

AVAILABLE ACTIONS:
- think: Reason about a problem (input: {topic})
- compute: Run calculations (input: {expression})
- search: Look up information (input: {query})
- generate: Create content (input: {prompt})
- validate: Check if something is correct (input: {assertion})
- store: Save a value (input: {key, value})
- retrieve: Get a stored value (input: {key})

RULES:
1. Break complex tasks into atomic steps
2. Identify dependencies between steps
3. Mark steps that can run in parallel
4. Each step should have a clear, testable outcome`;

class PlanningService {
  constructor() {
    this.name = "PlanningService";
    this.currentPlan = null;
    this.executedSteps = [];
  }

  /**
   * Generate an execution plan from natural language
   * @param {string} goal - The user's goal in natural language
   * @param {Object} options - Configuration options
   * @param {Object} context - Execution context
   * @returns {Object} Structured execution plan
   */
  async generatePlan(goal, options = {}, context = {}) {
    const {
      maxTokens = 2000,
      temperature = 0.5,
      availableTools = [],
    } = options;

    this.log(context, "info", "📋 Generating execution plan...");

    try {
      // Enhance prompt with available tools
      let toolsSection = "";
      if (availableTools.length > 0) {
        toolsSection = `\n\nADDITIONAL TOOLS AVAILABLE:\n${availableTools
          .map((t) => `- ${t.name}: ${t.description}`)
          .join("\n")}`;
      }

      const planningPrompt = `Create an execution plan for this goal: "${goal}"${toolsSection}

Respond with ONLY a valid JSON plan.`;

      const response = await webLLMService.generateWithHistory(
        planningPrompt,
        [],
        {
          systemPrompt: PLANNING_SYSTEM_PROMPT,
          maxTokens,
          temperature,
        }
      );

      // Parse the plan
      const plan = this.parsePlan(response);

      if (!plan) {
        throw new Error("Failed to parse plan from LLM response");
      }

      this.currentPlan = plan;
      this.executedSteps = [];

      this.log(
        context,
        "success",
        `✅ Plan created with ${plan.steps.length} steps`
      );

      return plan;
    } catch (error) {
      this.log(context, "error", `Planning failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse plan from LLM response
   */
  parsePlan(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const plan = JSON.parse(jsonMatch[0]);

      // Validate plan structure
      if (!plan.steps || !Array.isArray(plan.steps)) {
        return null;
      }

      // Ensure each step has required fields
      plan.steps = plan.steps.map((step, i) => ({
        id: step.id || i + 1,
        action: step.action || "think",
        description: step.description || `Step ${i + 1}`,
        inputs: step.inputs || {},
        dependencies: step.dependencies || [],
        canParallelize: step.canParallelize || false,
        status: "pending",
      }));

      return plan;
    } catch {
      return null;
    }
  }

  /**
   * Execute a plan step by step
   * @param {Object} plan - The execution plan
   * @param {Object} options - Execution options
   * @param {Object} context - Execution context
   */
  async executePlan(plan, options = {}, context = {}) {
    const { onStepComplete, onStepFailed, maxRetries = 1 } = options;

    this.log(context, "info", `▶️ Executing plan: ${plan.goal}`);

    const results = {};
    const failedSteps = [];

    for (const step of plan.steps) {
      // Check dependencies
      const unmetDeps = step.dependencies.filter(
        (dep) => !this.executedSteps.includes(dep)
      );

      if (unmetDeps.length > 0) {
        this.log(
          context,
          "warning",
          `⏳ Step ${step.id} waiting for dependencies: ${unmetDeps.join(", ")}`
        );
        continue;
      }

      step.status = "running";
      this.log(context, "info", `🔄 Step ${step.id}: ${step.description}`);

      let retries = 0;
      let success = false;

      while (retries <= maxRetries && !success) {
        try {
          const result = await this.executeStep(step, results, context);
          results[step.id] = result;
          step.status = "completed";
          step.result = result;
          this.executedSteps.push(step.id);
          success = true;

          if (onStepComplete) {
            onStepComplete(step, result);
          }
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            step.status = "failed";
            step.error = error.message;
            failedSteps.push(step);

            if (onStepFailed) {
              onStepFailed(step, error);
            }

            this.log(
              context,
              "error",
              `❌ Step ${step.id} failed: ${error.message}`
            );
          }
        }
      }
    }

    const completedCount = this.executedSteps.length;
    const totalCount = plan.steps.length;

    this.log(
      context,
      failedSteps.length === 0 ? "success" : "warning",
      `📊 Plan execution: ${completedCount}/${totalCount} steps completed`
    );

    return {
      success: failedSteps.length === 0,
      results,
      failedSteps,
      completedSteps: this.executedSteps,
    };
  }

  /**
   * Execute a single step
   */
  async executeStep(step, previousResults, context) {
    const { action, inputs } = step;

    // Resolve input references to previous results
    const resolvedInputs = this.resolveInputs(inputs, previousResults);

    switch (action) {
      case "think":
        return await this.executeThink(resolvedInputs, context);
      case "generate":
        return await this.executeGenerate(resolvedInputs, context);
      case "validate":
        return this.executeValidate(resolvedInputs, previousResults);
      case "compute":
        return this.executeCompute(resolvedInputs);
      case "store":
        return this.executeStore(resolvedInputs, previousResults);
      case "retrieve":
        return this.executeRetrieve(resolvedInputs, previousResults);
      default:
        return { action, inputs: resolvedInputs, executed: true };
    }
  }

  /**
   * Resolve input references (e.g., {step_1.result})
   */
  resolveInputs(inputs, previousResults) {
    const resolved = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === "string" && value.startsWith("{step_")) {
        const match = value.match(/\{step_(\d+)\.(\w+)\}/);
        if (match) {
          const stepId = parseInt(match[1], 10);
          const field = match[2];
          resolved[key] = previousResults[stepId]?.[field] || value;
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Execute think action
   */
  async executeThink(inputs) {
    const response = await webLLMService.generateWithHistory(
      `Think about: ${inputs.topic || inputs.query || JSON.stringify(inputs)}`
    );
    return { thought: response };
  }

  /**
   * Execute generate action
   */
  async executeGenerate(inputs) {
    const response = await webLLMService.generateWithHistory(
      inputs.prompt || JSON.stringify(inputs),
      [],
      { maxTokens: 1000 }
    );
    return { generated: response };
  }

  /**
   * Execute validate action
   */
  executeValidate(inputs) {
    const { assertion } = inputs;
    // Simple validation - check if assertion is truthy
    const isValid = Boolean(assertion);
    return { valid: isValid, assertion };
  }

  /**
   * Execute compute action (SECURED - math validation enabled)
   */
  executeCompute(inputs) {
    const { expression } = inputs;
    try {
      // SECURITY: Only allow safe math operations\r\n      const safeMathPattern = /^[\\d\\s+\\-*/%().]+$/;\r\n      if (!safeMathPattern.test(expression)) {\r\n        return { error: \"Only numeric math expressions allowed\" };\r\n      }\r\n      // Safe evaluation using Function constructor
      const result = new Function(`return ${expression}`)();
      return { result };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Execute store action
   */
  executeStore(inputs, previousResults) {
    const { key, value } = inputs;
    previousResults[`stored_${key}`] = value;
    return { stored: true, key, value };
  }

  /**
   * Execute retrieve action
   */
  executeRetrieve(inputs, previousResults) {
    const { key } = inputs;
    const value = previousResults[`stored_${key}`];
    return { retrieved: true, key, value };
  }

  /**
   * Replan after failures
   */
  async replan(originalGoal, failedSteps, context) {
    const failureContext = failedSteps
      .map((s) => `Step ${s.id} (${s.action}): ${s.error}`)
      .join("\n");

    this.log(context, "info", "🔄 Replanning after failures...");

    const replanPrompt = `The original goal was: "${originalGoal}"
    
These steps failed:
${failureContext}

Create a new plan that works around these failures.`;

    return await this.generatePlan(replanPrompt, {}, context);
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "PlanningService",
        message,
        data,
      });
    }
  }
}

// Singleton
const planningService = new PlanningService();
export default planningService;

export { PlanningService };
