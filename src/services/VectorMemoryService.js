/**
 * VectorMemoryService
 * Service for managing local vector memory.
 * Uses localStorage for persistence and simple text similarity (Jaccard) for search
 * since we don't have a local embedding model loaded by default.
 */
class VectorMemoryService {
  constructor() {
    this.storagePrefix = "echoes_memory_";
  }

  // Get namespace key
  _getKey(namespace) {
    return `${this.storagePrefix}${namespace}`;
  }

  // Load namespace data
  _load(namespace) {
    try {
      const data = localStorage.getItem(this._getKey(namespace));
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error("Memory load error:", err);
      return [];
    }
  }

  // Save namespace data
  _save(namespace, data) {
    try {
      localStorage.setItem(this._getKey(namespace), JSON.stringify(data));
    } catch (err) {
      console.error("Memory save error:", err);
    }
  }

  // Generate tokens from text (simple word tokenization)
  _tokenize(text) {
    if (!text) return new Set();
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  }

  // Calculate Jaccard similarity between two text strings
  _similarity(text1, text2) {
    const set1 = this._tokenize(text1);
    const set2 = this._tokenize(text2);

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Upsert items into memory
   * @param {string} namespace - Storage namespace
   * @param {Array<Object>} items - Items to store. Each should have { id, text, metadata }
   */
  async upsert(namespace = "default", items) {
    const current = this._load(namespace);
    const timestamp = Date.now();

    // Convert single item to array
    const itemsArray = Array.isArray(items) ? items : [items];

    let addedCount = 0;
    let updatedCount = 0;

    itemsArray.forEach((newItem) => {
      // Ensure ID
      if (!newItem.id)
        newItem.id = `mem_${timestamp}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

      const existingIndex = current.findIndex((c) => c.id === newItem.id);

      const entry = {
        id: newItem.id,
        text: newItem.text || JSON.stringify(newItem),
        metadata: newItem.metadata || {},
        timestamp,
      };

      if (existingIndex >= 0) {
        current[existingIndex] = entry;
        updatedCount++;
      } else {
        current.push(entry);
        addedCount++;
      }
    });

    this._save(namespace, current);

    return {
      status: "success",
      added: addedCount,
      updated: updatedCount,
      total: current.length,
    };
  }

  /**
   * Query memory
   * @param {string} namespace - Storage namespace
   * @param {string} queryText - Text to search for
   * @param {number} topK - Number of results to return
   * @param {number} minScore - Minimum similarity score (0-1)
   */
  async query(namespace = "default", queryText, topK = 5, minScore = 0.1) {
    const current = this._load(namespace);

    const results = current
      .map((item) => {
        const score = this._similarity(queryText, item.text);
        return { ...item, score };
      })
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      matches: results,
      count: results.length,
    };
  }

  /**
   * Delete items from memory
   * @param {string} namespace - Storage namespace
   * @param {Array<string>} ids - IDs to delete. If empty/null and deleteAll=true, clears namespace
   * @param {boolean} deleteAll - If true, clears the entire namespace
   */
  async delete(namespace = "default", ids = [], deleteAll = false) {
    if (deleteAll) {
      localStorage.removeItem(this._getKey(namespace));
      return { status: "success", deleted: "all" };
    }

    const current = this._load(namespace);
    const initialCount = current.length;

    const idsToDelete = new Set(Array.isArray(ids) ? ids : [ids]);
    const filtered = current.filter((item) => !idsToDelete.has(item.id));

    this._save(namespace, filtered);

    return {
      status: "success",
      deleted: initialCount - filtered.length,
      remaining: filtered.length,
    };
  }
}

export const vectorMemoryService = new VectorMemoryService();
