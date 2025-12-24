/**
 * VectorMemory
 * Local vector database using IndexedDB
 * Stores embeddings and enables semantic search
 */

// Configuration
const DB_NAME = "VectorMemoryDB";
const DB_VERSION = 1;
const STORE_NAME = "vectors";
const MAX_RESULTS = 10;

class VectorMemory {
  constructor() {
    this.name = "VectorMemory";
    this.db = null;
    this.embeddingDimension = 384; // Default for all-MiniLM-L6-v2
  }

  /**
   * Initialize the database
   */
  async initialize() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });

          store.createIndex("namespace", "namespace", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  /**
   * Upsert a vector with metadata
   * @param {Object} entry - { text, embedding, metadata, namespace }
   * @param {Object} context - Execution context
   */
  async upsert(entry, context = {}) {
    await this.initialize();

    const record = {
      text: entry.text,
      embedding: entry.embedding,
      metadata: entry.metadata || {},
      namespace: entry.namespace || "default",
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const request = entry.id
        ? store.put({ ...record, id: entry.id })
        : store.add(record);

      request.onsuccess = () => {
        this.log(
          context,
          "success",
          `📝 Vector stored: ${entry.text.slice(0, 30)}...`
        );
        resolve({ id: request.result, ...record });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query vectors by semantic similarity
   * @param {Array<number>} queryEmbedding - Query vector
   * @param {Object} options - { namespace, limit, minScore }
   * @param {Object} context - Execution context
   */
  async query(queryEmbedding, options = {}, context = {}) {
    await this.initialize();

    const { namespace, limit = MAX_RESULTS, minScore = 0 } = options;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      let request;
      if (namespace) {
        const index = store.index("namespace");
        request = index.getAll(namespace);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const results = request.result
          .map((record) => ({
            ...record,
            score: this.cosineSimilarity(queryEmbedding, record.embedding),
          }))
          .filter((r) => r.score >= minScore)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        this.log(context, "info", `🔍 Found ${results.length} similar vectors`);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a vector by ID
   */
  async delete(id, context = {}) {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.log(context, "info", `🗑️ Vector ${id} deleted`);
        resolve(true);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all vectors in a namespace
   */
  async getAll(namespace = null, context = {}) {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      let request;
      if (namespace) {
        const index = store.index("namespace");
        request = index.getAll(namespace);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all vectors in a namespace
   */
  async clearNamespace(namespace, context = {}) {
    const vectors = await this.getAll(namespace);

    for (const v of vectors) {
      await this.delete(v.id, context);
    }

    this.log(
      context,
      "info",
      `🧹 Cleared ${vectors.length} vectors from "${namespace}"`
    );
    return vectors.length;
  }

  /**
   * Get database stats
   */
  async getStats() {
    await this.initialize();

    const all = await this.getAll();
    const namespaces = {};

    for (const v of all) {
      const ns = v.namespace || "default";
      namespaces[ns] = (namespaces[ns] || 0) + 1;
    }

    return {
      totalVectors: all.length,
      namespaces,
      embeddingDimension: this.embeddingDimension,
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Simple text to embedding (placeholder - should use Transformers.js)
   * Returns a random embedding for now
   */
  async generateEmbedding(text) {
    // TODO: Replace with actual embedding generation using Transformers.js
    // For now, create a deterministic pseudo-embedding based on text hash
    const hash = this.simpleHash(text);
    const embedding = new Array(this.embeddingDimension);

    for (let i = 0; i < this.embeddingDimension; i++) {
      // Use hash to seed pseudo-random values
      embedding[i] = Math.sin(hash * (i + 1)) * Math.cos(hash / (i + 1));
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map((v) => v / norm);
  }

  /**
   * Simple hash function for deterministic embeddings
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Helper to log with context
   */
  log(context, type, message, data = null) {
    if (context.addLog) {
      context.addLog({
        type,
        nodeId: context.nodeId,
        nodeName: context.nodeName || "VectorMemory",
        message,
        data,
      });
    }
  }
}

// Singleton
const vectorMemory = new VectorMemory();
export default vectorMemory;

export { VectorMemory };
