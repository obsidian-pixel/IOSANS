/**
 * Comprehensive Node Documentation Data
 * Detailed technical information with multiple examples for each node
 */

export const NODE_DOCS = {
  // ============================================
  // TRIGGER NODES
  // ============================================

  manualTrigger: {
    id: "manualTrigger",
    icon: "▶️",
    title: "Manual Trigger",
    category: "Triggers",
    overview: `The Manual Trigger is the starting point for on-demand workflows. When you click the Run button, this node fires first and passes its configured payload to connected nodes. It's ideal for testing, user-initiated automations, or workflows that need human activation.`,

    technicalDetails: `
**Execution Flow:**
1. User clicks Run button or presses Ctrl+Enter
2. Manual Trigger node activates and emits its payload
3. Output data flows to all connected downstream nodes
4. Execution continues through the graph

**Output Schema:**
\`\`\`javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  trigger: "manual",
  text: "Your default payload text",
  data: { ...formFieldValues }
}
\`\`\`
    `,

    config: [
      {
        name: "Label",
        type: "string",
        desc: "Display name for the node",
        default: "Manual Trigger",
      },
      {
        name: "Default Payload",
        type: "string (multiline)",
        desc: "Text content passed as 'text' field in output",
        default: "",
      },
      {
        name: "Input Fields",
        type: "Form Builder",
        desc: "Dynamic form fields for user input at runtime",
        default: "[]",
      },
    ],

    examples: [
      {
        title: "Simple Text Input",
        description: "Pass a question to an AI Agent",
        config: `Default Payload: "What are the benefits of renewable energy?"`,
        output: `{ timestamp: "...", trigger: "manual", text: "What are the benefits of renewable energy?", data: {} }`,
      },
      {
        title: "Form with Multiple Fields",
        description: "Collect structured data before processing",
        config: `Input Fields:
- name: "email" | type: "text" | label: "Email Address"
- name: "subject" | type: "text" | label: "Subject Line"  
- name: "priority" | type: "select" | options: ["low", "medium", "high"]`,
        output: `{ timestamp: "...", trigger: "manual", data: { email: "user@example.com", subject: "Hello", priority: "high" } }`,
      },
      {
        title: "JSON Payload",
        description: "Pass structured JSON data",
        config: `Default Payload:
{
  "action": "process",
  "items": ["item1", "item2"],
  "config": { "verbose": true }
}`,
        output: `{ timestamp: "...", trigger: "manual", text: '{"action":"process",...}', data: {} }`,
      },
    ],

    tips: [
      "Use Input Fields to create reusable workflows with variable parameters",
      "The 'text' field is the primary data carrier - use it for simple string inputs",
      "Form field values are accessible via input.data.fieldName in downstream nodes",
      "Combine with AI Agent to build interactive chat interfaces",
    ],

    connections: {
      inputs: 0,
      outputs: 1,
      outputLabels: ["output"],
    },
  },

  scheduleTrigger: {
    id: "scheduleTrigger",
    icon: "⏰",
    title: "Schedule Trigger",
    category: "Triggers",
    overview: `The Schedule Trigger runs workflows automatically at specified intervals using CRON expressions. Perfect for periodic tasks like data synchronization, report generation, health checks, or cleanup jobs.`,

    technicalDetails: `
**CRON Expression Format:**
\`\`\`
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
\`\`\`

**Special Characters:**
- \`*\` = any value
- \`,\` = value list (1,3,5)
- \`-\` = range (1-5)
- \`/\` = step (*/5 = every 5)

**Output Schema:**
\`\`\`javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  trigger: "schedule",
  schedule: "*/5 * * * *",
  nextRun: "2024-01-15T10:35:00.000Z"
}
\`\`\`
    `,

    config: [
      {
        name: "Schedule",
        type: "CRON expression",
        desc: "When the workflow should run",
        default: "*/5 * * * *",
      },
      {
        name: "Enabled",
        type: "boolean",
        desc: "Toggle schedule on/off without deleting",
        default: "false",
      },
    ],

    examples: [
      {
        title: "Every 5 Minutes",
        description: "Health check or monitoring",
        config: `Schedule: */5 * * * *`,
        output: `Runs at: 10:00, 10:05, 10:10, 10:15...`,
      },
      {
        title: "Daily at 9 AM",
        description: "Morning report generation",
        config: `Schedule: 0 9 * * *`,
        output: `Runs at: 09:00 every day`,
      },
      {
        title: "Every Monday at 8:30 AM",
        description: "Weekly summary email",
        config: `Schedule: 30 8 * * 1`,
        output: `Runs at: 08:30 every Monday`,
      },
      {
        title: "First Day of Month",
        description: "Monthly billing or reports",
        config: `Schedule: 0 0 1 * *`,
        output: `Runs at: midnight on the 1st of each month`,
      },
    ],

    tips: [
      "Schedules only run when the browser tab is open and active",
      "Use 'Enabled' toggle to pause schedules without deleting the configuration",
      "For more reliable scheduling, consider using browser extensions or service workers",
      "Test your CRON expression at crontab.guru before deploying",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
      inputLabels: ["re-trigger"],
      outputLabels: ["output"],
    },
  },

  webhookTrigger: {
    id: "webhookTrigger",
    icon: "🔗",
    title: "Webhook Trigger",
    category: "Triggers",
    overview: `The Webhook Trigger creates an HTTP endpoint that external services can call to start your workflow. Use it to integrate with third-party APIs, form submissions, IoT devices, or any system that can make HTTP requests.`,

    technicalDetails: `
**Endpoint URL Format:**
\`\`\`
https://your-domain.com/webhook/{endpoint}
\`\`\`

**Supported Methods:**
- GET - Retrieve data, parameters in URL
- POST - Submit data in request body (JSON)
- PUT - Update resources
- DELETE - Remove resources

**Request Body Parsing:**
\`\`\`javascript
// JSON body is automatically parsed
{
  "event": "user.created",
  "data": { "id": 123, "email": "user@example.com" }
}
\`\`\`

**Output Schema:**
\`\`\`javascript
{
  method: "POST",
  endpoint: "/webhook/my-hook",
  headers: { "content-type": "application/json", ... },
  body: { ...requestBody },
  query: { ...urlParams },
  timestamp: "..."
}
\`\`\`
    `,

    config: [
      {
        name: "Method",
        type: "select",
        desc: "HTTP method to accept",
        default: "POST",
        options: ["GET", "POST", "PUT", "DELETE"],
      },
      {
        name: "Endpoint",
        type: "string",
        desc: "URL path for the webhook",
        default: "/webhook/default",
      },
      {
        name: "Auth Required",
        type: "boolean",
        desc: "Require authentication token",
        default: "false",
      },
    ],

    examples: [
      {
        title: "Form Submission Handler",
        description: "Process contact form data",
        config: `Method: POST
Endpoint: /webhook/contact-form`,
        output: `{ method: "POST", body: { name: "John", email: "john@example.com", message: "Hello!" } }`,
      },
      {
        title: "GitHub Webhook",
        description: "Trigger on repository events",
        config: `Method: POST
Endpoint: /webhook/github`,
        output: `{ method: "POST", body: { action: "push", repository: {...}, commits: [...] } }`,
      },
      {
        title: "Stripe Payment Webhook",
        description: "Handle payment confirmations",
        config: `Method: POST
Endpoint: /webhook/stripe`,
        output: `{ method: "POST", body: { type: "payment_intent.succeeded", data: {...} } }`,
      },
    ],

    tips: [
      "Webhooks require a publicly accessible URL - use tunneling (ngrok) for local development",
      "Always validate incoming data before processing",
      "Use Auth Required for sensitive webhooks to prevent unauthorized access",
      "Connect to Code Executor to validate signatures or transform data",
    ],

    connections: {
      inputs: 0,
      outputs: 1,
      outputLabels: ["output"],
    },
  },

  errorTrigger: {
    id: "errorTrigger",
    icon: "⚠️",
    title: "Error Trigger",
    category: "Triggers",
    overview: `The Error Trigger catches exceptions from other nodes, enabling graceful error handling and recovery. Build resilient workflows that can log errors, send notifications, or retry failed operations.`,

    technicalDetails: `
**Error Capture Modes:**
1. **Watch All** - Catches errors from any node in the workflow
2. **Specific Nodes** - Only watches selected nodes by ID

**Retry Logic:**
- Automatic retry with configurable count
- Exponential backoff between attempts
- Final failure triggers error output

**Output Schema:**
\`\`\`javascript
{
  error: {
    message: "Network request failed",
    nodeId: "httpRequest-abc123",
    nodeName: "API Call",
    stack: "Error: Network request failed\\n  at..."
  },
  originalInput: { ...inputThatCausedError },
  retryAttempt: 1,
  timestamp: "..."
}
\`\`\`
    `,

    config: [
      {
        name: "Watch All",
        type: "boolean",
        desc: "Monitor all nodes for errors",
        default: "true",
      },
      {
        name: "Specific Nodes",
        type: "array",
        desc: "Node IDs to watch (when Watch All is false)",
        default: "[]",
      },
      {
        name: "Retry Enabled",
        type: "boolean",
        desc: "Automatically retry failed nodes",
        default: "false",
      },
      {
        name: "Retry Count",
        type: "number",
        desc: "Maximum retry attempts",
        default: "3",
      },
    ],

    examples: [
      {
        title: "Error Logging",
        description: "Log all errors to console",
        config: `Watch All: true
Retry Enabled: false`,
        flow: `Error Trigger → Code Executor (log error) → Output`,
      },
      {
        title: "Error Notification",
        description: "Send Slack message on failure",
        config: `Watch All: true`,
        flow: `Error Trigger → HTTP Request (Slack API) → Output`,
      },
      {
        title: "Retry with Fallback",
        description: "Retry API call, then use cached data",
        config: `Specific Nodes: ["httpRequest-main"]
Retry Enabled: true
Retry Count: 3`,
        flow: `Error Trigger → If/Else (retries exhausted?) → Local Storage (get cache)`,
      },
    ],

    tips: [
      "Place Error Trigger anywhere in your workflow - it's not connected to the main flow",
      "Use error.nodeId to identify which node failed",
      "Combine with AI Agent to generate human-readable error summaries",
      "Log errors to Local Storage for debugging across sessions",
    ],

    connections: {
      inputs: 0,
      outputs: 1,
      outputLabels: ["error"],
    },
  },

  browserEventTrigger: {
    id: "browserEventTrigger",
    icon: "🌐",
    title: "Browser Event",
    category: "Triggers",
    overview: `The Browser Event Trigger responds to browser and DOM events like focus, blur, URL changes, element clicks, or timed intervals. Automate based on user interactions or browser state changes.`,

    technicalDetails: `
**Event Types:**
| Type | Description | Use Case |
|------|-------------|----------|
| focus | Tab receives focus | Resume paused workflows |
| blur | Tab loses focus | Pause background tasks |
| urlChange | URL hash or path changes | SPA navigation |
| domClick | Element is clicked | User interaction |
| timer | Interval elapses | Polling |

**Output Schema:**
\`\`\`javascript
{
  eventType: "domClick",
  target: { selector: "#submit-btn", tagName: "BUTTON" },
  timestamp: "...",
  url: "https://example.com/page"
}
\`\`\`
    `,

    config: [
      {
        name: "Event Type",
        type: "select",
        desc: "Browser event to listen for",
        default: "focus",
        options: ["focus", "blur", "urlChange", "domClick", "timer"],
      },
      {
        name: "Selector",
        type: "CSS selector",
        desc: "Element selector for domClick events",
        default: "",
      },
      {
        name: "URL Pattern",
        type: "regex",
        desc: "Pattern to match for urlChange events",
        default: "",
      },
      {
        name: "Interval",
        type: "number (ms)",
        desc: "Milliseconds between timer events",
        default: "1000",
      },
    ],

    examples: [
      {
        title: "Auto-Save on Blur",
        description: "Save work when user leaves tab",
        config: `Event Type: blur`,
        flow: `Browser Event → Local Storage (save state)`,
      },
      {
        title: "Click Tracking",
        description: "Log button clicks",
        config: `Event Type: domClick
Selector: .track-btn`,
        flow: `Browser Event → HTTP Request (analytics API)`,
      },
      {
        title: "Polling API",
        description: "Check for updates every 30 seconds",
        config: `Event Type: timer
Interval: 30000`,
        flow: `Browser Event → HTTP Request → If/Else (new data?) → Output`,
      },
    ],

    tips: [
      "Timer events only fire when the tab is active to conserve resources",
      "Use specific CSS selectors to avoid triggering on unintended elements",
      "Combine with If/Else to filter events before processing",
      "URL patterns support regex for flexible matching",
    ],

    connections: {
      inputs: 0,
      outputs: 1,
      outputLabels: ["event"],
    },
  },

  // ============================================
  // ACTION NODES
  // ============================================

  output: {
    id: "output",
    icon: "📤",
    title: "Output",
    category: "Actions",
    overview: `The Output node is the terminal point of your workflow. It displays results, downloads files, sends notifications, and automatically saves all output as artifacts for future reference.`,

    technicalDetails: `
**Output Types:**
| Type | Behavior |
|------|----------|
| console | Logs to browser console + saves artifact |
| file | Downloads file + saves artifact |
| notification | Shows browser notification + saves artifact |

**All outputs automatically save artifacts to IndexedDB.**

**Output Schema:**
\`\`\`javascript
// The output node passes through its input
{
  ...inputData,
  _outputMeta: {
    type: "console|file|notification",
    artifactId: "uuid",
    timestamp: "..."
  }
}
\`\`\`
    `,

    config: [
      {
        name: "Output Type",
        type: "select",
        desc: "How to display/save the output",
        default: "console",
        options: ["console", "file", "notification"],
      },
      {
        name: "Filename",
        type: "string",
        desc: "Filename for file downloads",
        default: "output.txt",
      },
      {
        name: "Format JSON",
        type: "boolean",
        desc: "Pretty-print JSON with indentation",
        default: "false",
      },
    ],

    examples: [
      {
        title: "Console Logging",
        description: "Debug workflow output",
        config: `Output Type: console
Format JSON: true`,
        result: `Opens browser DevTools console with formatted output`,
      },
      {
        title: "Download Report",
        description: "Save AI-generated content to file",
        config: `Output Type: file
Filename: report_{{date}}.txt`,
        result: `Downloads file to user's Downloads folder`,
      },
      {
        title: "Desktop Notification",
        description: "Alert user when workflow completes",
        config: `Output Type: notification`,
        result: `Shows browser notification with output preview`,
      },
    ],

    tips: [
      "All outputs are saved as artifacts regardless of output type",
      "View artifacts in the Execution Panel's Artifacts tab",
      "Use Format JSON for complex object outputs",
      "Notification requires browser permission - prompt appears on first use",
    ],

    connections: {
      inputs: 1,
      outputs: 0,
    },
  },

  httpRequest: {
    id: "httpRequest",
    icon: "🌐",
    title: "HTTP Request",
    category: "Actions",
    overview: `The HTTP Request node makes REST API calls to external services. Supports all HTTP methods, custom headers, request bodies, and configurable timeouts.`,

    technicalDetails: `
**Request Configuration:**
\`\`\`javascript
{
  method: "GET|POST|PUT|PATCH|DELETE",
  url: "https://api.example.com/endpoint",
  headers: { "Authorization": "Bearer token", ... },
  body: "string or JSON object",
  timeout: 30000 // milliseconds
}
\`\`\`

**Response Schema:**
\`\`\`javascript
{
  status: 200,
  statusText: "OK",
  data: { ...responseJSON },
  headers: { "content-type": "application/json", ... }
}
\`\`\`

**Error Handling:**
- Network errors throw exceptions (catch with Error Trigger)
- 4xx/5xx responses return normally with status code
- Timeout aborts request after configured duration
    `,

    config: [
      {
        name: "Method",
        type: "select",
        desc: "HTTP method",
        default: "GET",
        options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      },
      {
        name: "URL",
        type: "string",
        desc: "Full endpoint URL (supports {{expressions}})",
        default: "",
      },
      {
        name: "Headers",
        type: "JSON",
        desc: "Request headers as JSON object",
        default: "{}",
      },
      {
        name: "Body",
        type: "string/JSON",
        desc: "Request body for POST/PUT/PATCH",
        default: "",
      },
      {
        name: "Timeout",
        type: "number",
        desc: "Timeout in milliseconds",
        default: "30000",
      },
    ],

    examples: [
      {
        title: "GET Request",
        description: "Fetch data from API",
        config: `Method: GET
URL: https://api.github.com/users/octocat
Headers: { "Accept": "application/json" }`,
        output: `{ status: 200, data: { login: "octocat", id: 583231, ... } }`,
      },
      {
        title: "POST with JSON Body",
        description: "Create a new resource",
        config: `Method: POST
URL: https://api.example.com/posts
Headers: { "Content-Type": "application/json", "Authorization": "Bearer {{input.token}}" }
Body: { "title": "{{input.title}}", "content": "{{input.content}}" }`,
        output: `{ status: 201, data: { id: 42, title: "...", created: true } }`,
      },
      {
        title: "Dynamic URL from Input",
        description: "Parameterized API call",
        config: `Method: GET
URL: https://api.example.com/users/{{input.userId}}/profile`,
        output: `Fetches profile for the user ID from previous node`,
      },
      {
        title: "Slack Webhook",
        description: "Send message to Slack channel",
        config: `Method: POST
URL: https://hooks.slack.com/services/T00/B00/XXX
Headers: { "Content-Type": "application/json" }
Body: { "text": "Workflow completed: {{input.result}}" }`,
        output: `{ status: 200, data: "ok" }`,
      },
    ],

    tips: [
      "Use {{input.field}} syntax to inject dynamic values from previous nodes",
      "Set appropriate Content-Type header for POST/PUT requests",
      "Handle API rate limits with retry logic via Error Trigger",
      "CORS restrictions apply - use a proxy for cross-origin requests if needed",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  codeExecutor: {
    id: "codeExecutor",
    icon: "💻",
    title: "Code Executor",
    category: "Actions",
    overview: `The Code Executor runs custom JavaScript code with full access to input data. Transform data, implement complex logic, call APIs, or generate dynamic content. Your code runs in a sandboxed environment with async/await support.`,

    technicalDetails: `
**Execution Context:**
\`\`\`javascript
// Available variables:
input    // Data from previous node
context  // Execution context with nodeId, addLog()

// Your code is wrapped in async IIFE:
(async () => {
  // Your code here
  return result;
})();
\`\`\`

**Return Value:**
- Use \`return\` to pass data to next node
- Returned value becomes \`output\` for downstream nodes
- Objects, arrays, strings, numbers all supported

**Available APIs:**
- fetch() for HTTP requests
- console.log() for debugging
- JSON, Math, Date, Array methods
- async/await for promises
    `,

    config: [
      {
        name: "Code",
        type: "JavaScript",
        desc: "Your JavaScript code to execute",
        default:
          "// Access input data via 'input'\n// Return output data\nreturn input;",
      },
    ],

    examples: [
      {
        title: "Data Transformation",
        description: "Transform array of objects",
        code: `// Extract specific fields
const users = input.data || [];
return users.map(user => ({
  id: user.id,
  name: user.name.toUpperCase(),
  email: user.email.toLowerCase()
}));`,
      },
      {
        title: "Filtering",
        description: "Filter array by condition",
        code: `// Keep only active items
const items = input.items || [];
return items.filter(item => 
  item.status === 'active' && 
  item.score > 50
);`,
      },
      {
        title: "API Call with Processing",
        description: "Fetch and transform external data",
        code: `// Fetch additional data
const userId = input.userId;
const response = await fetch(
  \`https://api.example.com/users/\${userId}\`
);
const user = await response.json();

// Combine with input
return {
  ...input,
  userDetails: user,
  fetchedAt: new Date().toISOString()
};`,
      },
      {
        title: "Generate Dynamic Content",
        description: "Create content based on input",
        code: `// Build email template
const { name, items, total } = input;

const itemList = items
  .map(i => \`- \${i.name}: $\${i.price}\`)
  .join('\\n');

return {
  subject: \`Order Confirmation for \${name}\`,
  body: \`Dear \${name},

Thank you for your order!

Items:
\${itemList}

Total: $\${total}

Best regards,
The Team\`
};`,
      },
      {
        title: "Error Handling",
        description: "Graceful error handling",
        code: `try {
  const result = await riskyOperation(input);
  return { success: true, data: result };
} catch (error) {
  return { 
    success: false, 
    error: error.message,
    fallback: input.defaultValue 
  };
}`,
      },
    ],

    tips: [
      "Use console.log() for debugging - output appears in browser DevTools",
      "Always handle potential null/undefined with optional chaining (?.) or defaults",
      "Async operations are fully supported with async/await",
      "Complex logic is better here than chaining multiple Set Variable nodes",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  setVariable: {
    id: "setVariable",
    icon: "📝",
    title: "Set Variable",
    category: "Actions",
    overview: `The Set Variable node creates, transforms, or merges data into named variables. Use it to prepare data for downstream nodes, rename fields, or combine multiple data sources.`,

    technicalDetails: `
**Modes:**
| Mode | Behavior |
|------|----------|
| set | Replaces value entirely |
| append | Adds to existing array |
| merge | Shallow merge with existing object |

**Template Expressions:**
\`\`\`
{{input.field}}           - Access input field
{{input.data.nested}}     - Nested access
{{input.items[0].name}}   - Array indexing
\`\`\`

**Output Schema:**
\`\`\`javascript
{
  ...input,
  [variableName]: value
}
\`\`\`
    `,

    config: [
      {
        name: "Variable Name",
        type: "string",
        desc: "Name of the variable to create/update",
        default: "data",
      },
      {
        name: "Value",
        type: "string",
        desc: "Value or expression (supports {{templates}})",
        default: "",
      },
      {
        name: "Mode",
        type: "select",
        desc: "How to set the value",
        default: "set",
        options: ["set", "append", "merge"],
      },
    ],

    examples: [
      {
        title: "Extract Field",
        description: "Pull out specific data",
        config: `Variable Name: email
Value: {{input.user.email}}
Mode: set`,
        output: `{ ...input, email: "user@example.com" }`,
      },
      {
        title: "Build Array",
        description: "Accumulate items from loop",
        config: `Variable Name: results
Value: {{input.currentItem}}
Mode: append`,
        output: `{ ...input, results: [...existing, currentItem] }`,
      },
      {
        title: "Merge Objects",
        description: "Combine data sources",
        config: `Variable Name: combined
Value: { "timestamp": "{{now}}", "source": "workflow" }
Mode: merge`,
        output: `{ ...input, combined: { ...existing, timestamp: "...", source: "workflow" } }`,
      },
    ],

    tips: [
      "Use Set Variable for simple transformations; Code Executor for complex logic",
      "Variable names become keys in the output object",
      "Template expressions are resolved from the input data",
      "Append mode is useful for collecting results in loops",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  fileSystem: {
    id: "fileSystem",
    icon: "📁",
    title: "File System",
    category: "Actions",
    overview: `The File System node reads from and writes to local files using the File System Access API. Process local documents, save generated content, or build file-based workflows.`,

    technicalDetails: `
**Read Mode:**
- Opens file picker dialog
- Returns file contents as text or base64
- Supports filtering by file extension

**Write Mode:**
- Opens save dialog
- Writes string content to selected file
- Creates new file or overwrites existing

**Output Schema (Read):**
\`\`\`javascript
{
  filename: "document.txt",
  size: 1024,
  type: "text/plain",
  content: "File contents here...",
  lastModified: 1697234567890
}
\`\`\`
    `,

    config: [
      {
        name: "Mode",
        type: "select",
        desc: "Read or write operation",
        default: "read",
        options: ["read", "write"],
      },
      {
        name: "Filename",
        type: "string",
        desc: "Default filename for write operations",
        default: "",
      },
      {
        name: "File Types",
        type: "array",
        desc: "Accepted extensions for read (e.g., ['.txt', '.json'])",
        default: "[]",
      },
    ],

    examples: [
      {
        title: "Read Text File",
        description: "Load document for processing",
        config: `Mode: read
File Types: [".txt", ".md"]`,
        output: `{ filename: "notes.txt", content: "Document content..." }`,
      },
      {
        title: "Save AI Output",
        description: "Write generated content to file",
        config: `Mode: write
Filename: generated_{{date}}.txt`,
        flow: `AI Agent → File System (write)`,
      },
      {
        title: "Process JSON File",
        description: "Load and parse JSON data",
        config: `Mode: read
File Types: [".json"]`,
        flow: `File System (read) → Code Executor (parse JSON) → Output`,
      },
    ],

    tips: [
      "File System Access API requires user permission for each file",
      "Works best in Chrome and Edge browsers",
      "Combine with AI Agent to analyze document contents",
      "Use Code Executor to parse JSON or CSV file contents",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  localStorage: {
    id: "localStorage",
    icon: "💾",
    title: "Local Storage",
    category: "Actions",
    overview: `The Local Storage node persists data between workflow runs using IndexedDB or localStorage. Store configuration, cache API responses, or maintain state across sessions.`,

    technicalDetails: `
**Storage Types:**
| Type | Capacity | Best For |
|------|----------|----------|
| localStorage | ~5MB | Simple key-value pairs |
| indexedDB | ~50MB+ | Complex objects, large data |

**Operations:**
| Mode | Behavior |
|------|----------|
| get | Retrieve value by key |
| set | Store value at key |
| delete | Remove key and value |

**Output Schema:**
\`\`\`javascript
// Get mode
{ key: "myData", value: { ...storedData }, found: true }

// Set mode  
{ key: "myData", success: true }

// Delete mode
{ key: "myData", deleted: true }
\`\`\`
    `,

    config: [
      {
        name: "Mode",
        type: "select",
        desc: "Operation to perform",
        default: "get",
        options: ["get", "set", "delete"],
      },
      {
        name: "Storage Type",
        type: "select",
        desc: "Which storage to use",
        default: "indexedDB",
        options: ["indexedDB", "localStorage"],
      },
      { name: "Key", type: "string", desc: "Storage key name", default: "" },
    ],

    examples: [
      {
        title: "Cache API Response",
        description: "Store data to avoid repeated API calls",
        config: `Mode: set
Storage Type: indexedDB
Key: api_cache_{{input.endpoint}}`,
        flow: `HTTP Request → Local Storage (set)`,
      },
      {
        title: "Load Cached Data",
        description: "Retrieve previously stored data",
        config: `Mode: get
Storage Type: indexedDB
Key: api_cache`,
        output: `{ key: "api_cache", value: {...cachedData}, found: true }`,
      },
      {
        title: "Clear Cache",
        description: "Remove stored data",
        config: `Mode: delete
Storage Type: indexedDB
Key: api_cache`,
        output: `{ key: "api_cache", deleted: true }`,
      },
    ],

    tips: [
      "Use indexedDB for complex objects and larger datasets",
      "localStorage is simpler but limited to 5MB",
      "Keys can include template expressions for dynamic storage",
      "Combine with If/Else to check if cache exists before fetching",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  // ============================================
  // LOGIC NODES
  // ============================================

  ifElse: {
    id: "ifElse",
    icon: "🔀",
    title: "If/Else",
    category: "Logic",
    overview: `The If/Else node creates conditional branches in your workflow. Route data to different paths based on comparisons, creating dynamic decision trees.`,

    technicalDetails: `
**Operators:**
| Operator | Description | Example |
|----------|-------------|---------|
| equals | Exact match (==) | status equals "success" |
| notEquals | Not match (!=) | status notEquals "error" |
| contains | String includes | message contains "error" |
| greaterThan | Numeric > | count greaterThan 10 |
| lessThan | Numeric < | count lessThan 5 |
| exists | Not null/undefined | user.email exists |

**Output Routing:**
- Output 0 (top): Condition is TRUE
- Output 1 (bottom): Condition is FALSE

**Condition Path:**
Access nested values with dot notation:
\`\`\`
user.profile.settings.notifications
data.items[0].status
response.headers.content-type
\`\`\`
    `,

    config: [
      {
        name: "Condition",
        type: "string",
        desc: "Field path to evaluate (e.g., status, data.count)",
        default: "",
      },
      {
        name: "Operator",
        type: "select",
        desc: "Comparison operator",
        default: "equals",
        options: [
          "equals",
          "notEquals",
          "contains",
          "greaterThan",
          "lessThan",
          "exists",
        ],
      },
      {
        name: "Compare Value",
        type: "string",
        desc: "Value to compare against",
        default: "",
      },
    ],

    examples: [
      {
        title: "Check API Status",
        description: "Branch on response status",
        config: `Condition: status
Operator: equals
Compare Value: 200`,
        routing: `TRUE → Process data | FALSE → Error handling`,
      },
      {
        title: "Validate Data Exists",
        description: "Check if field is present",
        config: `Condition: user.email
Operator: exists`,
        routing: `TRUE → Send email | FALSE → Request email`,
      },
      {
        title: "Numeric Threshold",
        description: "Check if value exceeds limit",
        config: `Condition: items.length
Operator: greaterThan
Compare Value: 100`,
        routing: `TRUE → Paginate | FALSE → Process all`,
      },
      {
        title: "String Contains",
        description: "Search for keyword",
        config: `Condition: message
Operator: contains
Compare Value: error`,
        routing: `TRUE → Log error | FALSE → Continue`,
      },
    ],

    tips: [
      "Use dot notation to access deeply nested properties",
      "The 'exists' operator checks for null, undefined, and empty strings",
      "Numeric comparisons convert strings to numbers automatically",
      "Chain multiple If/Else nodes for complex decision trees",
    ],

    connections: {
      inputs: 1,
      outputs: 2,
      outputLabels: ["true ✓", "false ✗"],
    },
  },

  loop: {
    id: "loop",
    icon: "🔄",
    title: "Loop",
    category: "Logic",
    overview: `The Loop node repeats workflow sections multiple times. Use count-based iteration (repeat N times) or array-based iteration (process each item). Essential for batch processing and automated repetition.`,

    technicalDetails: `
**Loop Modes:**
1. **Count-Based**: Repeat N times with iteration counter
2. **Array-Based**: Iterate over items in an array

**Two Outputs:**
| Output | Name | Purpose |
|--------|------|---------|
| 0 (top) | loop → | Fires for each iteration, connect back to repeat |
| 1 (bottom) | done ✓ | Fires when all iterations complete |

**Creating the Loop:**
Connect "loop →" output BACK to the node you want to repeat.
This creates a cycle that executes for each iteration.

**Iteration Data:**
\`\`\`javascript
{
  iteration: 1,          // Current iteration (1-indexed)
  totalIterations: 5,    // Total configured iterations
  previousResult: {...}, // Output from last iteration
  isLoopIteration: true
}
\`\`\`

**Completion Data:**
\`\`\`javascript
{
  results: [...],        // Array of all iteration results
  totalIterations: 5,
  lastResult: {...},     // Final iteration output
  completed: true
}
\`\`\`
    `,

    config: [
      {
        name: "Iterations",
        type: "number",
        desc: "Number of times to repeat (1-1000)",
        default: "1",
      },
      {
        name: "Items Path",
        type: "string",
        desc: "Path to array for item-based looping",
        default: "items",
      },
      {
        name: "Max Items",
        type: "number",
        desc: "Maximum items to process per iteration",
        default: "100",
      },
    ],

    examples: [
      {
        title: "Generate 5 Stories",
        description: "AI generates multiple unique stories",
        config: `Iterations: 5`,
        flow: `Manual Trigger → AI Agent (generate story) → Loop → Output
                                    ↑                          |
                                    └──────── loop → ──────────┘`,
      },
      {
        title: "Process Array Items",
        description: "Handle each item in a list",
        config: `Iterations: 1
Items Path: data.users`,
        flow: `HTTP Request → Loop → Process User → Loop → Output`,
      },
      {
        title: "Infinite Automation",
        description: "Continuous content generation",
        config: `Iterations: 100
(Set high for long-running...)`,
        flow: `Trigger → AI Agent → Loop → Output
                           ↑           |
                           └── loop → ─┘`,
      },
      {
        title: "Batch API Calls",
        description: "Call API for each item",
        config: `Iterations: 10`,
        flow: `For each ID: Trigger → Set Variable → HTTP Request → Loop → Output`,
      },
    ],

    tips: [
      "Always connect the 'loop →' output back to create the actual loop",
      "Use 'done ✓' output for final processing after all iterations",
      "Access current iteration via input.iteration in downstream nodes",
      "Set reasonable iteration limits to prevent runaway loops",
    ],

    connections: {
      inputs: 1,
      outputs: 2,
      outputLabels: ["loop →", "done ✓"],
    },
  },

  switchNode: {
    id: "switchNode",
    icon: "🔃",
    title: "Switch",
    category: "Logic",
    overview: `The Switch node routes data to different outputs based on field values. Like a multi-way If/Else, it supports up to 4 output paths plus a default.`,

    technicalDetails: `
**Route Configuration:**
\`\`\`javascript
routes: [
  { value: "urgent", outputIndex: 0 },
  { value: "normal", outputIndex: 1 },
  { value: "low", outputIndex: 2 }
]
\`\`\`

**Outputs:**
- Outputs 0-2: Matched routes
- Output 3: Default (when no match)

**Matching:**
- Exact string match (case-sensitive)
- First matching route wins
- Unmatched values go to defaultOutput
    `,

    config: [
      {
        name: "Field",
        type: "string",
        desc: "Field path to switch on",
        default: "",
      },
      {
        name: "Routes",
        type: "array",
        desc: "Value-to-output mappings",
        default: "[{value:'', outputIndex:0}]",
      },
      {
        name: "Default Output",
        type: "number",
        desc: "Output index when no match (0-3)",
        default: "3",
      },
    ],

    examples: [
      {
        title: "Priority Routing",
        description: "Route tasks by priority level",
        config: `Field: priority
Routes:
  - value: "urgent" → Output 0
  - value: "normal" → Output 1
  - value: "low" → Output 2
Default Output: 3`,
        routing: `urgent → Immediate | normal → Queue | low → Archive | unknown → Review`,
      },
      {
        title: "Content Type Handler",
        description: "Process different data types",
        config: `Field: type
Routes:
  - value: "text" → Output 0
  - value: "image" → Output 1
  - value: "video" → Output 2`,
        routing: `text → Text processor | image → Image handler | video → Video handler`,
      },
    ],

    tips: [
      "Use for multiple discrete values; If/Else for binary conditions",
      "Default output catches unexpected values - always handle it",
      "Combine with Merge node to rejoin paths after processing",
      "Route values are case-sensitive",
    ],

    connections: {
      inputs: 1,
      outputs: 4,
      outputLabels: ["0", "1", "2", "default"],
    },
  },

  merge: {
    id: "merge",
    icon: "🔗",
    title: "Merge",
    category: "Logic",
    overview: `The Merge node combines multiple workflow branches back into a single path. Wait for all inputs to arrive or take the first one that completes.`,

    technicalDetails: `
**Modes:**
| Mode | Behavior |
|------|----------|
| wait | Waits for ALL inputs before proceeding |
| first | Proceeds with FIRST input to arrive |

**Output (wait mode):**
\`\`\`javascript
{
  inputs: [
    { source: 0, data: {...} },
    { source: 1, data: {...} }
  ],
  merged: { ...combinedData }
}
\`\`\`

**Output (first mode):**
\`\`\`javascript
{
  source: 0,  // Which input arrived first
  data: {...} // Data from that input
}
\`\`\`
    `,

    config: [
      {
        name: "Mode",
        type: "select",
        desc: "How to handle multiple inputs",
        default: "wait",
        options: ["wait", "first"],
      },
    ],

    examples: [
      {
        title: "Combine API Responses",
        description: "Fetch from multiple APIs and merge",
        config: `Mode: wait`,
        flow: `→ HTTP (API 1) ──┐
Trigger                    ├→ Merge → Process
       → HTTP (API 2) ──┘`,
      },
      {
        title: "Race Condition",
        description: "Use fastest response",
        config: `Mode: first`,
        flow: `→ HTTP (Primary) ──┐
Trigger                       ├→ Merge → Use result
       → HTTP (Backup) ────┘`,
      },
      {
        title: "Rejoin After Branch",
        description: "Merge If/Else branches",
        config: `Mode: wait`,
        flow: `If/Else → True path  ──┐
              → False path ──┴→ Merge → Continue`,
      },
    ],

    tips: [
      "Use 'wait' mode when you need data from all branches",
      "Use 'first' mode for redundancy or timeout scenarios",
      "Merge has 2 inputs - connect both to activate",
      "Data from both inputs is available in the merged output",
    ],

    connections: {
      inputs: 2,
      outputs: 1,
    },
  },

  // ============================================
  // AI NODES
  // ============================================

  aiAgent: {
    id: "aiAgent",
    icon: "🤖",
    title: "AI Agent",
    category: "AI",
    overview: `The AI Agent is the brain of your automation. It generates text using WebLLM, a local LLM inference engine that runs entirely in your browser via WebGPU. No data ever leaves your device.`,

    technicalDetails: `
**Execution Flow:**
1. User/System message templates are resolved with input data
2. Messages sent to local WebLLM model
3. Model generates response token by token
4. Response passed to downstream nodes

**Template Syntax:**
\`\`\`
{{input}}              - Full input object as JSON
{{input.text}}         - Specific field
{{input.data.items}}   - Nested access
\`\`\`

**Output Schema:**
\`\`\`javascript
{
  response: "AI-generated text...",
  model: "gemma-2-2b-it",
  tokens: 245,
  duration: 3.2
}
\`\`\`

**Available Models:**
| Model | Size | Best For |
|-------|------|----------|
| Gemma 2 2B | 1.4GB | Balanced quality/speed |
| Phi-3.5 Mini | 2.2GB | Reasoning tasks |
| Llama 3.2 3B | 1.8GB | General purpose |
| Qwen 2.5 1.5B | 1.0GB | Fast responses |
| SmolLM 1.7B | 1.1GB | Minimal resources |
    `,

    config: [
      {
        name: "System Prompt",
        type: "text (multiline)",
        desc: "Instructions for AI behavior/persona",
        default: "",
      },
      {
        name: "User Message",
        type: "text (multiline)",
        desc: "Template for user input (supports {{templates}})",
        default: "{{input.text}}",
      },
      {
        name: "Temperature",
        type: "slider (0-1)",
        desc: "Creativity level. Low=factual, High=creative",
        default: "0.7",
      },
      {
        name: "Max Tokens",
        type: "number",
        desc: "Maximum response length in tokens",
        default: "2000",
      },
    ],

    examples: [
      {
        title: "Story Generator",
        description: "Create unique stories from prompts",
        config: `System Prompt: You are a creative fiction writer. Write engaging short stories with vivid descriptions and compelling characters.

User Message: Write a 300-word story about: {{input.text}}

Temperature: 0.9
Max Tokens: 1000`,
      },
      {
        title: "Data Analyzer",
        description: "Analyze and summarize data",
        config: `System Prompt: You are a data analyst. Analyze the provided data and give clear, actionable insights.

User Message: Analyze this data and provide key insights:
{{input.data}}

Temperature: 0.3
Max Tokens: 500`,
      },
      {
        title: "Code Assistant",
        description: "Generate or explain code",
        config: `System Prompt: You are an expert programmer. Write clean, well-documented code. Explain your approach.

User Message: {{input.request}}

Language: {{input.language}}

Temperature: 0.4
Max Tokens: 1500`,
      },
      {
        title: "Email Composer",
        description: "Draft professional emails",
        config: `System Prompt: You are a professional communication expert. Write clear, concise, and polite emails.

User Message: Write an email about: {{input.subject}}
Tone: {{input.tone}}
Key points: {{input.points}}

Temperature: 0.6
Max Tokens: 400`,
      },
    ],

    tips: [
      "Use lower temperature (0.2-0.4) for factual/analytical tasks",
      "Use higher temperature (0.7-0.9) for creative content",
      "Include clear instructions in the system prompt for consistent results",
      "Connect as a tool to other AI Agents for multi-agent workflows",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  vectorMemory: {
    id: "vectorMemory",
    icon: "🧠",
    title: "Vector Memory",
    category: "AI",
    overview: `Vector Memory stores and retrieves information using semantic similarity. It converts text into embeddings (vector representations) and finds the most relevant matches. Essential for RAG (Retrieval Augmented Generation) workflows.`,

    technicalDetails: `
**Operations:**
| Mode | Purpose |
|------|---------|
| query | Find similar content by meaning |
| upsert | Add or update memory entries |
| delete | Remove specific entries |

**Embedding Process:**
1. Text is converted to vector embeddings
2. Vectors are stored in local IndexedDB
3. Queries find closest vectors by cosine similarity

**Query Output:**
\`\`\`javascript
{
  results: [
    { id: "mem_123", text: "...", score: 0.92, metadata: {...} },
    { id: "mem_456", text: "...", score: 0.85, metadata: {...} }
  ],
  query: "original query text",
  namespace: "default"
}
\`\`\`

**Upsert Output:**
\`\`\`javascript
{
  id: "mem_789",
  success: true,
  namespace: "default"
}
\`\`\`
    `,

    config: [
      {
        name: "Mode",
        type: "select",
        desc: "Operation to perform",
        default: "query",
        options: ["query", "upsert", "delete"],
      },
      {
        name: "Namespace",
        type: "string",
        desc: "Memory isolation (like folders)",
        default: "default",
      },
      {
        name: "Top K",
        type: "number",
        desc: "Number of results to return",
        default: "5",
      },
      {
        name: "Min Score",
        type: "number (0-1)",
        desc: "Minimum similarity threshold",
        default: "0.3",
      },
    ],

    examples: [
      {
        title: "Build Knowledge Base",
        description: "Store documents for later retrieval",
        config: `Mode: upsert
Namespace: knowledge`,
        flow: `File System (read) → Code (split into chunks) → Loop → Vector Memory (upsert)`,
      },
      {
        title: "RAG Query",
        description: "Find relevant context for AI",
        config: `Mode: query
Namespace: knowledge
Top K: 3
Min Score: 0.5`,
        flow: `Manual Trigger → Vector Memory (query) → AI Agent (answer with context)`,
      },
      {
        title: "Conversation Memory",
        description: "Remember past conversations",
        config: `Mode: upsert
Namespace: conversations`,
        flow: `After AI response → Vector Memory (upsert) // stores each exchange`,
      },
    ],

    tips: [
      "Use namespaces to separate different knowledge bases",
      "Higher Min Score returns fewer but more relevant results",
      "Chunk large documents into paragraphs for better retrieval",
      "Combine with AI Agent for powerful RAG workflows",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  waitForApproval: {
    id: "waitForApproval",
    icon: "✋",
    title: "Wait for Approval",
    category: "AI",
    overview: `The Wait for Approval node pauses workflow execution until a human approves or rejects. Essential for human-in-the-loop automation where critical actions need oversight.`,

    technicalDetails: `
**Workflow Pause:**
1. Execution reaches this node and stops
2. Approval dialog appears to user
3. User reviews data and clicks Approve/Reject
4. Execution continues on appropriate output

**Two Outputs:**
- Output 0 (top): User clicked Approve ✓
- Output 1 (bottom): User clicked Reject ✗

**Approval Data:**
\`\`\`javascript
// Passed to approved/rejected branch
{
  approved: true,
  approvedBy: "user",
  approvedAt: "2024-01-15T10:30:00.000Z",
  originalInput: {...},
  notes: "User comment if any"
}
\`\`\`
    `,

    config: [
      {
        name: "Title",
        type: "string",
        desc: "Dialog header",
        default: "Approval Required",
      },
      {
        name: "Message",
        type: "text (multiline)",
        desc: "Description for reviewer (supports {{templates}})",
        default: "",
      },
      {
        name: "Timeout",
        type: "number (seconds)",
        desc: "Auto-reject after N seconds (0=never)",
        default: "0",
      },
      {
        name: "Notify Browser",
        type: "boolean",
        desc: "Show browser notification",
        default: "true",
      },
    ],

    examples: [
      {
        title: "Review AI Output",
        description: "Approve before publishing",
        config: `Title: Review Generated Content
Message: Please review this AI-generated content before publishing:

{{input.content}}

Timeout: 0
Notify Browser: true`,
        flow: `AI Agent → Wait for Approval → (Approved) HTTP Post || (Rejected) Log`,
      },
      {
        title: "Confirm API Action",
        description: "Approve before destructive operation",
        config: `Title: Confirm Delete
Message: About to delete {{input.count}} records. Are you sure?

Timeout: 300
Notify Browser: true`,
        flow: `Process Data → Wait for Approval → (Approved) HTTP DELETE || (Rejected) Cancel`,
      },
      {
        title: "Review Email",
        description: "Approve before sending",
        config: `Title: Review Email
Message: To: {{input.recipient}}
Subject: {{input.subject}}

{{input.body}}`,
        flow: `AI Compose → Wait for Approval → (Approved) Send Email`,
      },
    ],

    tips: [
      "Use before any irreversible actions (deletions, sends, purchases)",
      "Set a timeout for time-sensitive workflows",
      "Browser notification helps if you switch tabs",
      "Include key details in the message for informed decisions",
    ],

    connections: {
      inputs: 1,
      outputs: 2,
      outputLabels: ["approved ✓", "rejected ✗"],
    },
  },

  subWorkflow: {
    id: "subWorkflow",
    icon: "🔀",
    title: "Sub-Workflow",
    category: "AI",
    overview: `The Sub-Workflow node executes another saved workflow as a subroutine. Build modular, reusable automation by composing complex workflows from simpler building blocks.`,

    technicalDetails: `
**Execution:**
1. Current workflow pauses
2. Selected sub-workflow executes with input
3. Sub-workflow output becomes this node's output
4. Parent workflow continues

**Input Passing:**
- If "Pass Input" enabled: full input passed to sub-workflow
- Sub-workflow receives data at its trigger node

**Output:**
\`\`\`javascript
{
  subWorkflowId: "wf_abc123",
  subWorkflowName: "Process Data",
  result: { ...subWorkflowOutput },
  duration: 1.5
}
\`\`\`
    `,

    config: [
      {
        name: "Workflow",
        type: "select",
        desc: "Saved workflow to execute",
        default: "",
      },
      {
        name: "Pass Input",
        type: "boolean",
        desc: "Send current input to sub-workflow",
        default: "true",
      },
      {
        name: "Async",
        type: "boolean",
        desc: "Don't wait for completion (fire and forget)",
        default: "false",
      },
    ],

    examples: [
      {
        title: "Reusable Data Processor",
        description: "Call shared processing logic",
        config: `Workflow: "Data Sanitizer"
Pass Input: true
Async: false`,
        flow: `API Response → Sub-Workflow (sanitize) → Use Clean Data`,
      },
      {
        title: "Parallel Sub-Workflows",
        description: "Run multiple workflows simultaneously",
        config: `Async: true`,
        flow: `Trigger → Sub-Workflow A (async)
              → Sub-Workflow B (async)  
              → Merge results`,
      },
    ],

    tips: [
      "Build a library of reusable workflows for common tasks",
      "Use async mode when you don't need the result immediately",
      "Sub-workflows can call other sub-workflows (nested)",
      "Great for team collaboration - share common workflows",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  textToSpeech: {
    id: "textToSpeech",
    icon: "🔊",
    title: "Text to Speech",
    category: "AI",
    overview: `The Text to Speech node converts text into spoken audio using the Web Speech API. Add voice output to your workflows for accessibility, notifications, or interactive experiences.`,

    technicalDetails: `
**Web Speech API:**
- Uses browser's built-in speech synthesis
- No external API calls or costs
- Access to system voices

**Voice Selection:**
Browser provides various voices based on OS:
- Windows: Microsoft voices
- macOS: System voices  
- Chrome: Additional Google voices

**Output:**
\`\`\`javascript
{
  spoken: true,
  text: "The spoken text...",
  voice: "Microsoft Zira",
  duration: 3.5
}
\`\`\`
    `,

    config: [
      {
        name: "Voice",
        type: "select",
        desc: "Voice to use for speech",
        default: "default",
      },
      {
        name: "Rate",
        type: "slider (0.5-2)",
        desc: "Speech speed",
        default: "1.0",
      },
      {
        name: "Pitch",
        type: "slider (0.5-2)",
        desc: "Voice pitch",
        default: "1.0",
      },
      {
        name: "Auto Play",
        type: "boolean",
        desc: "Play immediately when triggered",
        default: "true",
      },
    ],

    examples: [
      {
        title: "Read AI Response",
        description: "Speak AI-generated content",
        config: `Voice: default
Rate: 1.0
Auto Play: true`,
        flow: `AI Agent → Text to Speech`,
      },
      {
        title: "Notification Alert",
        description: "Voice notification for events",
        config: `Rate: 1.2
Voice: (select clear voice)`,
        flow: `HTTP Request → If/Else (important?) → Text to Speech ("Alert: {{message}}")`,
      },
    ],

    tips: [
      "Available voices vary by browser and operating system",
      "Higher rate (1.2-1.5) is good for notifications",
      "Use clear, punctuated text for better pronunciation",
      "Combine with AI Agent for voice assistant experiences",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  imageGeneration: {
    id: "imageGeneration",
    icon: "🎨",
    title: "Image Generation",
    category: "AI",
    overview: `The Image Generation node creates images from text prompts using AI models. Generate visuals for content, social media, presentations, or creative projects.`,

    technicalDetails: `
**Providers:**
| Provider | Location | Notes |
|----------|----------|-------|
| local (WebSD) | Browser | Requires powerful GPU |
| openai | API | Requires API key |
| stability | API | Requires API key |

**Output:**
\`\`\`javascript
{
  imageUrl: "blob:..." or "data:image/png;base64,...",
  artifactId: "art_123",
  prompt: "original prompt",
  size: "512x512",
  provider: "local"
}
\`\`\`
    `,

    config: [
      {
        name: "Provider",
        type: "select",
        desc: "Image generation service",
        default: "local",
        options: ["local", "openai", "stability"],
      },
      {
        name: "Size",
        type: "select",
        desc: "Image dimensions",
        default: "512x512",
        options: ["256x256", "512x512", "1024x1024"],
      },
      {
        name: "Negative Prompt",
        type: "text",
        desc: "What to avoid in the image",
        default: "",
      },
      {
        name: "Seed",
        type: "number",
        desc: "Random seed for reproducibility",
        default: "",
      },
      {
        name: "Steps",
        type: "number",
        desc: "Diffusion steps (quality vs speed)",
        default: "20",
      },
    ],

    examples: [
      {
        title: "Blog Illustration",
        description: "Generate images for articles",
        config: `Provider: openai
Size: 1024x1024`,
        flow: `AI Agent (write article) → AI Agent (describe image) → Image Generation`,
      },
      {
        title: "Product Mockup",
        description: "Create product visualizations",
        config: `Provider: stability
Negative Prompt: blurry, low quality`,
        flow: `Manual Trigger → Image Generation → Output`,
      },
    ],

    tips: [
      "Local generation requires WebGPU and significant GPU resources",
      "API providers have costs - check pricing",
      "Use negative prompts to avoid common issues (blurry, low quality)",
      "Set a seed for reproducible results",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },

  pythonExecutor: {
    id: "pythonExecutor",
    icon: "🐍",
    title: "Python Executor",
    category: "AI",
    overview: `The Python Executor runs Python code directly in your browser using Pyodide. Access Python's scientific computing ecosystem including NumPy, Pandas, and more—all without a server.`,

    technicalDetails: `
**Pyodide Runtime:**
- Full Python 3.11 interpreter in WebAssembly
- Runs entirely in the browser
- Access to many pure-Python packages

**Available Packages:**
- numpy, pandas, scipy
- matplotlib, pillow
- requests (limited), json
- And many more

**Variable Access:**
\`\`\`python
# Input is available as 'input' variable
data = input  # Dict from previous node

# Set result for output
result = {"processed": True, "data": data}
\`\`\`

**Output:**
\`\`\`javascript
{
  result: { ...pythonResult },
  stdout: "Any print() output",
  duration: 1.2
}
\`\`\`
    `,

    config: [
      {
        name: "Code",
        type: "Python",
        desc: "Python code to execute",
        default: "# Access input via 'input' variable\\nresult = input",
      },
      {
        name: "Packages",
        type: "array",
        desc: "Additional packages to install",
        default: "[]",
      },
      {
        name: "Timeout",
        type: "number (ms)",
        desc: "Execution timeout",
        default: "30000",
      },
    ],

    examples: [
      {
        title: "Data Analysis",
        description: "Analyze data with Pandas",
        code: `import pandas as pd
import json

# Parse input data
data = input.get('data', [])
df = pd.DataFrame(data)

# Analyze
result = {
    'count': len(df),
    'columns': list(df.columns),
    'summary': df.describe().to_dict()
}`,
      },
      {
        title: "Statistical Calculation",
        description: "Complex math with NumPy",
        code: `import numpy as np

values = input.get('values', [])
arr = np.array(values)

result = {
    'mean': float(np.mean(arr)),
    'std': float(np.std(arr)),
    'median': float(np.median(arr)),
    'percentile_95': float(np.percentile(arr, 95))
}`,
      },
      {
        title: "Text Processing",
        description: "Process text with Python",
        code: `import re
from collections import Counter

text = input.get('text', '')

# Word frequency
words = re.findall(r'\\w+', text.lower())
freq = Counter(words).most_common(10)

result = {
    'word_count': len(words),
    'unique_words': len(set(words)),
    'top_words': freq
}`,
      },
    ],

    tips: [
      "First execution is slow (loading Pyodide) - subsequent runs are fast",
      "Use 'result' variable to pass data to next node",
      "print() output appears in stdout field",
      "Not all Python packages are available - check Pyodide compatibility",
    ],

    connections: {
      inputs: 1,
      outputs: 1,
    },
  },
};

export default NODE_DOCS;
