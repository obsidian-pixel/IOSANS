/**
 * WorkflowVersioning Service
 * Manages workflow version history with IndexedDB storage
 */

const DB_NAME = "sauvrn_versions";
const STORE_NAME = "workflow_versions";

class WorkflowVersioningService {
  constructor() {
    this.db = null;
    this.maxVersions = 50; // Max versions per workflow
  }

  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(new Error("Failed to open versions DB"));

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("workflowId", "workflowId", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
    });
  }

  async saveVersion(workflowId, workflowData, message = "") {
    await this.init();

    const version = {
      id: `${workflowId}-${Date.now()}`,
      workflowId,
      timestamp: new Date().toISOString(),
      message,
      data: JSON.parse(JSON.stringify(workflowData)), // Deep clone
      nodeCount: workflowData.nodes?.length || 0,
      edgeCount: workflowData.edges?.length || 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.add(version);

      tx.oncomplete = () => {
        this.pruneOldVersions(workflowId);
        resolve(version);
      };
      tx.onerror = () => reject(new Error("Failed to save version"));
    });
  }

  async getVersions(workflowId, limit = 20) {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("workflowId");
      const request = index.getAll(IDBKeyRange.only(workflowId));

      request.onsuccess = () => {
        const versions = request.result
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limit);
        resolve(versions);
      };
      request.onerror = () => reject(new Error("Failed to get versions"));
    });
  }

  async getVersion(versionId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(versionId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Failed to get version"));
    });
  }

  async restoreVersion(versionId) {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    return version.data;
  }

  async deleteVersion(versionId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(versionId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to delete version"));
    });
  }

  async pruneOldVersions(workflowId) {
    const versions = await this.getVersions(workflowId, 1000);

    if (versions.length > this.maxVersions) {
      const toDelete = versions.slice(this.maxVersions);
      for (const version of toDelete) {
        await this.deleteVersion(version.id);
      }
    }
  }

  formatTimestamp(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}

const versioningService = new WorkflowVersioningService();
export default versioningService;
