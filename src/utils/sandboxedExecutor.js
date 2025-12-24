/**
 * Sandboxed JavaScript Executor
 * Provides a secure execution environment for user code
 * by restricting access to dangerous globals and APIs
 */

// Blocked globals that should not be accessible in sandbox
const BLOCKED_GLOBALS = [
  "window",
  "document",
  "location",
  "navigator",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
  "ServiceWorker",
  "importScripts",
  "eval",
  "Function",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "cookieStore",
  "crypto",
  "Notification",
  "alert",
  "confirm",
  "prompt",
  "open",
  "close",
  "postMessage",
  "parent",
  "top",
  "frames",
  "opener",
  "self",
  "globalThis",
];

// Safe globals that user code can access
const SAFE_GLOBALS = {
  // Math operations
  Math: Math,

  // Data types
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  RegExp: RegExp,
  Map: Map,
  Set: Set,
  WeakMap: WeakMap,
  WeakSet: WeakSet,

  // JSON handling
  JSON: JSON,

  // Promises (for async code)
  Promise: Promise,

  // Error types
  Error: Error,
  TypeError: TypeError,
  RangeError: RangeError,
  SyntaxError: SyntaxError,

  // Utilities
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  encodeURI: encodeURI,
  decodeURI: decodeURI,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,

  // Console (sandboxed - only log)
  console: {
    log: (...args) => console.log("[Sandbox]", ...args),
    info: (...args) => console.info("[Sandbox]", ...args),
    warn: (...args) => console.warn("[Sandbox]", ...args),
    error: (...args) => console.error("[Sandbox]", ...args),
  },

  // Timeout (wrapped to prevent abuse)
  setTimeout: (fn, delay) => {
    const maxDelay = 30000; // 30 second max
    return setTimeout(fn, Math.min(delay, maxDelay));
  },

  // Undefined/null
  undefined: undefined,
  NaN: NaN,
  Infinity: Infinity,
};

/**
 * Execute JavaScript code in a sandboxed environment
 * @param {string} code - The user code to execute
 * @param {*} input - Input data available as 'input' variable
 * @param {Object} context - Execution context (limited version)
 * @param {Object} options - Execution options
 * @returns {Promise<*>} Result of code execution
 */
export async function executeSandboxed(
  code,
  input,
  context = {},
  options = {}
) {
  const { timeout = 30000 } = options;

  // Validate code is a string
  if (typeof code !== "string") {
    throw new Error("Code must be a string");
  }

  // Check for obviously dangerous patterns
  const dangerousPatterns = [
    /\beval\s*\(/gi,
    /\bFunction\s*\(/gi,
    /\bimport\s*\(/gi,
    /\bimport\s+/gi,
    /\brequire\s*\(/gi,
    /\b__proto__\b/gi,
    /\bconstructor\s*\[/gi,
    /\bprototype\b/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(
        `Potentially dangerous code pattern detected: ${pattern.source}`
      );
    }
  }

  // Create sandbox context with safe globals and blocked placeholders
  const sandboxContext = {
    ...SAFE_GLOBALS,
    input,
    // Provide limited context info
    context: {
      nodeId: context.nodeId,
      // Don't expose addLog or other functions
    },
  };

  // Create blocking proxies for dangerous globals
  for (const name of BLOCKED_GLOBALS) {
    sandboxContext[name] = new Proxy(
      {},
      {
        get() {
          throw new Error(
            `Access to '${name}' is not allowed in sandboxed code`
          );
        },
        set() {
          throw new Error(`Cannot modify '${name}' in sandboxed code`);
        },
        apply() {
          throw new Error(`Cannot call '${name}' in sandboxed code`);
        },
      }
    );
  }

  // Build argument names and values for the sandbox function
  const argNames = Object.keys(sandboxContext);
  const argValues = Object.values(sandboxContext);

  // Wrap user code in async IIFE
  const wrappedCode = `
    "use strict";
    return (async () => {
      ${code}
    })();
  `;

  try {
    // Create the sandboxed function
    // Note: We still use Function constructor but with blocked globals injected
    const sandboxedFn = new Function(...argNames, wrappedCode);

    // Execute with timeout
    const result = await Promise.race([
      sandboxedFn(...argValues),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);

    return result;
  } catch (error) {
    // Sanitize error message to avoid leaking internals
    const safeMessage = error.message
      .replace(/at\s+.*?:\d+:\d+/g, "")
      .replace(/\n\s+at\s+.*/g, "")
      .trim();

    throw new Error(`Sandbox execution error: ${safeMessage}`);
  }
}

/**
 * Validate code without executing it
 * @param {string} code - Code to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSandboxedCode(code) {
  if (typeof code !== "string") {
    return { valid: false, error: "Code must be a string" };
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /\beval\s*\(/gi, name: "eval()" },
    { pattern: /\bFunction\s*\(/gi, name: "Function()" },
    { pattern: /\bimport\s*\(/gi, name: "dynamic import" },
    { pattern: /\bimport\s+/gi, name: "import statement" },
    { pattern: /\brequire\s*\(/gi, name: "require()" },
    { pattern: /\b__proto__\b/gi, name: "__proto__" },
    { pattern: /\bconstructor\s*\[/gi, name: "constructor access" },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: `Dangerous pattern detected: ${name}` };
    }
  }

  // Try to parse as JavaScript
  try {
    new Function(code);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Syntax error: ${error.message}` };
  }
}

export default { executeSandboxed, validateSandboxedCode };
