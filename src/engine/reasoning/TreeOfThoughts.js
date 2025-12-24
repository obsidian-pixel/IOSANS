/**
 * TreeOfThoughts
 * Branching reasoning with scoring and backtracking
 * Explores multiple paths for high-stakes decisions
 */
import webLLMService from "../WebLLMService";

// Configuration
const DEFAULT_BRANCH_COUNT = 3;
const DEFAULT_BEAM_WIDTH = 2;
const MAX_DEPTH = 4;

// ToT system prompt template
const TOT_SYSTEM_PROMPT = `You are an expert at exploring multiple reasoning paths.

When given a problem, generate {branchCount} different approaches to solve it.
For each approach:
1. Describe the reasoning path
2. Identify potential issues or dead-ends
3. Score the viability (1-10)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

Branch 1: [Approach name]
Reasoning: [Detailed reasoning for this approach]
Potential Issues: [What could go wrong]
Score: [X]/10

Branch 2: [Approach name]
Reasoning: [Detailed reasoning for this approach]
Potential Issues: [What could go wrong]
Score: [X]/10

Branch 3: [Approach name]
Reasoning: [Detailed reasoning for this approach]
Potential Issues: [What could go wrong]
Score: [X]/10

Best Branch: [Number of best scoring branch]
Final Answer: [Complete answer using the best branch's reasoning]`;

class TreeOfThoughts {
  constructor() {
    this.name = "Tree-of-Thoughts";
  }

  /**
   * Execute Tree-of-Thoughts reasoning
   * @param {string} input - User query
   * @param {Object} options - Configuration
   * @param {Object} context - Execution context
   * @param {Object} auditTrail - Trail to record steps
   */
  async execute(input, options = {}, context = {}, auditTrail = { steps: [] }) {
    const {
      systemPrompt = "",
      maxTokens = 3000,
      temperature = 0.8,
      branchCount = DEFAULT_BRANCH_COUNT,
      beamWidth = DEFAULT_BEAM_WIDTH,
      // enableBacktracking reserved for future use
    } = options;

    // Build enhanced system prompt
    const enhancedPrompt = `${systemPrompt}\n\n${TOT_SYSTEM_PROMPT.replace(
      "{branchCount}",
      branchCount.toString()
    )}`;

    this.log(
      context,
      "info",
      `Starting Tree-of-Thoughts with ${branchCount} branches...`
    );

    try {
      // Phase 1: Generate branches
      const branchResponse = await webLLMService.generateWithHistory(
        input,
        [],
        {
          systemPrompt: enhancedPrompt,
          maxTokens,
          temperature,
        }
      );

      // Parse branches
      const branches = this.parseBranches(branchResponse);

      // Log each branch
      for (const branch of branches) {
        auditTrail.steps.push({
          type: "tot_branch",
          branchNumber: branch.number,
          name: branch.name,
          reasoning: branch.reasoning,
          issues: branch.issues,
          score: branch.score,
          timestamp: new Date().toISOString(),
        });

        this.log(
          context,
          "info",
          `🌿 Branch ${branch.number}: ${branch.name} (Score: ${branch.score}/10)`
        );
      }

      // Phase 2: Select best branch(es) using beam search
      const topBranches = this.beamSelect(branches, beamWidth);
      this.log(
        context,
        "info",
        `🎯 Selected top ${topBranches.length} branch(es): ${topBranches
          .map((b) => b.number)
          .join(", ")}`
      );

      // Phase 3: Expand best branch if needed
      const bestBranch = topBranches[0];
      let finalAnswer = bestBranch?.finalAnswer || null;

      // If no clear final answer, generate one from best branch
      if (!finalAnswer && bestBranch) {
        finalAnswer = await this.expandBranch(
          bestBranch,
          input,
          options,
          context
        );
      }

      // Extract final answer from response if present
      const finalMatch = branchResponse.match(/Final Answer:\s*(.+?)$/is);
      if (finalMatch) {
        finalAnswer = finalMatch[1].trim();
      }

      // Log final selection
      auditTrail.steps.push({
        type: "tot_selection",
        selectedBranch: bestBranch?.number,
        finalAnswer,
        timestamp: new Date().toISOString(),
      });

      this.log(
        context,
        "success",
        `✅ Selected Branch ${bestBranch?.number || "none"}`
      );

      return {
        branches,
        selectedBranch: bestBranch,
        finalAnswer,
        rawResponse: branchResponse,
        branchCount: branches.length,
      };
    } catch (error) {
      this.log(context, "error", `ToT failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse branches from ToT response
   */
  parseBranches(response) {
    const branches = [];

    // Split by branch markers
    const branchBlocks = response
      .split(/(?=Branch\s*\d+\s*:)/i)
      .filter((b) => b.trim());

    for (const block of branchBlocks) {
      const numberMatch = block.match(/Branch\s*(\d+)\s*:\s*(.+?)(?:\n|$)/i);
      if (!numberMatch) continue;

      const reasoningMatch = block.match(
        /Reasoning:\s*(.+?)(?=\nPotential Issues:|Score:|$)/is
      );
      const issuesMatch = block.match(
        /Potential Issues:\s*(.+?)(?=\nScore:|$)/is
      );
      const scoreMatch = block.match(/Score:\s*(\d+)\/10/i);

      branches.push({
        number: parseInt(numberMatch[1], 10),
        name: numberMatch[2].trim(),
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
        issues: issuesMatch ? issuesMatch[1].trim() : "",
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : 5,
      });
    }

    return branches;
  }

  /**
   * Beam search selection - keep top N branches
   */
  beamSelect(branches, beamWidth) {
    return [...branches].sort((a, b) => b.score - a.score).slice(0, beamWidth);
  }

  /**
   * Expand a branch with more detailed reasoning
   */
  async expandBranch(branch, originalInput, options, context) {
    const expandPrompt = `Based on this reasoning approach:

Branch: ${branch.name}
Reasoning: ${branch.reasoning}

Original Question: ${originalInput}

Provide a complete, detailed answer using this approach:`;

    try {
      const expansion = await webLLMService.generateWithHistory(
        expandPrompt,
        [],
        {
          systemPrompt: options.systemPrompt || "",
          maxTokens: options.maxTokens || 1500,
          temperature: 0.7,
        }
      );

      this.log(context, "info", "🔍 Expanded best branch for detailed answer");

      return expansion;
    } catch (error) {
      this.log(context, "warning", `Branch expansion failed: ${error.message}`);
      return branch.reasoning;
    }
  }

  /**
   * Backtrack to alternative branch if current fails
   */
  async backtrack(branches, failedBranchIndex, input, options, context) {
    const remainingBranches = branches.filter(
      (_, i) => i !== failedBranchIndex
    );
    const nextBest = this.beamSelect(remainingBranches, 1)[0];

    if (nextBest) {
      this.log(
        context,
        "warning",
        `↩️ Backtracking to Branch ${nextBest.number}: ${nextBest.name}`
      );
      return this.expandBranch(nextBest, input, options, context);
    }

    return null;
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "Tree-of-Thoughts",
        message,
        data,
      });
    }
  }
}

export default TreeOfThoughts;
