/**
 * Workflow Validator
 * Security utility to validate and sanitize imported workflow JSON
 * Checks for malicious code patterns and validates structure
 */

// Valid node types in the system
const VALID_NODE_TYPES = [
  "manualTrigger",
  "scheduleTrigger",
  "webhookTrigger",
  "errorTrigger",
  "browserEventTrigger",
  "httpRequest",
  "codeExecutor",
  "pythonExecutor",
  "setVariable",
  "fileSystem",
  "localStorage",
  "ifElse",
  "loop",
  "switch",
  "merge",
  "aiAgent",
  "chatModel",
  "vectorMemory",
  "waitForApproval",
  "textToSpeech",
  "imageGeneration",
  "subWorkflow",
  "output",
  "toolCall",
  "vectorStore",
];

// Dangerous patterns in code/expressions
const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/gi, name: "eval() call" },
  { pattern: /\bFunction\s*\(/g, name: "Function constructor" },
  { pattern: /\bimport\s*\(/gi, name: "dynamic import" },
  { pattern: /\brequire\s*\(/gi, name: "require() call" },
  { pattern: /\b__proto__\b/g, name: "__proto__ access" },
  { pattern: /\bconstructor\s*\[/g, name: "constructor property access" },
  { pattern: /\bdocument\.(cookie|write)/gi, name: "document manipulation" },
  {
    pattern: /\blocalStorage\.(get|set|remove)/gi,
    name: "localStorage access",
  },
  {
    pattern: /\bfetch\s*\(\s*['"`]https?:\/\/(localhost|127\.|10\.|192\.168)/gi,
    name: "internal fetch",
  },
  { pattern: /\bXMLHttpRequest\b/gi, name: "XMLHttpRequest" },
  { pattern: /\bWebSocket\b/gi, name: "WebSocket" },
  { pattern: /\bchild_process\b/gi, name: "child_process" },
  { pattern: /\bexecSync\b/gi, name: "execSync" },
  { pattern: /\bspawnSync\b/gi, name: "spawnSync" },
  { pattern: /<script\b/gi, name: "script tag" },
  { pattern: /javascript:/gi, name: "javascript: protocol" },
  { pattern: /on\w+\s*=/gi, name: "inline event handler" },
];

// Suspicious but not necessarily malicious
const SUSPICIOUS_PATTERNS = [
  { pattern: /\bwindow\b/gi, name: "window object access" },
  { pattern: /\bdocument\b/gi, name: "document object access" },
  { pattern: /\bfetch\s*\(/gi, name: "fetch call" },
  { pattern: /\.innerHTML\b/gi, name: "innerHTML usage" },
  { pattern: /\bsetTimeout\s*\(/gi, name: "setTimeout call" },
  { pattern: /\bsetInterval\s*\(/gi, name: "setInterval call" },
];

/**
 * Scan text for dangerous patterns
 * @param {string} text - Text to scan
 * @returns {{ dangerous: Array, suspicious: Array }}
 */
function scanForPatterns(text) {
  if (typeof text !== "string") return { dangerous: [], suspicious: [] };

  const dangerous = [];
  const suspicious = [];

  for (const { pattern, name } of DANGEROUS_PATTERNS) {
    if (pattern.test(text)) {
      dangerous.push(name);
    }
    // Reset regex lastIndex
    pattern.lastIndex = 0;
  }

  for (const { pattern, name } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      suspicious.push(name);
    }
    pattern.lastIndex = 0;
  }

  return { dangerous, suspicious };
}

/**
 * Validate a workflow structure and content
 * @param {Object} workflow - Workflow to validate
 * @returns {{ valid: boolean, errors: Array, warnings: Array, sanitized?: Object }}
 */
export function validateWorkflow(workflow) {
  const errors = [];
  const warnings = [];

  // Check basic structure
  if (!workflow || typeof workflow !== "object") {
    return {
      valid: false,
      errors: ["Workflow must be an object"],
      warnings: [],
    };
  }

  if (!Array.isArray(workflow.nodes)) {
    return {
      valid: false,
      errors: ["Workflow must have a nodes array"],
      warnings: [],
    };
  }

  if (!Array.isArray(workflow.edges)) {
    return {
      valid: false,
      errors: ["Workflow must have an edges array"],
      warnings: [],
    };
  }

  // Validate each node
  const nodeIds = new Set();

  for (let i = 0; i < workflow.nodes.length; i++) {
    const node = workflow.nodes[i];
    const nodeRef = `Node ${i + 1} (${node.id || "no id"})`;

    // Check required fields
    if (!node.id) {
      errors.push(`${nodeRef}: Missing node id`);
    } else if (nodeIds.has(node.id)) {
      errors.push(`${nodeRef}: Duplicate node id '${node.id}'`);
    } else {
      nodeIds.add(node.id);
    }

    if (!node.type) {
      errors.push(`${nodeRef}: Missing node type`);
    } else if (!VALID_NODE_TYPES.includes(node.type)) {
      errors.push(`${nodeRef}: Invalid node type '${node.type}'`);
    }

    // Check position
    if (
      !node.position ||
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    ) {
      warnings.push(`${nodeRef}: Invalid or missing position`);
    }

    // Scan node data for dangerous patterns
    if (node.data) {
      // Check code fields
      const codeFields = [
        "code",
        "systemMessage",
        "userMessage",
        "defaultPayload",
      ];

      for (const field of codeFields) {
        if (node.data[field]) {
          const scan = scanForPatterns(node.data[field]);

          if (scan.dangerous.length > 0) {
            warnings.push(
              `${nodeRef}: Field '${field}' contains potentially dangerous patterns: ${scan.dangerous.join(
                ", "
              )}`
            );
          }

          if (
            scan.suspicious.length > 0 &&
            node.type !== "codeExecutor" &&
            node.type !== "pythonExecutor"
          ) {
            warnings.push(
              `${nodeRef}: Field '${field}' contains suspicious patterns: ${scan.suspicious.join(
                ", "
              )}`
            );
          }
        }
      }

      // Check for code in non-code nodes
      if (
        node.data.code &&
        !["codeExecutor", "pythonExecutor"].includes(node.type)
      ) {
        warnings.push(
          `${nodeRef}: Unexpected 'code' field in ${node.type} node`
        );
      }
    }
  }

  // Validate edges
  for (let i = 0; i < workflow.edges.length; i++) {
    const edge = workflow.edges[i];
    const edgeRef = `Edge ${i + 1}`;

    if (!edge.source) {
      errors.push(`${edgeRef}: Missing source`);
    } else if (!nodeIds.has(edge.source)) {
      errors.push(`${edgeRef}: Source '${edge.source}' does not exist`);
    }

    if (!edge.target) {
      errors.push(`${edgeRef}: Missing target`);
    } else if (!nodeIds.has(edge.target)) {
      errors.push(`${edgeRef}: Target '${edge.target}' does not exist`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize a workflow by removing or escaping dangerous content
 * @param {Object} workflow - Workflow to sanitize
 * @returns {Object} Sanitized workflow
 */
export function sanitizeWorkflow(workflow) {
  const sanitized = JSON.parse(JSON.stringify(workflow)); // Deep clone

  for (const node of sanitized.nodes) {
    if (!node.data) continue;

    // For code executor nodes, add a warning comment
    if (node.type === "codeExecutor" && node.data.code) {
      const scan = scanForPatterns(node.data.code);
      if (scan.dangerous.length > 0) {
        // Prefix code with warning
        node.data.code = `// ⚠️ WARNING: This code was flagged during import for: ${scan.dangerous.join(
          ", "
        )}\n// Review carefully before executing\n\n${node.data.code}`;
        node.data._securityWarning = scan.dangerous;
      }
    }
  }

  return sanitized;
}

/**
 * Quick check if a workflow appears safe
 * @param {Object} workflow - Workflow to check
 * @returns {boolean}
 */
export function isWorkflowSafe(workflow) {
  const result = validateWorkflow(workflow);
  return result.valid && result.warnings.length === 0;
}

export default {
  validateWorkflow,
  sanitizeWorkflow,
  isWorkflowSafe,
  VALID_NODE_TYPES,
};
