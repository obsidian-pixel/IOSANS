/**
 * Auto-Detect Type Utility
 * Intelligently detects MIME type and file extension from data
 */

/**
 * Detect the appropriate MIME type and extension for data
 * @param {*} data - The data to analyze
 * @returns {{ mimeType: string, extension: string, data: *, isBlob: boolean }}
 */
export function autoDetectType(data) {
  // Null/undefined
  if (data == null) {
    return {
      mimeType: "text/plain",
      extension: ".txt",
      data: "",
      isBlob: false,
    };
  }

  // Direct Blob detection
  if (data instanceof Blob) {
    return {
      mimeType: data.type || "application/octet-stream",
      extension: getExtensionFromMime(data.type),
      data: data,
      isBlob: true,
    };
  }

  // ArrayBuffer/TypedArray
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return {
      mimeType: "application/octet-stream",
      extension: ".bin",
      data: new Blob([data]),
      isBlob: true,
    };
  }

  // Check for object with blob properties
  if (typeof data === "object" && data !== null) {
    // Audio blob
    if (data.audioBlob instanceof Blob) {
      return {
        mimeType: data.audioBlob.type || "audio/wav",
        extension: ".wav",
        data: data.audioBlob,
        isBlob: true,
      };
    }

    // Image blob
    if (data.imageBlob instanceof Blob) {
      return {
        mimeType: data.imageBlob.type || "image/png",
        extension: ".png",
        data: data.imageBlob,
        isBlob: true,
      };
    }

    // Video blob
    if (data.videoBlob instanceof Blob) {
      return {
        mimeType: data.videoBlob.type || "video/mp4",
        extension: ".mp4",
        data: data.videoBlob,
        isBlob: true,
      };
    }

    // URL with blob reference
    if (typeof data.url === "string" && data.url.startsWith("blob:")) {
      const inferredType =
        data.type || data.mimeType || "application/octet-stream";
      return {
        mimeType: inferredType,
        extension: getExtensionFromMime(inferredType),
        data: data.url,
        isBlob: false,
        isBlobUrl: true,
      };
    }

    // Regular object - JSON
    return {
      mimeType: "application/json",
      extension: ".json",
      data: JSON.stringify(data, null, 2),
      isBlob: false,
    };
  }

  // String analysis
  if (typeof data === "string") {
    // Base64 data URI - audio
    if (data.startsWith("data:audio/")) {
      const mimeMatch = data.match(/^data:(audio\/[^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "audio/wav";
      return {
        mimeType,
        extension: getExtensionFromMime(mimeType),
        data: data,
        isBlob: false,
        isDataUri: true,
      };
    }

    // Base64 data URI - image
    if (data.startsWith("data:image/")) {
      const mimeMatch = data.match(/^data:(image\/[^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      return {
        mimeType,
        extension: getExtensionFromMime(mimeType),
        data: data,
        isBlob: false,
        isDataUri: true,
      };
    }

    // Base64 data URI - video
    if (data.startsWith("data:video/")) {
      const mimeMatch = data.match(/^data:(video\/[^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "video/mp4";
      return {
        mimeType,
        extension: getExtensionFromMime(mimeType),
        data: data,
        isBlob: false,
        isDataUri: true,
      };
    }

    // HTML content
    if (
      /<[a-z][\s\S]*>/i.test(data) &&
      (data.includes("<html") || data.includes("<div") || data.includes("<p>"))
    ) {
      return {
        mimeType: "text/html",
        extension: ".html",
        data: data,
        isBlob: false,
      };
    }

    // Try to parse as JSON
    if (
      (data.startsWith("{") && data.endsWith("}")) ||
      (data.startsWith("[") && data.endsWith("]"))
    ) {
      try {
        JSON.parse(data);
        return {
          mimeType: "application/json",
          extension: ".json",
          data: data,
          isBlob: false,
        };
      } catch {
        // Not valid JSON, continue to text
      }
    }

    // Markdown detection
    if (
      data.includes("# ") ||
      data.includes("## ") ||
      data.includes("```") ||
      data.includes("**")
    ) {
      return {
        mimeType: "text/markdown",
        extension: ".md",
        data: data,
        isBlob: false,
      };
    }

    // CSV detection (simple heuristic)
    if (
      data.includes(",") &&
      data.split("\n").every((line) => line.split(",").length > 1)
    ) {
      return {
        mimeType: "text/csv",
        extension: ".csv",
        data: data,
        isBlob: false,
      };
    }

    // Plain text
    return {
      mimeType: "text/plain",
      extension: ".txt",
      data: data,
      isBlob: false,
    };
  }

  // Numbers, booleans, etc.
  return {
    mimeType: "text/plain",
    extension: ".txt",
    data: String(data),
    isBlob: false,
  };
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType) {
  const mimeMap = {
    // Audio
    "audio/wav": ".wav",
    "audio/wave": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/flac": ".flac",
    "audio/aac": ".aac",
    "audio/mp4": ".m4a",

    // Video
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",

    // Images
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",

    // Text/Code
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/html": ".html",
    "text/css": ".css",
    "text/javascript": ".js",
    "text/csv": ".csv",

    // Data
    "application/json": ".json",
    "application/xml": ".xml",
    "application/yaml": ".yaml",

    // Documents
    "application/pdf": ".pdf",

    // Binary
    "application/octet-stream": ".bin",
  };

  return mimeMap[mimeType] || ".bin";
}

/**
 * Convert data URI to Blob
 */
export function dataUriToBlob(dataUri) {
  try {
    const [header, base64] = dataUri.split(",");
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }

    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  } catch {
    return null;
  }
}

export default autoDetectType;
