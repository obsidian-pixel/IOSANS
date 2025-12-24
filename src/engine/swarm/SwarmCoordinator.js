/**
 * SwarmCoordinator
 * Orchestrates multiple specialized AI agents working together
 * Manages task distribution, agent communication, and result synthesis
 */
import webLLMService from "../WebLLMService";

// Agent role definitions
const AGENT_ROLES = {
  CODER: {
    id: "coder",
    name: "Coder",
    emoji: "💻",
    systemPrompt: `You are an expert software developer. Your responsibilities:
- Write clean, efficient, well-documented code
- Debug and fix issues
- Suggest architectural improvements
- Explain technical implementations

Focus on practical, working solutions. Be concise in explanations.`,
    capabilities: [
      "code_generation",
      "debugging",
      "refactoring",
      "documentation",
    ],
  },

  RESEARCHER: {
    id: "researcher",
    name: "Researcher",
    emoji: "🔬",
    systemPrompt: `You are a thorough research analyst. Your responsibilities:
- Gather and synthesize information
- Fact-check claims
- Provide citations and sources
- Identify knowledge gaps

Be comprehensive but concise. Prioritize accuracy over speed.`,
    capabilities: ["research", "fact_checking", "summarization", "citation"],
  },

  ARCHITECT: {
    id: "architect",
    name: "Architect",
    emoji: "📐",
    systemPrompt: `You are a systems architect and technical lead. Your responsibilities:
- Design system architectures
- Make high-level technical decisions
- Identify risks and trade-offs
- Plan implementation approaches

Think holistically. Consider scalability, security, and maintainability.`,
    capabilities: ["design", "planning", "risk_analysis", "system_thinking"],
  },

  CRITIC: {
    id: "critic",
    name: "Critic",
    emoji: "🔍",
    systemPrompt: `You are a critical reviewer. Your responsibilities:
- Review work from other agents
- Identify errors and improvements
- Provide constructive feedback
- Ensure quality standards

Be thorough but fair. Focus on actionable feedback.`,
    capabilities: ["review", "quality_assurance", "feedback", "verification"],
  },

  COORDINATOR: {
    id: "coordinator",
    name: "Coordinator",
    emoji: "🎯",
    systemPrompt: `You are a project coordinator. Your responsibilities:
- Break down tasks into subtasks
- Assign work to appropriate agents
- Synthesize results from multiple agents
- Ensure coherent final output

Think about task dependencies and optimal sequencing.`,
    capabilities: ["task_breakdown", "delegation", "synthesis", "coordination"],
  },
};

class SwarmCoordinator {
  constructor() {
    this.name = "SwarmCoordinator";
    this.agents = { ...AGENT_ROLES };
    this.messageHistory = [];
    this.activeAgents = new Set();
  }

  /**
   * Run a swarm task with multiple agents
   * @param {string} task - The main task to accomplish
   * @param {Object} options - Configuration options
   * @param {Object} context - Execution context
   */
  async runSwarm(task, options = {}, context = {}) {
    const {
      agents = ["coordinator", "coder", "researcher"],
      maxRounds = 5,
      temperature = 0.7,
      maxTokens = 2000,
    } = options;

    this.log(context, "info", `🐝 Swarm starting with ${agents.length} agents`);

    this.messageHistory = [];
    this.activeAgents = new Set(agents);

    try {
      // Phase 1: Coordinator breaks down the task
      const coordinator = this.agents.COORDINATOR;
      const breakdown = await this.runAgent(
        coordinator,
        `Break down this task and identify which specialists should handle each part:

TASK: ${task}

Available specialists: ${agents.filter((a) => a !== "coordinator").join(", ")}

Provide a structured breakdown with assigned agents.`,
        { temperature: 0.5, maxTokens },
        context
      );

      this.addMessage("coordinator", breakdown);

      // Phase 2: Specialists work on their assigned parts
      const specialistResponses = [];
      for (const agentId of agents) {
        if (agentId === "coordinator") continue;

        const agent = this.agents[agentId.toUpperCase()];
        if (!agent) continue;

        const response = await this.runAgent(
          agent,
          `Based on the coordinator's breakdown, complete your assigned portion:

ORIGINAL TASK: ${task}

COORDINATOR'S BREAKDOWN:
${breakdown}

Focus on your specialty (${agent.name}) and provide your contribution.`,
          { temperature, maxTokens },
          context
        );

        this.addMessage(agentId, response);
        specialistResponses.push({ agent: agentId, response });
      }

      // Phase 3: Coordinator synthesizes results
      const synthesis = await this.runAgent(
        coordinator,
        `Synthesize the specialist responses into a coherent final answer:

ORIGINAL TASK: ${task}

SPECIALIST CONTRIBUTIONS:
${specialistResponses
  .map((s) => `[${s.agent.toUpperCase()}]: ${s.response}`)
  .join("\n\n")}

Provide a unified, comprehensive response.`,
        { temperature: 0.5, maxTokens: maxTokens * 1.5 },
        context
      );

      this.log(context, "success", "✅ Swarm completed successfully");

      return {
        finalAnswer: synthesis,
        breakdown,
        specialistResponses,
        messageHistory: this.messageHistory,
        agentsUsed: agents,
      };
    } catch (error) {
      this.log(context, "error", `Swarm failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run a single agent
   */
  async runAgent(agent, prompt, options, context) {
    this.log(context, "info", `${agent.emoji} ${agent.name} working...`);

    const response = await webLLMService.generateWithHistory(prompt, [], {
      systemPrompt: agent.systemPrompt,
      maxTokens: options.maxTokens || 1500,
      temperature: options.temperature || 0.7,
    });

    return response;
  }

  /**
   * Add message to history
   */
  addMessage(agentId, content) {
    this.messageHistory.push({
      agent: agentId,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Route a task to the best agent
   */
  routeTask(task) {
    const taskLower = task.toLowerCase();

    // Simple keyword-based routing
    if (taskLower.match(/\b(code|implement|fix|debug|function|class)\b/)) {
      return "coder";
    }
    if (taskLower.match(/\b(research|find|search|analyze|investigate)\b/)) {
      return "researcher";
    }
    if (taskLower.match(/\b(design|architect|plan|structure|system)\b/)) {
      return "architect";
    }
    if (taskLower.match(/\b(review|check|verify|critique|improve)\b/)) {
      return "critic";
    }

    return "coordinator";
  }

  /**
   * Get agent info
   */
  getAgentInfo(agentId) {
    return this.agents[agentId.toUpperCase()] || null;
  }

  /**
   * Get all available agents
   */
  getAvailableAgents() {
    return Object.values(this.agents).map((a) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      capabilities: a.capabilities,
    }));
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "SwarmCoordinator",
        message,
        data,
      });
    }
  }
}

// Singleton
const swarmCoordinator = new SwarmCoordinator();
export default swarmCoordinator;

export { SwarmCoordinator, AGENT_ROLES };
