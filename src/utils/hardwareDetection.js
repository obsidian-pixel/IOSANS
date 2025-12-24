/**
 * Hardware Detection
 * Detect GPU capabilities and estimate VRAM for AI model compatibility
 */

let cachedHardwareInfo = null;

/**
 * Detect WebGPU support and GPU capabilities
 * @returns {Promise<Object>} Hardware info
 */
export async function detectHardware() {
  // Return cached result if available
  if (cachedHardwareInfo) {
    return cachedHardwareInfo;
  }

  const info = {
    webgpu: false,
    gpuVendor: null,
    gpuRenderer: null,
    estimatedVRAM: 0,
    tier: "cpu", // cpu, low, medium, high
    warning: null,
    recommendations: [],
  };

  // Check WebGPU support
  if ("gpu" in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        info.webgpu = true;

        // Get adapter info
        const adapterInfo = await adapter.requestAdapterInfo?.();
        if (adapterInfo) {
          info.gpuVendor = adapterInfo.vendor || "Unknown";
          info.gpuRenderer = adapterInfo.device || "Unknown GPU";
        }

        // Try to estimate VRAM from limits
        const limits = adapter.limits;
        const maxBufferSize = limits.maxBufferSize || 0;
        const maxStorageBufferSize = limits.maxStorageBufferBindingSize || 0;

        // Rough VRAM estimation based on buffer limits
        const estimatedGB =
          Math.max(maxBufferSize, maxStorageBufferSize) / (1024 * 1024 * 1024);
        info.estimatedVRAM = Math.round(estimatedGB * 10) / 10;

        // Tier classification
        if (info.estimatedVRAM >= 8) {
          info.tier = "high";
        } else if (info.estimatedVRAM >= 4) {
          info.tier = "medium";
        } else if (info.estimatedVRAM >= 2) {
          info.tier = "low";
        } else if (info.webgpu) {
          info.tier = "low";
        }
      }
    } catch (error) {
      console.warn("WebGPU detection failed:", error);
      info.warning = "WebGPU available but adapter request failed";
    }
  }

  // Check WebGL fallback for GPU info if WebGPU failed
  if (!info.gpuRenderer) {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          info.gpuVendor =
            gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Unknown";
          info.gpuRenderer =
            gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown GPU";
        }
      }
    } catch (_error) {
      // WebGL detection failed silently
    }
  }

  // Generate recommendations
  if (info.tier === "cpu") {
    info.recommendations.push(
      "WebGPU not supported - AI will run on CPU (slower)"
    );
    info.warning = "No GPU acceleration available";
  } else if (info.tier === "low") {
    info.recommendations.push("Limited VRAM - use smaller AI models");
    info.recommendations.push("Recommended: Phi-3-mini, Gemma-2B");
  } else if (info.tier === "medium") {
    info.recommendations.push("Moderate VRAM - most models will work");
    info.recommendations.push("Recommended: Mistral-7B, Llama-3.1-8B");
  } else if (info.tier === "high") {
    info.recommendations.push("High VRAM - all models supported");
  }

  cachedHardwareInfo = info;
  return info;
}

/**
 * Get tier color for UI badges
 */
export function getTierColor(tier) {
  switch (tier) {
    case "high":
      return "#22c55e"; // Green
    case "medium":
      return "#f59e0b"; // Amber
    case "low":
      return "#f87171"; // Red
    case "cpu":
      return "#6b7280"; // Gray
    default:
      return "#6b7280";
  }
}

/**
 * Get tier emoji for UI
 */
export function getTierEmoji(tier) {
  switch (tier) {
    case "high":
      return "🚀";
    case "medium":
      return "⚡";
    case "low":
      return "🐢";
    case "cpu":
      return "⚠️";
    default:
      return "❓";
  }
}

/**
 * Check if a model is compatible with current hardware
 * @param {string} modelId - Model identifier
 * @param {number} requiredVRAM - Minimum VRAM in GB
 * @returns {Object} Compatibility info
 */
export async function checkModelCompatibility(modelId, requiredVRAM = 4) {
  const info = await detectHardware();

  return {
    compatible: info.estimatedVRAM >= requiredVRAM || info.tier === "cpu",
    warning:
      info.estimatedVRAM < requiredVRAM
        ? `Model requires ${requiredVRAM}GB VRAM, only ~${info.estimatedVRAM}GB available`
        : null,
    tier: info.tier,
    fallback: info.tier === "cpu" ? "Will run on CPU (slower)" : null,
  };
}

/**
 * Clear cached hardware info (useful for re-detection)
 */
export function clearHardwareCache() {
  cachedHardwareInfo = null;
}

export default {
  detectHardware,
  getTierColor,
  getTierEmoji,
  checkModelCompatibility,
  clearHardwareCache,
};
