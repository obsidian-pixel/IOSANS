/**
 * ChainOfThought
 * Linear step-by-step reasoning with explicit verbalization
 * Creates Industrial Audit Trail for transparency
 */
import webLLMService from "../WebLLMService";

// Maximum steps to prevent runaway reasoning
const MAX_STEPS = 15;

// CoT system prompt template
const COT_SYSTEM_PROMPT = `You are a methodical reasoning assistant. Think through problems step by step.

INSTRUCTIONS:
1. Break down your thinking into clear, numbered steps
2. Each step should show your reasoning process
3. Be explicit about what you're considering at each step
4. After all steps, provide a clear Final Answer

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Step 1: [Your first thought - what are you analyzing?]
Step 2: [Your second thought - what conclusions can you draw?]
Step 3: [Continue as needed...]
Final Answer: [Your complete conclusion based on the reasoning above]

Remember: Show your work. Each step should be a complete thought.`;

class ChainOfThought {
  constructor() {
    this.name = "Chain-of-Thought";
  }

  /**
   * Execute Chain-of-Thought reasoning
   * @param {string} input - User query
   * @param {Object} options - Configuration
   * @param {Object} context - Execution context
   * @param {Object} auditTrail - Trail to record steps
   */
  async execute(input, options = {}, context = {}, auditTrail = { steps: [] }) {
    const {
      systemPrompt = "",
      maxTokens = 2000,
      temperature = 0.7,
      streamSteps = true,
    } = options;

    // Build enhanced system prompt
    const enhancedPrompt = `${systemPrompt}\n\n${COT_SYSTEM_PROMPT}`;

    this.log(context, "info", "Starting Chain-of-Thought reasoning...");

    try {
      // Generate response with CoT prompt
      const response = await webLLMService.generateWithHistory(
        input,
        [],
        {
          systemPrompt: enhancedPrompt,
          maxTokens,
          temperature,
        },
        streamSteps
          ? (token, fullText) =>
              this.handleStreamToken(token, fullText, context)
          : null
      );

      // Parse the response into steps
      const parsed = this.parseCoTResponse(response);

      // Record each step in audit trail
      for (const step of parsed.steps) {
        auditTrail.steps.push({
          type: "cot_step",
          stepNumber: step.number,
          content: step.content,
          timestamp: new Date().toISOString(),
        });

        this.log(
          context,
          "info",
          `📝 Step ${step.number}: ${step.content.slice(0, 80)}...`
        );
      }

      // Log final answer
      if (parsed.finalAnswer) {
        this.log(
          context,
          "success",
          `✅ Final Answer: ${parsed.finalAnswer.slice(0, 100)}...`
        );
      }

      return {
        steps: parsed.steps,
        finalAnswer: parsed.finalAnswer,
        rawResponse: response,
        stepCount: parsed.steps.length,
      };
    } catch (error) {
      this.log(context, "error", `CoT failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse CoT response into structured steps
   */
  parseCoTResponse(response) {
    const steps = [];
    let finalAnswer = null;

    // Match Step N: pattern
    const stepRegex =
      /Step\s*(\d+)\s*:\s*(.+?)(?=Step\s*\d+\s*:|Final Answer:|$)/gis;
    let match;

    while ((match = stepRegex.exec(response)) !== null) {
      steps.push({
        number: parseInt(match[1], 10),
        content: match[2].trim(),
      });
    }

    // Extract final answer
    const finalMatch = response.match(/Final Answer:\s*(.+?)$/is);
    if (finalMatch) {
      finalAnswer = finalMatch[1].trim();
    }

    // If no structured steps found, treat entire response as single step
    if (steps.length === 0 && response.trim()) {
      steps.push({
        number: 1,
        content: response.trim(),
      });
      finalAnswer = response.trim();
    }

    return { steps, finalAnswer };
  }

  /**
   * Generate confidence score for a step
   */
  scoreStep(step) {
    // Simple heuristic scoring
    let score = 0.5;

    // Longer, more detailed steps get higher scores
    if (step.content.length > 100) score += 0.1;
    if (step.content.length > 200) score += 0.1;

    // Steps with reasoning keywords get higher scores
    const reasoningKeywords = [
      "because",
      "therefore",
      "since",
      "thus",
      "conclude",
      "implies",
      "suggests",
    ];
    if (
      reasoningKeywords.some((kw) => step.content.toLowerCase().includes(kw))
    ) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "Chain-of-Thought",
        message,
        data,
      });
    }
  }
}

export default ChainOfThought;
