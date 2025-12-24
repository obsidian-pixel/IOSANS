/**
 * Artifact Storage Utility
 * Uses IndexedDB to store large files produced by workflow nodes
 */

const DB_NAME = "EchoesArtifactsDB";
const STORE_NAME = "artifacts";
const DB_VERSION = 1;

/**
 * Open IndexedDB connection
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) =>
      reject("IndexedDB error: " + event.target.error);

    request.onsuccess = (event) => resolve(event.target.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("executionId", "executionId", { unique: false });
        store.createIndex("nodeId", "nodeId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
};

/**
 * Save an artifact to storage
 * @param {Object} artifact - { id, nodeId, executionId, name, type, data (Blob/Text), timestamp }
 */
export const saveArtifact = async (artifact) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Ensure data is Blob or compatible
    const request = store.put(artifact);

    request.onsuccess = () => resolve(artifact);
    request.onerror = (event) => reject(event.target.error);
  });
};

/**
 * Get an artifact by ID
 */
export const getArtifact = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

/**
 * Get all artifacts for a specific execution
 */
export const getArtifactsByExecution = async (executionId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("executionId");
    const request = index.getAll(executionId);

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

/**
 * Get all artifacts (limit most recent)
 */
export const getAllArtifacts = async (limit = 100) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    // Get cursor in reverse direction (newest first)
    const request = index.openCursor(null, "prev");
    const results = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = (event) => reject(event.target.error);
  });
};

/**
 * Delete an artifact
 */
export const deleteArtifact = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
};

/**
 * Clear all artifacts
 */
export const clearArtifacts = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
};
