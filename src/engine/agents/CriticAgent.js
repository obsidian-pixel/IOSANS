/**
 * CriticAgent
 * Second-pass verification to detect and fix errors before output
 * Implements the "Critic" pattern for self-correction
 */
import webLLMService from "../WebLLMService";

// Configuration
const MAX_CORRECTION_ITERATIONS = 2;
const CONFIDENCE_THRESHOLD = 0.7;

// Critic system prompt
const CRITIC_SYSTEM_PROMPT = `You are a critical reviewer analyzing AI-generated responses for errors.

Your job is to:
1. Check for factual accuracy and logical consistency
2. Identify hallucinations (made-up facts, non-existent references)
3. Detect reasoning gaps or unsupported conclusions
4. Verify the response actually answers the original question

FORMAT YOUR REVIEW:
Accuracy Score: [1-10]
Issues Found:
- [Issue 1 description]
- [Issue 2 description]
Hallucination Risk: [LOW/MEDIUM/HIGH]
Needs Correction: [YES/NO]
Suggested Fix: [If YES, describe what needs to be fixed]`;

// Correction prompt template
const CORRECTION_PROMPT = `The following response was flagged for correction:

ORIGINAL QUESTION: {question}

ORIGINAL RESPONSE: {response}

ISSUES IDENTIFIED:
{issues}

Please provide a corrected response that:
1. Fixes the identified issues
2. Maintains the helpful parts of the original
3. Is factually accurate and logically consistent

Corrected Response:`;

class CriticAgent {
  constructor() {
    this.name = "CriticAgent";
  }

  /**
   * Review a response for errors and hallucinations
   * @param {string} originalQuestion - The user's original question
   * @param {string} response - The AI-generated response to review
   * @param {Object} options - Configuration options
   * @param {Object} context - Execution context
   * @returns {Object} { approved, score, issues, correctedResponse }
   */
  async review(originalQuestion, response, options = {}, context = {}) {
    const {
      maxTokens = 1000,
      temperature = 0.3, // Lower temperature for more consistent critique
      autoCorrect = true,
      maxIterations = MAX_CORRECTION_ITERATIONS,
    } = options;

    this.log(context, "info", "🔍 Starting Critic review...");

    try {
      // Phase 1: Review the response
      const reviewPrompt = `Review this AI response:

QUESTION: ${originalQuestion}

RESPONSE: ${response}

Analyze for accuracy, hallucinations, and reasoning gaps.`;

      const reviewResult = await webLLMService.generateWithHistory(
        reviewPrompt,
        [],
        {
          systemPrompt: CRITIC_SYSTEM_PROMPT,
          maxTokens,
          temperature,
        }
      );

      // Parse the review
      const parsed = this.parseReview(reviewResult);

      this.log(
        context,
        parsed.needsCorrection ? "warning" : "success",
        `📊 Critic Score: ${parsed.score}/10 | Hallucination Risk: ${parsed.hallucinationRisk}`
      );

      // If no correction needed, approve
      if (!parsed.needsCorrection || !autoCorrect) {
        return {
          approved: !parsed.needsCorrection,
          score: parsed.score,
          issues: parsed.issues,
          hallucinationRisk: parsed.hallucinationRisk,
          correctedResponse: null,
          originalResponse: response,
          iterations: 0,
        };
      }

      // Phase 2: Correct if needed
      this.log(context, "info", "✏️ Correction needed, regenerating...");

      let correctedResponse = response;
      let currentIteration = 0;
      let currentIssues = parsed.issues;

      while (currentIteration < maxIterations && parsed.needsCorrection) {
        currentIteration++;

        const correctionPromptFilled = CORRECTION_PROMPT.replace(
          "{question}",
          originalQuestion
        )
          .replace("{response}", correctedResponse)
          .replace("{issues}", currentIssues.join("\n- "));

        correctedResponse = await webLLMService.generateWithHistory(
          correctionPromptFilled,
          [],
          {
            systemPrompt:
              "You are a helpful assistant providing accurate, corrected responses.",
            maxTokens: options.responseMaxTokens || 2000,
            temperature: 0.7,
          }
        );

        this.log(
          context,
          "info",
          `🔄 Correction iteration ${currentIteration} complete`
        );

        // Re-review the correction (only if we have iterations left)
        if (currentIteration < maxIterations) {
          const reReview = await this.quickReview(
            originalQuestion,
            correctedResponse,
            options,
            context
          );

          if (!reReview.needsCorrection) {
            break;
          }
          currentIssues = reReview.issues;
        }
      }

      return {
        approved: true,
        score: parsed.score,
        issues: parsed.issues,
        hallucinationRisk: parsed.hallucinationRisk,
        correctedResponse,
        originalResponse: response,
        iterations: currentIteration,
      };
    } catch (error) {
      this.log(context, "error", `Critic review failed: ${error.message}`);
      // If review fails, pass through original response
      return {
        approved: true,
        score: null,
        issues: [],
        hallucinationRisk: "UNKNOWN",
        correctedResponse: null,
        originalResponse: response,
        error: error.message,
      };
    }
  }

  /**
   * Quick review for re-checking corrections
   */
  async quickReview(question, response) {
    const quickPrompt = `Quick check: Does this response to "${question.slice(
      0,
      100
    )}..." contain obvious errors or hallucinations?

RESPONSE: ${response.slice(0, 500)}...

Answer only: PASS or FAIL with brief reason.`;

    try {
      const result = await webLLMService.generateWithHistory(quickPrompt, [], {
        systemPrompt: "You are a quick fact-checker. Be concise.",
        maxTokens: 100,
        temperature: 0.2,
      });

      const isPassing =
        result.toLowerCase().includes("pass") ||
        !result.toLowerCase().includes("fail");

      return {
        needsCorrection: !isPassing,
        issues: isPassing ? [] : [result],
      };
    } catch {
      return { needsCorrection: false, issues: [] };
    }
  }

  /**
   * Parse the critic's review response
   */
  parseReview(reviewText) {
    const result = {
      score: 5,
      issues: [],
      hallucinationRisk: "MEDIUM",
      needsCorrection: false,
      suggestedFix: null,
    };

    // Parse score
    const scoreMatch = reviewText.match(/Accuracy Score:\s*(\d+)/i);
    if (scoreMatch) {
      result.score = parseInt(scoreMatch[1], 10);
    }

    // Parse issues
    const issuesMatch = reviewText.match(
      /Issues Found:\s*([\s\S]*?)(?=Hallucination Risk:|$)/i
    );
    if (issuesMatch) {
      result.issues = issuesMatch[1]
        .split(/\n-\s*/)
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
    }

    // Parse hallucination risk
    const riskMatch = reviewText.match(
      /Hallucination Risk:\s*(LOW|MEDIUM|HIGH)/i
    );
    if (riskMatch) {
      result.hallucinationRisk = riskMatch[1].toUpperCase();
    }

    // Parse correction need
    const correctionMatch = reviewText.match(/Needs Correction:\s*(YES|NO)/i);
    if (correctionMatch) {
      result.needsCorrection = correctionMatch[1].toUpperCase() === "YES";
    } else {
      // Infer from score and risk
      result.needsCorrection =
        result.score < 6 || result.hallucinationRisk === "HIGH";
    }

    // Parse suggested fix
    const fixMatch = reviewText.match(/Suggested Fix:\s*(.+?)$/is);
    if (fixMatch) {
      result.suggestedFix = fixMatch[1].trim();
    }

    return result;
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "CriticAgent",
        message,
        data,
      });
    }
  }
}

// Singleton
const criticAgent = new CriticAgent();
export default criticAgent;

export { CriticAgent };
