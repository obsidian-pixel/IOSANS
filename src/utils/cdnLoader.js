/**
 * CDN Loader
 * Dynamically load JavaScript libraries from CDN URLs
 */

// Cache of loaded libraries
const loadedLibraries = new Map();
const pendingLoads = new Map();

/**
 * Load a JavaScript library from a CDN URL
 * @param {string} url - CDN URL to load (e.g., https://unpkg.com/lodash@4.17.21/lodash.min.js)
 * @param {string} globalName - Optional window global name to check/return
 * @returns {Promise<any>} - Resolves with library or true when loaded
 */
export async function loadFromCDN(url, globalName = null) {
  // Check cache
  if (loadedLibraries.has(url)) {
    return loadedLibraries.get(url);
  }

  // Check if already loading
  if (pendingLoads.has(url)) {
    return pendingLoads.get(url);
  }

  // Create loading promise
  const loadPromise = new Promise((resolve, reject) => {
    // Validate URL
    if (!isValidCDNUrl(url)) {
      reject(new Error(`Invalid CDN URL: ${url}`));
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    script.onload = () => {
      // Get the library from window if global name provided
      const library = globalName ? window[globalName] : true;
      loadedLibraries.set(url, library);
      pendingLoads.delete(url);
      resolve(library);
    };

    script.onerror = () => {
      pendingLoads.delete(url);
      reject(new Error(`Failed to load library from: ${url}`));
    };

    document.head.appendChild(script);
  });

  pendingLoads.set(url, loadPromise);
  return loadPromise;
}

/**
 * Load multiple CDN libraries
 * @param {Array<{url: string, globalName?: string}>} libraries
 * @returns {Promise<Object>} - Map of globalName -> library
 */
export async function loadMultipleCDN(libraries) {
  const results = {};

  for (const lib of libraries) {
    try {
      const result = await loadFromCDN(lib.url, lib.globalName);
      if (lib.globalName) {
        results[lib.globalName] = result;
      }
    } catch (error) {
      console.error(`Failed to load ${lib.url}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Pre-load libraries for faster execution
 * @param {string[]} urls - Array of CDN URLs to preload
 */
export function preloadCDN(urls) {
  urls.forEach((url) => {
    if (!loadedLibraries.has(url) && !pendingLoads.has(url)) {
      // Use link preload for faster loading
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = url;
      link.as = "script";
      document.head.appendChild(link);
    }
  });
}

/**
 * Validate CDN URL format and allowed hosts
 */
function isValidCDNUrl(url) {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== "https:") {
      return false;
    }

    // Allowed CDN hosts
    const allowedHosts = [
      "unpkg.com",
      "cdn.jsdelivr.net",
      "cdnjs.cloudflare.com",
      "esm.sh",
      "esm.run",
      "cdn.skypack.dev",
      "cdn.pika.dev",
      "ga.jspm.io",
    ];

    return allowedHosts.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

/**
 * Get popular CDN examples
 */
export const CDN_EXAMPLES = [
  {
    name: "Lodash",
    url: "https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js",
    globalName: "_",
  },
  {
    name: "Axios",
    url: "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js",
    globalName: "axios",
  },
  {
    name: "Day.js",
    url: "https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js",
    globalName: "dayjs",
  },
  {
    name: "UUID",
    url: "https://cdn.jsdelivr.net/npm/uuid@8/dist/umd/uuid.min.js",
    globalName: "uuid",
  },
  {
    name: "Marked (Markdown)",
    url: "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
    globalName: "marked",
  },
];

/**
 * Clear loaded library cache
 */
export function clearCDNCache() {
  loadedLibraries.clear();
}

export default {
  loadFromCDN,
  loadMultipleCDN,
  preloadCDN,
  clearCDNCache,
  CDN_EXAMPLES,
};
