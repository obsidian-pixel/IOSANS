/**
 * Safe Expression Parser
 * Evaluates template expressions without using eval() or new Function()
 * Uses a token-based parser that only allows safe operations
 */

// Token types
const TOKEN_TYPES = {
  NUMBER: "NUMBER",
  STRING: "STRING",
  BOOLEAN: "BOOLEAN",
  NULL: "NULL",
  IDENTIFIER: "IDENTIFIER",
  OPERATOR: "OPERATOR",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  DOT: "DOT",
  COMMA: "COMMA",
  QUESTION: "QUESTION",
  COLON: "COLON",
  EOF: "EOF",
};

// Allowed operators
const OPERATORS = [
  "+",
  "-",
  "*",
  "/",
  "%",
  "===",
  "!==",
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "&&",
  "||",
  "!",
  "??",
];

// Dangerous patterns that should never be allowed
const BLOCKED_PATTERNS = [
  /\beval\b/i,
  /\bFunction\b/,
  /\bimport\b/i,
  /\brequire\b/i,
  /\b__proto__\b/,
  /\bconstructor\b/,
  /\bprototype\b/,
  /=(?!=)/, // Assignment (but not comparison)
  /\bnew\b/i,
  /\bdelete\b/i,
  /\bthis\b/,
  /\bwindow\b/i,
  /\bdocument\b/i,
  /\bglobalThis\b/i,
  /\bfetch\b/i,
  /\bXMLHttpRequest\b/i,
];

/**
 * Tokenize an expression string
 */
function tokenize(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === "." && /\d/.test(expr[i + 1]))) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i++];
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(num) });
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      let str = "";
      i++; // Skip opening quote
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === "\\" && i + 1 < expr.length) {
          i++;
          str += expr[i];
        } else {
          str += expr[i];
        }
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: TOKEN_TYPES.STRING, value: str });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let ident = "";
      while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) {
        ident += expr[i++];
      }

      // Check for boolean/null literals
      if (ident === "true") {
        tokens.push({ type: TOKEN_TYPES.BOOLEAN, value: true });
      } else if (ident === "false") {
        tokens.push({ type: TOKEN_TYPES.BOOLEAN, value: false });
      } else if (ident === "null") {
        tokens.push({ type: TOKEN_TYPES.NULL, value: null });
      } else if (ident === "undefined") {
        tokens.push({ type: TOKEN_TYPES.NULL, value: undefined });
      } else {
        tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: ident });
      }
      continue;
    }

    // Multi-character operators
    const possibleOps = [
      "===",
      "!==",
      "==",
      "!=",
      ">=",
      "<=",
      "&&",
      "||",
      "??",
    ];
    let foundOp = false;
    for (const op of possibleOps) {
      if (expr.slice(i, i + op.length) === op) {
        tokens.push({ type: TOKEN_TYPES.OPERATOR, value: op });
        i += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;

    // Single character operators and punctuation
    if ("+-*/%><".includes(char)) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: char });
      i++;
      continue;
    }

    if (char === "!") {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: "!" });
      i++;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: "(" });
      i++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ")" });
      i++;
      continue;
    }

    if (char === "[") {
      tokens.push({ type: TOKEN_TYPES.LBRACKET, value: "[" });
      i++;
      continue;
    }

    if (char === "]") {
      tokens.push({ type: TOKEN_TYPES.RBRACKET, value: "]" });
      i++;
      continue;
    }

    if (char === ".") {
      tokens.push({ type: TOKEN_TYPES.DOT, value: "." });
      i++;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: TOKEN_TYPES.COMMA, value: "," });
      i++;
      continue;
    }

    if (char === "?") {
      tokens.push({ type: TOKEN_TYPES.QUESTION, value: "?" });
      i++;
      continue;
    }

    if (char === ":") {
      tokens.push({ type: TOKEN_TYPES.COLON, value: ":" });
      i++;
      continue;
    }

    // Unknown character
    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: null });
  return tokens;
}

/**
 * Simple recursive descent parser and evaluator
 */
class SafeExpressionEvaluator {
  constructor(tokens, context) {
    this.tokens = tokens;
    this.pos = 0;
    this.context = context;
  }

  current() {
    return this.tokens[this.pos];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type) {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    return this.advance();
  }

  // Entry point
  evaluate() {
    const result = this.parseTernary();
    if (this.current().type !== TOKEN_TYPES.EOF) {
      throw new Error("Unexpected tokens after expression");
    }
    return result;
  }

  // Ternary: condition ? trueVal : falseVal
  parseTernary() {
    let condition = this.parseOr();

    if (this.current().type === TOKEN_TYPES.QUESTION) {
      this.advance(); // consume ?
      const trueVal = this.parseTernary();
      this.expect(TOKEN_TYPES.COLON);
      const falseVal = this.parseTernary();
      return condition ? trueVal : falseVal;
    }

    return condition;
  }

  // Logical OR: ||
  parseOr() {
    let left = this.parseAnd();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      this.current().value === "||"
    ) {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }

    return left;
  }

  // Logical AND: &&
  parseAnd() {
    let left = this.parseNullCoalesce();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      this.current().value === "&&"
    ) {
      this.advance();
      const right = this.parseNullCoalesce();
      left = left && right;
    }

    return left;
  }

  // Null coalescing: ??
  parseNullCoalesce() {
    let left = this.parseEquality();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      this.current().value === "??"
    ) {
      this.advance();
      const right = this.parseEquality();
      left = left ?? right;
    }

    return left;
  }

  // Equality: == != === !==
  parseEquality() {
    let left = this.parseComparison();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      ["==", "!=", "===", "!=="].includes(this.current().value)
    ) {
      const op = this.advance().value;
      const right = this.parseComparison();
      switch (op) {
        case "==":
          left = left == right;
          break;
        case "!=":
          left = left != right;
          break;
        case "===":
          left = left === right;
          break;
        case "!==":
          left = left !== right;
          break;
      }
    }

    return left;
  }

  // Comparison: > < >= <=
  parseComparison() {
    let left = this.parseAdditive();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      [">", "<", ">=", "<="].includes(this.current().value)
    ) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      switch (op) {
        case ">":
          left = left > right;
          break;
        case "<":
          left = left < right;
          break;
        case ">=":
          left = left >= right;
          break;
        case "<=":
          left = left <= right;
          break;
      }
    }

    return left;
  }

  // Additive: + -
  parseAdditive() {
    let left = this.parseMultiplicative();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      ["+", "-"].includes(this.current().value)
    ) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = op === "+" ? left + right : left - right;
    }

    return left;
  }

  // Multiplicative: * / %
  parseMultiplicative() {
    let left = this.parseUnary();

    while (
      this.current().type === TOKEN_TYPES.OPERATOR &&
      ["*", "/", "%"].includes(this.current().value)
    ) {
      const op = this.advance().value;
      const right = this.parseUnary();
      switch (op) {
        case "*":
          left = left * right;
          break;
        case "/":
          left = left / right;
          break;
        case "%":
          left = left % right;
          break;
      }
    }

    return left;
  }

  // Unary: ! -
  parseUnary() {
    if (this.current().type === TOKEN_TYPES.OPERATOR) {
      if (this.current().value === "!") {
        this.advance();
        return !this.parseUnary();
      }
      if (this.current().value === "-") {
        this.advance();
        return -this.parseUnary();
      }
    }

    return this.parsePostfix();
  }

  // Postfix: member access, function calls, array access
  parsePostfix() {
    let value = this.parsePrimary();

    while (true) {
      if (this.current().type === TOKEN_TYPES.DOT) {
        this.advance();
        const propToken = this.expect(TOKEN_TYPES.IDENTIFIER);
        const prop = propToken.value;

        // Block dangerous property access
        if (["__proto__", "constructor", "prototype"].includes(prop)) {
          throw new Error(`Access to '${prop}' is not allowed`);
        }

        if (value === null || value === undefined) {
          value = undefined;
        } else {
          value = value[prop];
        }
      } else if (this.current().type === TOKEN_TYPES.LBRACKET) {
        this.advance();
        const index = this.parseTernary();
        this.expect(TOKEN_TYPES.RBRACKET);

        if (value === null || value === undefined) {
          value = undefined;
        } else {
          value = value[index];
        }
      } else if (this.current().type === TOKEN_TYPES.LPAREN) {
        // Function call
        if (typeof value !== "function") {
          throw new Error("Cannot call non-function");
        }

        this.advance();
        const args = [];

        if (this.current().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.parseTernary());
          while (this.current().type === TOKEN_TYPES.COMMA) {
            this.advance();
            args.push(this.parseTernary());
          }
        }

        this.expect(TOKEN_TYPES.RPAREN);
        value = value(...args);
      } else {
        break;
      }
    }

    return value;
  }

  // Primary: literals, identifiers, parentheses
  parsePrimary() {
    const token = this.current();

    switch (token.type) {
      case TOKEN_TYPES.NUMBER:
      case TOKEN_TYPES.STRING:
      case TOKEN_TYPES.BOOLEAN:
        this.advance();
        return token.value;

      case TOKEN_TYPES.NULL:
        this.advance();
        return token.value;

      case TOKEN_TYPES.IDENTIFIER:
        this.advance();
        const name = token.value;

        // Look up in context
        if (name in this.context) {
          return this.context[name];
        }

        throw new Error(`Unknown identifier: ${name}`);

      case TOKEN_TYPES.LPAREN:
        this.advance();
        const result = this.parseTernary();
        this.expect(TOKEN_TYPES.RPAREN);
        return result;

      case TOKEN_TYPES.LBRACKET:
        // Array literal
        this.advance();
        const arr = [];
        if (this.current().type !== TOKEN_TYPES.RBRACKET) {
          arr.push(this.parseTernary());
          while (this.current().type === TOKEN_TYPES.COMMA) {
            this.advance();
            arr.push(this.parseTernary());
          }
        }
        this.expect(TOKEN_TYPES.RBRACKET);
        return arr;

      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }
  }
}

/**
 * Safely evaluate an expression with the given context
 * @param {string} expr - Expression to evaluate
 * @param {Object} context - Variables and functions available in expression
 * @returns {*} Result of evaluation
 */
export function safeEvaluate(expr, context = {}) {
  // Check for blocked patterns first
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(expr)) {
      throw new Error(`Unsafe expression pattern detected`);
    }
  }

  try {
    const tokens = tokenize(expr);
    const evaluator = new SafeExpressionEvaluator(tokens, context);
    return evaluator.evaluate();
  } catch (error) {
    throw new Error(`Expression error: ${error.message}`);
  }
}

/**
 * Validate an expression without evaluating it
 * @param {string} expr - Expression to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateExpression(expr) {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(expr)) {
      return { valid: false, error: "Unsafe expression pattern detected" };
    }
  }

  try {
    tokenize(expr);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export default { safeEvaluate, validateExpression };
