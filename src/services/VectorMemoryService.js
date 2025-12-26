/**
 * VectorMemoryService
 * Service for managing local vector memory.
 * Uses IndexedDB for persistence and simple text similarity (Jaccard) for search
 * since we don't have a local embedding model loaded by default.
 */

const DB_NAME = "EchoesVectorMemoryDB";
const STORE_NAME = "memories";
const DB_VERSION = 1;

class VectorMemoryService {
  constructor() {
    this.dbPromise = null;
  }

  // Initialize/open the database
  async _openDB() {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "namespace",
          });
          store.createIndex("namespace", "namespace", { unique: true });
        }
      };
    });

    return this.dbPromise;
  }

  // Load namespace data from IndexedDB
  async _load(namespace) {
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(namespace);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.items || []);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Memory load error:", err);
      // Fallback to localStorage for migration
      const oldData = localStorage.getItem(`echoes_memory_${namespace}`);
      return oldData ? JSON.parse(oldData) : [];
    }
  }

  // Save namespace data to IndexedDB
  async _save(namespace, data) {
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({
          namespace,
          items: data,
          updatedAt: Date.now(),
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Memory save error:", err);
      // Fallback to localStorage
      localStorage.setItem(`echoes_memory_${namespace}`, JSON.stringify(data));
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
    const current = await this._load(namespace);
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

    await this._save(namespace, current);

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
    const current = await this._load(namespace);

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
      await this._save(namespace, []);
      return { status: "success", deleted: "all" };
    }

    const current = await this._load(namespace);
    const initialCount = current.length;

    const idsToDelete = new Set(Array.isArray(ids) ? ids : [ids]);
    const filtered = current.filter((item) => !idsToDelete.has(item.id));

    await this._save(namespace, filtered);

    return {
      status: "success",
      deleted: initialCount - filtered.length,
      remaining: filtered.length,
    };
  }

  /**
   * Migrate existing localStorage data to IndexedDB
   */
  async migrateFromLocalStorage() {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("echoes_memory_")
    );

    for (const key of keys) {
      const namespace = key.replace("echoes_memory_", "");
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const items = JSON.parse(data);
          await this._save(namespace, items);
          localStorage.removeItem(key); // Clean up after migration
        } catch {
          // Silent - migration errors are non-critical
        }
      }
    }
  }
}

export const vectorMemoryService = new VectorMemoryService();

// Auto-migrate on load
vectorMemoryService.migrateFromLocalStorage().catch(console.error);
