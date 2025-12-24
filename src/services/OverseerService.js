import webLLMService from "../engine/WebLLMService";
import useWorkflowStore from "../store/workflowStore";
import { NODE_DOCS } from "../data/nodeDocsData";
import { WORKFLOW_TEMPLATES } from "../data/templates";

/**
 * Build condensed knowledge base from NODE_DOCS
 */
function buildNodeReference() {
  return Object.entries(NODE_DOCS).map(([key, doc]) => ({
    type: key,
    title: doc.title,
    category: doc.category,
    overview: doc.overview?.slice(0, 150) + "...",
    config: doc.config?.map((c) => c.name).join(", ") || "none",
  }));
}

const SYSTEM_PROMPT = `
You are the Overseer, an expert AI assistant for IOSANS.
You have **DIRECT CONTROL** over the workflow canvas. You can build, edit, and run workflows by outputting JSON actions.

## 🛑 MISSION CRITICAL RULES
1. **ACTION OVER EXPLANATION**: If the user asks to "build", "create", "add", or "make" something, **DO NOT** explain how to do it. **JUST DO IT** by outputting the JSON actions.
   - ❌ "I can't build it directly, but here is a plan..."
   - ✅ (Outputs JSON to build it immediately)
2. **NO HALLUCINATIONS**: Use only Valid Node Types.
3. **CONNECT EVERYTHING**: Add 'addEdge' actions for every connection.
4. **ALWAYS OUTPUT**: Every flow needs an 'output' node.

## Valid Node Types
{{NODE_REFERENCE}}

## Interactive Capabilities
- **Build/Edit**: Output JSON with \`addNode\`, \`addEdge\`, \`updateNode\`.
- **Control**: Output JSON with \`runWorkflow\`, \`clearCanvas\`.
- **Teach**: Output JSON with \`startTutorial\`.

## Response Format
- **Chatting**: Text only.
- **Acting**: **ONLY** valid JSON inside a code block. NO explanation text outside the block if you are building the whole request.

\`\`\`json
{
  "actions": [
    { "type": "addNode", "nodeType": "aiAgent", ... },
    { "type": "addEdge", ... }
  ]
}
\`\`\`
`;

/**
 * Tier 2: Smart workflow analysis and suggestions
 */
function analyzeWorkflow(nodes, edges) {
  const issues = [];
  const suggestions = [];

  // Check for missing output node
  const hasOutput = nodes.some((n) => n.type === "output");
  if (nodes.length > 0 && !hasOutput) {
    issues.push("⚠️ No OUTPUT node - add one to see results");
  }

  // Check for disconnected nodes
  const connectedNodes = new Set();
  edges.forEach((e) => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });
  const disconnected = nodes.filter(
    (n) => !connectedNodes.has(n.id) && nodes.length > 1
  );
  if (disconnected.length > 0) {
    issues.push(`⚠️ ${disconnected.length} disconnected node(s)`);
  }

  // Check for missing trigger
  const hasTrigger = nodes.some((n) =>
    [
      "manualTrigger",
      "scheduleTrigger",
      "webhookTrigger",
      "browserEventTrigger",
    ].includes(n.type)
  );
  if (nodes.length > 0 && !hasTrigger) {
    issues.push("⚠️ No TRIGGER node - workflow cannot start");
  }

  // Smart suggestions based on last node type
  const lastNode = nodes[nodes.length - 1];
  if (lastNode) {
    switch (lastNode.type) {
      case "aiAgent":
        suggestions.push("➡️ Connect to textToSpeech to hear the response");
        suggestions.push("➡️ Connect to output to display the result");
        break;
      case "httpRequest":
        suggestions.push("➡️ Connect to codeExecutor to transform the data");
        suggestions.push("➡️ Connect to ifElse to check status code");
        break;
      case "codeExecutor":
        suggestions.push("➡️ Connect to output to display results");
        suggestions.push("➡️ Connect to httpRequest to send data");
        break;
      case "manualTrigger":
        suggestions.push("➡️ Connect to aiAgent for AI processing");
        suggestions.push("➡️ Connect to httpRequest for API calls");
        break;
    }
  }

  return {
    issues,
    suggestions,
    hasOutput,
    hasTrigger,
    disconnectedCount: disconnected.length,
  };
}

/**
 * Get detailed node documentation for config assistance
 */
function getNodeConfigHelp(nodeType) {
  const doc = NODE_DOCS[nodeType];
  if (!doc) return null;

  return {
    title: doc.title,
    overview: doc.overview,
    config: doc.config,
    examples: doc.examples?.slice(0, 2),
    tips: doc.tips?.slice(0, 3),
  };
}

class OverseerService {
  constructor() {
    this.sessions = this.loadSessions();
    this.activeSessionId = this.getLastActiveSessionId();

    // Ensure at least one session exists
    if (this.sessions.length === 0) {
      this.createSession("New Chat");
    } else if (
      !this.activeSessionId ||
      !this.getSession(this.activeSessionId)
    ) {
      // Fallback if active session is invalid
      this.activeSessionId = this.sessions[0].id;
      this.saveLastActiveSessionId();
    }

    this.subscribers = [];
    this.actionHistory = []; // For undo functionality
    this.thinkingCallbacks = [];
  }

  loadSessions() {
    try {
      const savedSessions = localStorage.getItem("overseer_sessions");
      if (savedSessions) {
        return JSON.parse(savedSessions);
      }

      // MIGRATION: Check for old single-history format
      const oldHistory = localStorage.getItem("overseer_history");
      if (oldHistory) {
        const history = JSON.parse(oldHistory);
        if (history.length > 0) {
          const legacySession = {
            id: "legacy-" + Date.now(),
            title: "Legacy Chat",
            timestamp: Date.now(),
            messages: history,
          };
          // Clear old key to finish migration
          localStorage.removeItem("overseer_history");
          return [legacySession];
        }
      }
      return [];
    } catch (e) {
      console.warn("Failed to load Overseer sessions", e);
      return [];
    }
  }

  saveSessions() {
    try {
      localStorage.setItem("overseer_sessions", JSON.stringify(this.sessions));
    } catch (e) {
      console.warn("Failed to save Overseer sessions", e);
    }
  }

  getLastActiveSessionId() {
    return localStorage.getItem("overseer_active_session_id");
  }

  saveLastActiveSessionId() {
    localStorage.setItem("overseer_active_session_id", this.activeSessionId);
  }

  // --- Session Management ---

  getSessions() {
    // Return sorted by newest first
    return [...this.sessions].sort((a, b) => b.timestamp - a.timestamp);
  }

  getSession(id) {
    return this.sessions.find((s) => s.id === id);
  }

  getActiveSession() {
    return this.getSession(this.activeSessionId);
  }

  createSession(title = "New Chat") {
    const newSession = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title: title,
      timestamp: Date.now(),
      messages: [],
    };
    this.sessions.unshift(newSession);
    this.activeSessionId = newSession.id;
    this.saveSessions();
    this.saveLastActiveSessionId();
    this.notifySubscribers();
    return newSession;
  }

  switchSession(id) {
    if (this.getSession(id)) {
      this.activeSessionId = id;
      this.saveLastActiveSessionId();
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  deleteSession(id) {
    this.sessions = this.sessions.filter((s) => s.id !== id);

    // If we deleted the active session, switch to another or create new
    if (this.activeSessionId === id) {
      if (this.sessions.length > 0) {
        this.activeSessionId = this.sessions[0].id;
      } else {
        this.createSession(); // Will set active ID
      }
    }

    this.saveSessions();
    this.saveLastActiveSessionId();
    this.notifySubscribers();
  }

  renameSession(id, newTitle) {
    const session = this.getSession(id);
    if (session) {
      session.title = newTitle;
      this.saveSessions();
      this.notifySubscribers();
    }
  }

  clearAllSessions() {
    this.sessions = [];
    this.createSession(); // Reset to fresh start
    this.saveSessions();
    this.notifySubscribers();
  }

  // --- Subscription for UI updates ---
  subscribe(callback) {
    this.subscribers.push(callback);
    // return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  notifySubscribers() {
    this.subscribers.forEach((cb) => cb());
  }

  /**
   * Send a message to the Overseer
   * @param {string} userMessage
   * @returns {Promise<string>} The assistant's response text
   */
  async chat(userMessage) {
    const session = this.getActiveSession();
    if (!session) throw new Error("No active session");

    // 1. Get current workflow context
    const { nodes, edges } = useWorkflowStore.getState();
    // Analyze workflow for suggestions and issues
    const analysis = analyzeWorkflow(nodes, edges);

    // Get current selection context if any
    const selectedNode = nodes.find((n) => n.selected);
    const selectedNodeHelp = selectedNode
      ? getNodeConfigHelp(selectedNode.type)
      : null;

    const context = JSON.stringify({
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data.label,
        config: n.data, // Include config for deeper understanding
      })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      analysis: {
        issues: analysis.issues,
        suggestions: analysis.suggestions,
        hasOutput: analysis.hasOutput,
        hasTrigger: analysis.hasTrigger,
      },
      selectedNode: selectedNode
        ? {
            id: selectedNode.id,
            type: selectedNode.type,
            help: selectedNodeHelp,
          }
        : null,
    });

    // 2. Prepare System Prompt
    // 2. Prepare Knowledge Base
    // We inject the node reference dynamically so it's always up to date
    const nodeReference = buildNodeReference()
      .map((n) => `- **${n.type}**: ${n.overview} (Inputs: ${n.config})`)
      .join("\n");

    // 3. Prepare System Prompt
    const systemPrompt =
      SYSTEM_PROMPT.replace("{{NODE_REFERENCE}}", nodeReference) +
      `\n\n### Current Workflow State\n${context}`;

    try {
      // 3. Call LLM
      // Note: webLLMService expects (userMessage, history, options)
      const response = await webLLMService.generateWithHistory(
        userMessage,
        session.messages, // Pass SESSION messages
        {
          temperature: 0.7,
          maxTokens: 2000, // Allow enough tokens for JSON
          systemPrompt: systemPrompt,
        }
      );

      // 4. Update history (SESSION)
      session.messages.push({ role: "user", content: userMessage });
      session.messages.push({ role: "assistant", content: response });
      session.timestamp = Date.now();

      // Auto-title
      if (session.title === "New Chat" && session.messages.length <= 2) {
        session.title = userMessage.split(" ").slice(0, 5).join(" ") + "...";
      }

      this.saveSessions();
      this.notifySubscribers();

      // 5. Parse and Execute Actions
      const actions = this.parseActions(response);
      if (actions.length > 0) {
        console.log("Overseer executing actions:", actions);
        this.executeActions(actions);
      }

      return response;
    } catch (error) {
      console.error("Overseer Error:", error);
      return `Error: ${error.message}. Is a model loaded?`;
    }
  }

  parseActions(text) {
    try {
      let jsonContent = null;

      // 1. Try to find code blocks with strict or loose formatting
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      } else {
        // 2. Fallback: Extract raw JSON object if no code blocks found
        // This handles cases where the model just outputs the JSON
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonContent = text.substring(firstBrace, lastBrace + 1);
        }
      }

      if (jsonContent) {
        // Clean up any potential leading/trailing non-json text inside the block/extraction
        const cleanJson = jsonContent.trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.actions && Array.isArray(parsed.actions)) {
          return parsed.actions;
        }
      }
    } catch (e) {
      console.warn("Failed to parse Overseer actions:", e);
    }
    return [];
  }

  executeActions(actions) {
    const store = useWorkflowStore.getState();

    const VALID_NODE_TYPES = [
      "manualTrigger",
      "scheduleTrigger",
      "webhookTrigger",
      "errorTrigger",
      "httpRequest",
      "codeExecutor",
      "setVariable",
      "fileSystem",
      "ifElse",
      "loop",
      "switchNode",
      "merge",
      "aiAgent",
      "vectorMemory",
      "waitForApproval",
      "textToSpeech",
      "imageGeneration",
      "output", // Ensure exact matches
    ];

    const NODE_MAPPINGS = {
      audioGeneration: "textToSpeech",
      AudioNode: "textToSpeech",
      "text-to-speech": "textToSpeech",
      TextToSpeech: "textToSpeech",
      "image-generation": "imageGeneration",
      "ai-agent": "aiAgent",
      "manual-trigger": "manualTrigger",
    };

    actions.forEach((action) => {
      const safeType = action.nodeType || "unknown";
      const id =
        action.id ||
        `${safeType}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      switch (action.type) {
        case "addNode": {
          let type = action.nodeType;

          if (!type) {
            console.warn(
              "Overseer: Missing nodeType in addNode action",
              action
            );
            return;
          }

          // Normalized check
          const normalizedType = type.toLowerCase();

          // Enhanced mappings for robustness
          const ENHANCED_MAPPINGS = {
            ...NODE_MAPPINGS,
            audiogeneration: "textToSpeech",
            audionode: "textToSpeech",
            "text-to-speech": "textToSpeech",
            texttospeech: "textToSpeech",
            "image-generation": "imageGeneration",
            imagegeneration: "imageGeneration",
            "ai-agent": "aiAgent",
            aiagent: "aiAgent",
            agent: "aiAgent",
            "manual-trigger": "manualTrigger",
            manualtrigger: "manualTrigger",
            "schedule-trigger": "scheduleTrigger",
            scheduletrigger: "scheduleTrigger",
            "webhook-trigger": "webhookTrigger",
            webhooktrigger: "webhookTrigger",
            errortrigger: "errorTrigger",
            "error-trigger": "errorTrigger",
            httprequest: "httpRequest",
            "http-request": "httpRequest",
            codeexecutor: "codeExecutor",
            "code-executor": "codeExecutor",
            setvariable: "setVariable",
            "set-variable": "setVariable",
            filesystem: "fileSystem",
            "file-system": "fileSystem",
            ifelse: "ifElse",
            "if-else": "ifElse",
            switchnode: "switchNode",
            switch: "switchNode",
            vectormemory: "vectorMemory",
            waitforapproval: "waitForApproval",
            "wait-for-approval": "waitForApproval",
          };

          if (ENHANCED_MAPPINGS[normalizedType]) {
            type = ENHANCED_MAPPINGS[normalizedType];
          } else {
            // Try to match case-insensitive against valid types
            const match = VALID_NODE_TYPES.find(
              (vt) => vt.toLowerCase() === normalizedType
            );
            if (match) type = match;
          }

          // Validate
          if (!VALID_NODE_TYPES.includes(type)) {
            console.warn(`Overseer: Skipped invalid node type '${type}'`);
            return;
          }

          store.addNode({
            id: id,
            type: type,
            position: {
              x: action.x || Math.random() * 400 + 50,
              y: action.y || Math.random() * 400 + 50,
            },
            data: {
              label: action.label || type,
              ...action.config,
            },
          });
          break;
        }

        case "addEdge":
          store.onConnect({
            source: action.source,
            target: action.target,
            sourceHandle: action.sourceHandle || "output-0",
            targetHandle: action.targetHandle || "input-0",
            type: "animated",
          });
          break;

        case "deleteNode":
          if (action.nodeId) store.deleteNode(action.nodeId);
          break;

        case "clearCanvas":
          store.clearWorkflow();
          break;

        case "loadTemplate": {
          const template = WORKFLOW_TEMPLATES.find(
            (t) => t.id === action.templateId
          );
          if (template) {
            store.clearWorkflow();
            template.nodes.forEach((node) => store.addNode({ ...node }));
            template.edges.forEach((edge) =>
              store.onConnect({
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle || "output-0",
                targetHandle: edge.targetHandle || "input-0",
                type: "animated",
              })
            );
            console.log(`Overseer: Loaded template '${template.name}'`);
          } else {
            console.warn(`Overseer: Template '${action.templateId}' not found`);
          }
          break;
        }

        case "updateNode": {
          if (action.nodeId && action.config) {
            const nodes = store.nodes;
            const nodeIndex = nodes.findIndex((n) => n.id === action.nodeId);
            if (nodeIndex !== -1) {
              const updatedNodes = [...nodes];
              updatedNodes[nodeIndex] = {
                ...updatedNodes[nodeIndex],
                data: { ...updatedNodes[nodeIndex].data, ...action.config },
              };
              store.setNodes(updatedNodes);
              console.log(`Overseer: Updated node '${action.nodeId}'`);
            }
          }
          break;
        }

        case "runWorkflow": {
          window.dispatchEvent(new CustomEvent("startWorkflow"));
          console.log("Overseer: Triggered workflow execution");
          break;
        }

        case "focusNode": {
          if (action.nodeId) {
            store.openConfig(action.nodeId);
            console.log(`Overseer: Focused on node '${action.nodeId}'`);
          }
          break;
        }

        case "startTutorial": {
          // Tutorial mode - just logs for now, UI handles the rest via events
          window.dispatchEvent(
            new CustomEvent("startTutorial", { detail: action.tutorialId })
          );
          console.log(`Overseer: Started tutorial '${action.tutorialId}'`);
          break;
        }

        case "undoAction": {
          const undone = this.undoLastAction();
          if (undone) {
            console.log(`Overseer: Undid action '${undone.type}'`);
          }
          break;
        }
      }
    });
  }

  // Subscribe to thinking updates
  onThinking(callback) {
    this.thinkingCallbacks.push(callback);
    return () => {
      this.thinkingCallbacks = this.thinkingCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  // Broadcast thinking update
  broadcastThinking(type, content, details = null) {
    this.thinkingCallbacks.forEach((cb) =>
      cb({ type, content, details, timestamp: Date.now() })
    );
  }

  // Undo last action
  undoLastAction() {
    const lastAction = this.actionHistory.pop();
    if (!lastAction) return null;

    const store = useWorkflowStore.getState();
    switch (lastAction.type) {
      case "addNode":
        store.deleteNode(lastAction.nodeId);
        break;
      case "deleteNode":
        store.addNode(lastAction.node);
        break;
      case "clearCanvas":
        lastAction.nodes.forEach((n) => store.addNode(n));
        lastAction.edges.forEach((e) => store.onConnect(e));
        break;
    }
    return lastAction;
  }

  // This is now effectively "Reload sessions"
  clearHistory() {
    this.sessions = this.loadSessions();
    this.notifySubscribers();
  }
}

export default new OverseerService();
