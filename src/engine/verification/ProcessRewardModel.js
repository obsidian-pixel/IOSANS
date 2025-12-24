/**
 * ProcessRewardModel (PRM)
 * Scores reasoning steps, not just final answers
 * Enables step-level quality verification and drift detection
 */
// Note: PRM uses heuristic scoring, not LLM-based

// Configuration
const DRIFT_THRESHOLD = 0.3; // Alert if score drops more than 30%
const MIN_ACCEPTABLE_SCORE = 0.5;

class ProcessRewardModel {
  constructor() {
    this.name = "ProcessRewardModel";
    this.stepScores = [];
  }

  /**
   * Score a single reasoning step
   * @param {Object} step - The step to score
   * @param {string} originalQuestion - The original question for context
   * @param {Array} previousSteps - Previous steps for coherence check
   * @param {Object} context - Execution context
   * @returns {Object} { score, reasoning, flags }
   */
  async scoreStep(step, originalQuestion, previousSteps = [], context = {}) {
    const stepContent =
      typeof step === "string" ? step : step.content || JSON.stringify(step);

    // Calculate multiple scoring dimensions
    const scores = {
      relevance: this.scoreRelevance(stepContent, originalQuestion),
      coherence: this.scoreCoherence(stepContent, previousSteps),
      specificity: this.scoreSpecificity(stepContent),
      reasoning: this.scoreReasoningQuality(stepContent),
    };

    // Weighted average
    const weights = {
      relevance: 0.3,
      coherence: 0.25,
      specificity: 0.2,
      reasoning: 0.25,
    };

    const finalScore = Object.entries(scores).reduce(
      (sum, [key, value]) => sum + value * weights[key],
      0
    );

    // Track for drift detection
    this.stepScores.push(finalScore);

    // Detect drift
    const drift = this.detectDrift();

    const result = {
      score: finalScore,
      dimensions: scores,
      flags: [],
    };

    if (finalScore < MIN_ACCEPTABLE_SCORE) {
      result.flags.push("low_quality");
    }

    if (drift.detected) {
      result.flags.push("drift_detected");
      result.driftInfo = drift;
    }

    if (context.addLog && result.flags.length > 0) {
      this.log(
        context,
        "warning",
        `⚠️ Step quality: ${(finalScore * 100).toFixed(
          0
        )}% - ${result.flags.join(", ")}`
      );
    }

    return result;
  }

  /**
   * Score multiple steps and return aggregate metrics
   */
  async scoreSteps(steps, originalQuestion, context = {}) {
    this.stepScores = []; // Reset for new evaluation

    const results = [];
    const previousSteps = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const result = await this.scoreStep(
        step,
        originalQuestion,
        previousSteps,
        context
      );

      results.push({
        stepIndex: i,
        ...result,
      });

      previousSteps.push(step);
    }

    // Calculate aggregate metrics
    const avgScore =
      results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const minScore = Math.min(...results.map((r) => r.score));
    const maxScore = Math.max(...results.map((r) => r.score));

    const flaggedSteps = results.filter((r) => r.flags.length > 0);

    this.log(
      context,
      flaggedSteps.length > 0 ? "warning" : "success",
      `📊 PRM: Avg ${(avgScore * 100).toFixed(0)}% | Range ${(
        minScore * 100
      ).toFixed(0)}-${(maxScore * 100).toFixed(0)}% | ${
        flaggedSteps.length
      } flagged`
    );

    return {
      steps: results,
      aggregate: {
        average: avgScore,
        min: minScore,
        max: maxScore,
        flaggedCount: flaggedSteps.length,
        totalSteps: steps.length,
      },
    };
  }

  /**
   * Score relevance to original question
   */
  scoreRelevance(stepContent, question) {
    if (!question || !stepContent) return 0.5;

    const questionWords = new Set(
      question
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const stepWords = stepContent.toLowerCase().split(/\s+/);

    let matchCount = 0;
    for (const word of stepWords) {
      if (questionWords.has(word)) matchCount++;
    }

    // Normalize by question length
    const relevance = Math.min(matchCount / questionWords.size, 1);
    return 0.3 + relevance * 0.7; // Base score + relevance bonus
  }

  /**
   * Score coherence with previous steps
   */
  scoreCoherence(stepContent, previousSteps) {
    if (previousSteps.length === 0) return 0.8; // First step gets good coherence

    const stepLower = stepContent.toLowerCase();

    // Check for transition words
    const transitionWords = [
      "therefore",
      "because",
      "since",
      "thus",
      "however",
      "next",
      "then",
      "also",
      "additionally",
      "furthermore",
    ];

    const hasTransition = transitionWords.some((w) => stepLower.includes(w));

    // Check for reference to previous content
    const prevContent = previousSteps
      .map((s) => (typeof s === "string" ? s : s.content || ""))
      .join(" ")
      .toLowerCase();

    const prevWords = new Set(
      prevContent.split(/\s+/).filter((w) => w.length > 4)
    );
    const stepWords = stepLower.split(/\s+/);

    let overlapCount = 0;
    for (const word of stepWords) {
      if (prevWords.has(word)) overlapCount++;
    }

    const overlapScore = Math.min(overlapCount / 10, 0.5);
    const transitionScore = hasTransition ? 0.3 : 0;

    return Math.min(0.2 + overlapScore + transitionScore, 1);
  }

  /**
   * Score specificity (vague vs detailed)
   */
  scoreSpecificity(stepContent) {
    if (!stepContent) return 0.3;

    // Length-based component
    const lengthScore = Math.min(stepContent.length / 200, 0.4);

    // Check for specific indicators
    const specificIndicators = [
      /\d+/, // Numbers
      /"[^"]+"/, // Quoted text
      /\b(specifically|exactly|precisely|approximately)\b/i,
      /\b(because|since|due to|as a result)\b/i,
    ];

    const indicatorCount = specificIndicators.filter((r) =>
      r.test(stepContent)
    ).length;

    const indicatorScore = (indicatorCount / specificIndicators.length) * 0.4;

    // Penalize vague phrases
    const vagueIndicators = [
      /\b(maybe|perhaps|possibly|somewhat|sort of|kind of)\b/i,
      /\b(things|stuff|something|anything)\b/i,
      /\b(etc|and so on|and more)\b/i,
    ];

    const vagueCount = vagueIndicators.filter((r) =>
      r.test(stepContent)
    ).length;
    const vaguePenalty = vagueCount * 0.1;

    return Math.max(
      0.2,
      Math.min(lengthScore + indicatorScore - vaguePenalty + 0.2, 1)
    );
  }

  /**
   * Score reasoning quality
   */
  scoreReasoningQuality(stepContent) {
    if (!stepContent) return 0.3;

    const stepLower = stepContent.toLowerCase();

    // Check for reasoning structure
    const reasoningIndicators = [
      /\b(if|then|when|because|therefore|thus|hence)\b/,
      /\b(first|second|third|finally|next)\b/,
      /\b(conclude|infer|deduce|implies|suggests)\b/,
      /\b(evidence|reason|logic|analysis)\b/,
    ];

    let score = 0.3; // Base score

    for (const indicator of reasoningIndicators) {
      if (indicator.test(stepLower)) {
        score += 0.15;
      }
    }

    // Check for explanation depth
    if (stepContent.includes(":") || stepContent.includes(" - ")) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Detect drift in reasoning quality
   */
  detectDrift() {
    if (this.stepScores.length < 3) {
      return { detected: false };
    }

    const recent = this.stepScores.slice(-3);
    const earlier = this.stepScores.slice(0, -3);

    if (earlier.length === 0) {
      return { detected: false };
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const drift = earlierAvg - recentAvg;

    if (drift > DRIFT_THRESHOLD) {
      return {
        detected: true,
        magnitude: drift,
        direction: "declining",
        earlierAvg,
        recentAvg,
      };
    }

    return { detected: false };
  }

  /**
   * Reset scores for new evaluation
   */
  reset() {
    this.stepScores = [];
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "PRM",
        message,
        data,
      });
    }
  }
}

// Singleton
const processRewardModel = new ProcessRewardModel();
export default processRewardModel;

export { ProcessRewardModel };
