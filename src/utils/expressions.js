/**
 * Expression Engine
 * Parses and evaluates {{ expression }} syntax in node configurations
 *
 * Syntax:
 * - {{ $json.field }} - Access input data fields
 * - {{ $input }} - Full input object
 * - {{ $now }} - Current ISO timestamp
 * - {{ $uuid }} - Generate a UUID
 * - {{ $index }} - Loop index (when in loop context)
 * - {{ $item }} - Current loop item
 * - {{ 1 + 2 }} - Basic math
 * - {{ $json.name.toUpperCase() }} - String methods
 */

// Built-in functions available in expressions
const BUILT_INS = {
  // Current timestamp
  $now: () => new Date().toISOString(),

  // Generate UUID
  $uuid: () =>
    crypto.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }),

  // Date formatting
  $formatDate: (date, format = "yyyy-MM-dd") => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");

    return format
      .replace("yyyy", d.getFullYear())
      .replace("MM", pad(d.getMonth() + 1))
      .replace("dd", pad(d.getDate()))
      .replace("HH", pad(d.getHours()))
      .replace("mm", pad(d.getMinutes()))
      .replace("ss", pad(d.getSeconds()));
  },

  // String utilities
  $upper: (str) => String(str).toUpperCase(),
  $lower: (str) => String(str).toLowerCase(),
  $trim: (str) => String(str).trim(),
  $replace: (str, find, replace) => String(str).replace(find, replace),
  $split: (str, delimiter) => String(str).split(delimiter),
  $join: (arr, delimiter = ",") =>
    Array.isArray(arr) ? arr.join(delimiter) : String(arr),

  // Number utilities
  $round: (num, decimals = 0) => Number(Number(num).toFixed(decimals)),
  $floor: (num) => Math.floor(Number(num)),
  $ceil: (num) => Math.ceil(Number(num)),
  $abs: (num) => Math.abs(Number(num)),
  $min: (...nums) => Math.min(...nums.map(Number)),
  $max: (...nums) => Math.max(...nums.map(Number)),

  // Array utilities
  $length: (arr) => (Array.isArray(arr) ? arr.length : String(arr).length),
  $first: (arr) => (Array.isArray(arr) ? arr[0] : arr),
  $last: (arr) => (Array.isArray(arr) ? arr[arr.length - 1] : arr),
  $reverse: (arr) => (Array.isArray(arr) ? [...arr].reverse() : arr),

  // Object utilities
  $keys: (obj) =>
    typeof obj === "object" && obj !== null ? Object.keys(obj) : [],
  $values: (obj) =>
    typeof obj === "object" && obj !== null ? Object.values(obj) : [],
  $pick: (obj, ...keys) => {
    if (typeof obj !== "object" || obj === null) return {};
    return keys.reduce((acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    }, {});
  },

  // JSON utilities
  $stringify: (obj, pretty = false) =>
    JSON.stringify(obj, null, pretty ? 2 : undefined),
  $parse: (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  },

  // Conditional
  $if: (condition, trueVal, falseVal) => (condition ? trueVal : falseVal),
  $default: (val, defaultVal) => val ?? defaultVal,
  $isEmpty: (val) =>
    val === null ||
    val === undefined ||
    val === "" ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === "object" && Object.keys(val).length === 0),
};

/**
 * Parse and evaluate a single expression (SECURED - pattern blocking enabled)
 */
function evaluateExpression(expr, context = {}) {
    const trimmedExpr = expr.trim();

  // SECURITY: Block dangerous patterns before evaluation
  const dangerousPatterns = [
    /\beval\b/i, /\bFunction\b/, /\bimport\b/i, /\brequire\b/i,
    /\b__proto__\b/, /\bconstructor\b/, /\bprototype\b/,
    /\bwindow\b/i, /\bdocument\b/i, /\bfetch\b/i, /\bglobalThis\b/i,
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedExpr)) {
      console.warn(`Blocked dangerous expression: ${pattern.source}`);
      return `{{BLOCKED: unsafe pattern}}`;
    }
  }

  // Create evaluation context with built-ins and data
  const evalContext = {
    ...BUILT_INS,
    $json: context.input || {},
    $input: context.input || {},
    $index: context.index ?? 0,
    $item: context.item ?? null,
    $node: context.nodeData || {},
    $workflow: context.workflowData || {},
    ...context.variables,
  };

  try {
    // Create a safe function that evaluates the expression
    // We use Function instead of eval for slightly better isolation
    const argNames = Object.keys(evalContext);
    const argValues = Object.values(evalContext);

    // Wrap expression to return its value
    const code = `"use strict"; return (${trimmedExpr});`;

    // Create and call the function
    const fn = new Function(...argNames, code);
    return fn(...argValues);
  } catch (error) {
    // Return error indicator for debugging
    console.warn(`Expression error: ${error.message}`, { expr, context });
    return `{{ERROR: ${error.message}}}`;
  }
}

/**
 * Resolve all {{ expression }} patterns in a template string
 */
export function resolveExpressions(template, context = {}) {
  if (typeof template !== "string") {
    return template;
  }

  // Match {{ ... }} patterns (non-greedy, handles nested braces)
  const pattern = /\{\{\s*((?:[^{}]|\{[^{}]*\})*)\s*\}\}/g;

  return template.replace(pattern, (match, expression) => {
    const result = evaluateExpression(expression, context);

    // Convert result to string for template
    if (result === null || result === undefined) {
      return "";
    }
    if (typeof result === "object") {
      return JSON.stringify(result);
    }
    return String(result);
  });
}

/**
 * Resolve expressions in an object (recursive)
 */
export function resolveExpressionsInObject(obj, context = {}) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return resolveExpressions(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveExpressionsInObject(item, context));
  }

  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveExpressionsInObject(value, context);
    }
    return result;
  }

  return obj;
}

/**
 * Check if a string contains expressions
 */
export function hasExpressions(str) {
  if (typeof str !== "string") return false;
  return /\{\{.*?\}\}/.test(str);
}

/**
 * Extract all expressions from a string
 */
export function extractExpressions(str) {
  if (typeof str !== "string") return [];
  const matches = str.matchAll(/\{\{\s*((?:[^{}]|\{[^{}]*\})*)\s*\}\}/g);
  return Array.from(matches, (m) => m[1].trim());
}

/**
 * Validate an expression without evaluating it
 */
export function validateExpression(expr) {
  try {
    // Try to parse as JavaScript
    new Function(`"use strict"; return (${expr});`);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Get list of available variables/functions for autocomplete
 */
export function getAvailableVariables() {
  return [
    // Data access
    {
      name: "$json",
      description: "Input data object",
      example: "$json.fieldName",
    },
    { name: "$input", description: "Full input object", example: "$input" },
    { name: "$index", description: "Current loop index", example: "$index" },
    { name: "$item", description: "Current loop item", example: "$item" },
    { name: "$node", description: "Current node data", example: "$node.label" },

    // Built-in functions
    { name: "$now", description: "Current timestamp", example: "$now" },
    { name: "$uuid", description: "Generate UUID", example: "$uuid" },
    {
      name: "$formatDate",
      description: "Format date",
      example: '$formatDate($now, "yyyy-MM-dd")',
    },

    // String functions
    {
      name: "$upper",
      description: "Uppercase string",
      example: "$upper($json.name)",
    },
    {
      name: "$lower",
      description: "Lowercase string",
      example: "$lower($json.name)",
    },
    {
      name: "$trim",
      description: "Trim whitespace",
      example: "$trim($json.text)",
    },
    {
      name: "$replace",
      description: "Replace text",
      example: '$replace($json.text, "old", "new")',
    },
    {
      name: "$split",
      description: "Split string",
      example: '$split($json.csv, ",")',
    },
    {
      name: "$join",
      description: "Join array",
      example: '$join($json.items, ", ")',
    },

    // Number functions
    {
      name: "$round",
      description: "Round number",
      example: "$round($json.price, 2)",
    },
    {
      name: "$floor",
      description: "Floor number",
      example: "$floor($json.value)",
    },
    {
      name: "$ceil",
      description: "Ceiling number",
      example: "$ceil($json.value)",
    },
    {
      name: "$min",
      description: "Minimum value",
      example: "$min($json.a, $json.b)",
    },
    {
      name: "$max",
      description: "Maximum value",
      example: "$max($json.a, $json.b)",
    },

    // Array functions
    {
      name: "$length",
      description: "Array/string length",
      example: "$length($json.items)",
    },
    {
      name: "$first",
      description: "First array item",
      example: "$first($json.items)",
    },
    {
      name: "$last",
      description: "Last array item",
      example: "$last($json.items)",
    },

    // Object functions
    { name: "$keys", description: "Object keys", example: "$keys($json)" },
    {
      name: "$values",
      description: "Object values",
      example: "$values($json)",
    },
    {
      name: "$stringify",
      description: "JSON stringify",
      example: "$stringify($json, true)",
    },

    // Conditional
    {
      name: "$if",
      description: "Conditional value",
      example: '$if($json.active, "Yes", "No")',
    },
    {
      name: "$default",
      description: "Default value",
      example: '$default($json.name, "Unknown")',
    },
    {
      name: "$isEmpty",
      description: "Check if empty",
      example: "$isEmpty($json.items)",
    },
  ];
}

export { evaluateExpression, BUILT_INS };
