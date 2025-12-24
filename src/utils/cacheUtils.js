/**
 * Cache Utilities - WebLLM Model Cache Verification
 * Physical verification of model files in browser cache
 */

/**
 * Check if a model is physically cached in the browser storage.
 * WebLLM stores models in Cache API under 'webllm/model' or similar keys.
 *
 * @param {string} modelId - The model ID to check
 * @returns {Promise<boolean>} - True if model appears to be cached
 */
export async function checkModelIsCached(modelId) {
  if (!("caches" in window)) {
    console.warn("Cache API not available");
    return false;
  }

  try {
    const cacheKeys = await caches.keys();
    const mlcCaches = cacheKeys.filter(
      (key) =>
        key.includes("webllm") ||
        key.includes("mlc") ||
        key.includes("huggingface")
    );

    for (const cacheName of mlcCaches) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      // Look for model-specific files (wasm, weights, etc.)
      const modelFiles = requests.filter((req) =>
        req.url.toLowerCase().includes(modelId.toLowerCase().split("-q")[0])
      );

      // Model needs at least a few files to be considered cached
      if (modelFiles.length >= 2) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking model cache:", error);
    return false;
  }
}

/**
 * Verify all models in the downloadedModels array against actual cache.
 * Removes any models that aren't actually cached.
 *
 * @param {string[]} downloadedModels - Array of model IDs from store
 * @returns {Promise<string[]>} - Array of verified model IDs
 */
export async function verifyDownloadedModels(downloadedModels) {
  const verified = [];

  for (const modelId of downloadedModels) {
    const isCached = await checkModelIsCached(modelId);
    if (isCached) {
      verified.push(modelId);
    } else {
      console.warn(`Model ${modelId} not found in cache, removing from list`);
    }
  }

  return verified;
}

/**
 * Get estimated cache size for WebLLM models.
 *
 * @returns {Promise<{count: number, sizeEstimate: string}>}
 */
export async function getCacheStats() {
  if (!("caches" in window)) {
    return { count: 0, sizeEstimate: "N/A" };
  }

  try {
    const cacheKeys = await caches.keys();
    const mlcCaches = cacheKeys.filter(
      (key) =>
        key.includes("webllm") ||
        key.includes("mlc") ||
        key.includes("huggingface")
    );

    let totalFiles = 0;

    for (const cacheName of mlcCaches) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      totalFiles += requests.length;
    }

    // Rough estimate: average 50MB per cache entry for model files
    const sizeEstimateGB = ((totalFiles * 50) / 1024).toFixed(1);

    return {
      count: totalFiles,
      sizeEstimate: `~${sizeEstimateGB}GB`,
    };
  } catch {
    return { count: 0, sizeEstimate: "Error" };
  }
}
