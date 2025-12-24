/**
 * MemoryService
 * Higher-level memory operations - context injection, pruning, retrieval
 * Builds on VectorMemory for intelligent context management
 */
import vectorMemory from "./VectorMemory.js";

// Configuration
const MAX_CONTEXT_TOKENS = 4000;
const DEFAULT_TOP_K = 5;
const RELEVANCE_THRESHOLD = 0.3;

class MemoryService {
  constructor() {
    this.name = "MemoryService";
    this.sessionMemory = []; // Short-term session memory
    this.maxSessionSize = 50;
  }

  /**
   * Store a memory (both session and long-term)
   * @param {string} text - Text to remember
   * @param {Object} options - { namespace, metadata, longTerm }
   * @param {Object} context - Execution context
   */
  async remember(text, options = {}, context = {}) {
    const { namespace = "default", metadata = {}, longTerm = true } = options;

    // Always add to session memory
    this.addToSession(text, metadata);

    // Optionally persist to vector store
    if (longTerm) {
      const embedding = await vectorMemory.generateEmbedding(text);
      await vectorMemory.upsert(
        {
          text,
          embedding,
          metadata: { ...metadata, addedAt: Date.now() },
          namespace,
        },
        context
      );
    }

    this.log(context, "success", `🧠 Remembered: ${text.slice(0, 40)}...`);
  }

  /**
   * Recall relevant memories for a query
   * @param {string} query - What to recall
   * @param {Object} options - { namespace, limit, includeSession }
   * @param {Object} context - Execution context
   */
  async recall(query, options = {}, context = {}) {
    const { namespace, limit = DEFAULT_TOP_K, includeSession = true } = options;

    const embedding = await vectorMemory.generateEmbedding(query);

    // Get from vector store
    const vectorResults = await vectorMemory.query(
      embedding,
      { namespace, limit, minScore: RELEVANCE_THRESHOLD },
      context
    );

    // Get from session memory
    let sessionResults = [];
    if (includeSession) {
      sessionResults = this.searchSession(query);
    }

    // Merge and deduplicate
    const allResults = [
      ...sessionResults.map((r) => ({ ...r, source: "session" })),
      ...vectorResults.map((r) => ({ ...r, source: "long_term" })),
    ];

    // Sort by score and limit
    const sorted = allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);

    this.log(context, "info", `📖 Recalled ${sorted.length} relevant memories`);
    return sorted;
  }

  /**
   * Inject relevant context into a prompt
   * @param {string} prompt - Original prompt
   * @param {Object} options - Configuration
   * @param {Object} context - Execution context
   */
  async injectContext(prompt, options = {}, context = {}) {
    const { namespace, maxMemories = 5 } = options;

    const memories = await this.recall(
      prompt,
      { namespace, limit: maxMemories },
      context
    );

    if (memories.length === 0) {
      return prompt;
    }

    const contextBlock = memories
      .map((m, i) => `[Memory ${i + 1}]: ${m.text}`)
      .join("\n");

    const enhancedPrompt = `RELEVANT CONTEXT FROM MEMORY:
${contextBlock}

---

USER REQUEST:
${prompt}`;

    return enhancedPrompt;
  }

  /**
   * Add to session memory
   */
  addToSession(text, metadata = {}) {
    this.sessionMemory.push({
      text,
      metadata,
      timestamp: Date.now(),
    });

    // Prune if too large
    if (this.sessionMemory.length > this.maxSessionSize) {
      this.sessionMemory = this.sessionMemory.slice(-this.maxSessionSize);
    }
  }

  /**
   * Search session memory (simple keyword match)
   */
  searchSession(query) {
    const queryWords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    return this.sessionMemory
      .map((m) => {
        const textWords = m.text.toLowerCase().split(/\s+/);
        let matchCount = 0;
        for (const word of textWords) {
          if (queryWords.has(word)) matchCount++;
        }
        return {
          ...m,
          score: queryWords.size > 0 ? matchCount / queryWords.size : 0,
        };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Prune old memories from vector store
   */
  async prune(options = {}, context = {}) {
    const { maxAge = 30 * 24 * 60 * 60 * 1000, namespace } = options; // Default 30 days

    const all = await vectorMemory.getAll(namespace);
    const cutoff = Date.now() - maxAge;

    let pruned = 0;
    for (const m of all) {
      if (m.timestamp < cutoff) {
        await vectorMemory.delete(m.id, context);
        pruned++;
      }
    }

    this.log(context, "info", `🧹 Pruned ${pruned} old memories`);
    return pruned;
  }

  /**
   * Clear session memory
   */
  clearSession() {
    this.sessionMemory = [];
  }

  /**
   * Get memory stats
   */
  async getStats() {
    const vectorStats = await vectorMemory.getStats();
    return {
      ...vectorStats,
      sessionSize: this.sessionMemory.length,
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
        nodeName: context.nodeName || "MemoryService",
        message,
        data,
      });
    }
  }
}

// Singleton
const memoryService = new MemoryService();
export default memoryService;

export { MemoryService };
