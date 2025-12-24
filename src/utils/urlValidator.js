/**
 * URL Validator
 * Security utility to validate URLs before making HTTP requests
 * Blocks private IP ranges, dangerous protocols, and internal addresses
 */

// Private IP ranges that should not be accessible
const PRIVATE_IP_PATTERNS = [
  // IPv4 private ranges
  /^127\./, // Loopback
  /^10\./, // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
  /^192\.168\./, // Class C private
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^224\./, // Multicast
  /^255\./, // Broadcast

  // IPv6 patterns (simplified)
  /^::1$/, // Loopback
  /^fe80:/i, // Link-local
  /^fc00:/i, // Unique local
  /^fd00:/i, // Unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "127.0.0.1",
  "[::1]",
  "metadata.google.internal", // GCP metadata
  "169.254.169.254", // AWS/GCP/Azure metadata
  "metadata.internal",
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Check if a URL is safe to fetch
 * @param {string} url - URL to validate
 * @returns {{ safe: boolean, reason?: string }}
 */
export function isUrlSafe(url) {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return {
        safe: false,
        reason: `Protocol '${parsed.protocol}' is not allowed. Use http: or https:`,
      };
    }

    // Get hostname
    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    for (const blocked of BLOCKED_HOSTNAMES) {
      if (hostname === blocked || hostname === blocked.toLowerCase()) {
        return {
          safe: false,
          reason: `Hostname '${hostname}' is not allowed for security reasons`,
        };
      }
    }

    // Check for IP address patterns
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          safe: false,
          reason: `Private/internal IP addresses are not allowed`,
        };
      }
    }

    // Check for numeric IP (IPv4)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const octets = hostname.split(".").map(Number);

      // Validate octets
      if (octets.some((o) => o < 0 || o > 255)) {
        return { safe: false, reason: "Invalid IP address" };
      }

      // Block private ranges (redundant check but explicit)
      if (octets[0] === 10) {
        return {
          safe: false,
          reason: "Private IP range (10.x.x.x) is not allowed",
        };
      }
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
        return {
          safe: false,
          reason: "Private IP range (172.16-31.x.x) is not allowed",
        };
      }
      if (octets[0] === 192 && octets[1] === 168) {
        return {
          safe: false,
          reason: "Private IP range (192.168.x.x) is not allowed",
        };
      }
      if (octets[0] === 127) {
        return {
          safe: false,
          reason: "Loopback address (127.x.x.x) is not allowed",
        };
      }
      if (octets[0] === 0) {
        return {
          safe: false,
          reason: "Invalid IP range (0.x.x.x) is not allowed",
        };
      }
    }

    // Check for attempts to bypass via encoded characters
    if (url.includes("%00") || url.includes("%0d") || url.includes("%0a")) {
      return { safe: false, reason: "URL contains invalid encoded characters" };
    }

    // URL appears safe
    return { safe: true };
  } catch (error) {
    return { safe: false, reason: `Invalid URL: ${error.message}` };
  }
}

/**
 * Validate URL and throw if unsafe
 * @param {string} url - URL to validate
 * @throws {Error} If URL is not safe
 */
export function validateUrl(url) {
  const result = isUrlSafe(url);
  if (!result.safe) {
    throw new Error(`Blocked URL: ${result.reason}`);
  }
}

/**
 * Get a safe version of URL (for logging/display)
 * Masks potentially sensitive parts
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrlForDisplay(url) {
  try {
    const parsed = new URL(url);
    // Remove auth info
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return "[invalid URL]";
  }
}

export default { isUrlSafe, validateUrl, sanitizeUrlForDisplay };
