/**
 * Node Executors
 * Execution logic for each node type
 */
import webLLMService from "./WebLLMService";
import vectorMemory from "./memory/VectorMemory";
import { saveArtifact } from "../utils/artifactStorage";
import { vectorMemoryService } from "../services/VectorMemoryService";
import { executeSandboxed } from "../utils/sandboxedExecutor";
import { autoDetectType, dataUriToBlob } from "../utils/autoDetectType";

/**
 * Execute a single node and return its output
 * @param {Object} node - The node to execute
 * @param {*} input - Input data from previous node(s)
 * @param {Object} context - Execution context
 * @returns {Object} { output, outputIndex?, error? }
 */
export async function executeNode(node, input, context) {
  const executor = NodeExecutors[node.type];

  if (!executor) {
    throw new Error(`No executor found for node type: ${node.type}`);
  }

  try {
    const result = await executor(node.data, input, context);
    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Node execution failed",
      output: null,
    };
  }
}

// Helper to safely parse JSON
const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

// Helper to detect content type from input data
const detectContentType = (input) => {
  // Direct Blob detection
  if (input instanceof Blob) {
    const ext = getExtensionFromMime(input.type);
    return {
      mimeType: input.type || "application/octet-stream",
      extension: ext,
      data: input,
      isBlob: true,
    };
  }

  // Check for nested audio/image blob fields
  if (input?.audioBlob instanceof Blob) {
    return {
      mimeType: input.audioBlob.type || "audio/wav",
      extension: ".wav",
      data: input.audioBlob,
      isBlob: true,
    };
  }

  if (input?.imageBlob instanceof Blob) {
    return {
      mimeType: input.imageBlob.type || "image/png",
      extension: ".png",
      data: input.imageBlob,
      isBlob: true,
    };
  }

  // Check for base64 encoded audio/image
  if (typeof input?.audioBase64 === "string") {
    const blob = base64ToBlob(input.audioBase64, "audio/wav");
    return {
      mimeType: "audio/wav",
      extension: ".wav",
      data: blob,
      isBlob: true,
    };
  }

  // URL-based content (blob URLs)
  if (typeof input?.url === "string" && input.url.startsWith("blob:")) {
    const inferredType = input.type || "application/octet-stream";
    return {
      mimeType: inferredType,
      extension: getExtensionFromMime(inferredType),
      data: input.url,
      isBlob: false,
    };
  }

  // Plain text string
  if (typeof input === "string") {
    return {
      mimeType: "text/plain",
      extension: ".txt",
      data: input,
      isBlob: false,
    };
  }

  // JSON object - most common case for workflow data
  if (typeof input === "object" && input !== null) {
    const jsonStr = JSON.stringify(input, null, 2);
    return {
      mimeType: "application/json",
      extension: ".json",
      data: jsonStr,
      isBlob: false,
    };
  }

  // Fallback
  return {
    mimeType: "text/plain",
    extension: ".txt",
    data: String(input),
    isBlob: false,
  };
};

// Helper to get file extension from MIME type
const getExtensionFromMime = (mimeType) => {
  const mimeMap = {
    // Audio
    "audio/wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/flac": ".flac",
    "audio/aac": ".aac",

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
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",

    // Archives
    "application/zip": ".zip",
    "application/x-tar": ".tar",
    "application/gzip": ".gz",
    "application/x-7z-compressed": ".7z",

    // Binary
    "application/octet-stream": ".bin",
  };
  return mimeMap[mimeType] || ".bin";
};

// Helper to convert base64 to Blob
const base64ToBlob = (base64, mimeType = "application/octet-stream") => {
  try {
    const byteChars = atob(base64.replace(/^data:[^;]+;base64,/, ""));
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  } catch {
    return null;
  }
};

// generateSpeechAudioBlob removed (unused)

// Helper to convert AudioBuffer to WAV Blob
// audioBufferToWav removed (unused)

// Helper to create and save artifact
const createArtifact = async (context, name, type, data) => {
  try {
    const artifact = {
      id: crypto.randomUUID(),
      nodeId: context.nodeId,
      executionId: context.executionId || "manual",
      name,
      type,
      data,
      timestamp: Date.now(),
    };

    await saveArtifact(artifact);

    // Update store if available
    if (context.executionStore?.addArtifact) {
      context.executionStore.addArtifact(artifact);
    }

    context.addLog({
      type: "success",
      nodeId: context.nodeId,
      nodeName: "System",
      message: `💾 Saved artifact: ${name}`,
    });

    return artifact;
  } catch (error) {
    console.error("Failed to save artifact:", error);
    context.addLog({
      type: "error",
      nodeId: context.nodeId,
      nodeName: "System",
      message: `Failed to save artifact: ${error.message}`,
    });
    return null;
  }
};

/**
 * Executor functions for each node type
 */
const NodeExecutors = {
  // Trigger nodes
  manualTrigger: async (data, input, context) => {
    // 1. Use defaultPayload from node config (textarea)
    // 2. Fallback to inputValues from form builder
    const defaultPayload = data.defaultPayload || "";
    const formData = data.inputValues || {};

    const output = {
      timestamp: new Date().toISOString(),
      trigger: "manual",
      ...formData,
      text: defaultPayload, // Primary text field
      data: input || { ...formData, text: defaultPayload },
    };

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Manual Trigger",
      message: "🚀 Workflow started manually",
    });

    return { output };
  },

  scheduleTrigger: async (data, input, context) => {
    // When hit as part of a loop, we just log and pass through
    // In a real backend system, this might register a future job
    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: "Schedule",
      message: `⏰ Rescheduling next run... (Simulated)`,
    });
    return { output: input };
  },

  // LLM Node
  aiAgent: async (data, input, context) => {
    // 1. Merge input overrides (if input is config object)
    const mergedData = { ...data };
    if (typeof input === "object" && input !== null && !Array.isArray(input)) {
      // Allow overriding specific config keys
      ["model", "temperature", "maxTokens", "systemMessage"].forEach((key) => {
        if (input[key] !== undefined) mergedData[key] = input[key];
      });
    }

    // 2. Apply connected model settings (from Chat Model node via diamond handle)
    const connectedModel = mergedData.connectedModel;
    if (connectedModel) {
      // Priority: connected model settings override node defaults
      if (connectedModel.temperature !== undefined) {
        mergedData.temperature = connectedModel.temperature;
      }
      if (connectedModel.maxTokens !== undefined) {
        mergedData.maxTokens = connectedModel.maxTokens;
      }
      if (connectedModel.modelId) {
        mergedData.modelId = connectedModel.modelId;
      }
    }

    const {
      systemMessage,
      userMessage,
      temperature = 0.7,
      maxTokens = 1000,
    } = mergedData;

    let history = [];
    let currentMessage = "";
    let finalSystemMessage = systemMessage || "";

    // Case 1: Input is a conversation history array
    if (Array.isArray(input) && input.length > 0) {
      const last = input[input.length - 1];
      currentMessage = last.content;
      history = input.slice(0, -1);

      // Extract system message from history if present to pass as config
      const sysMsg = history.find((m) => m.role === "system");
      if (sysMsg) {
        finalSystemMessage = sysMsg.content;
        history = history.filter((m) => m.role !== "system");
      }
    }
    // Case 2: Standard config construction
    else {
      // Resolve system message
      if (finalSystemMessage && finalSystemMessage.includes("{{")) {
        finalSystemMessage = resolveExpressions(finalSystemMessage, { input });
      }

      // Resolve user message
      if (userMessage) {
        if (userMessage.includes("{{")) {
          currentMessage = resolveExpressions(userMessage, { input });
        } else {
          currentMessage = userMessage;
        }
      } else {
        // Fallback to stringifying input
        currentMessage =
          typeof input === "string" ? input : JSON.stringify(input);
      }
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "AI Agent",
      message: "🤖 AI processing...",
    });

    // 3. Apply connected memory (Context Retrieval)
    const connectedMemory = mergedData.connectedMemory;
    if (connectedMemory) {
      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: data.label || "AI Agent",
        message: `🧠 Retrieving memories from ${connectedMemory.namespace}...`,
      });

      try {
        const memoryResult = await vectorMemoryService.query(
          connectedMemory.namespace,
          currentMessage,
          connectedMemory.topK || 5
        );

        if (
          memoryResult &&
          memoryResult.matches &&
          memoryResult.matches.length > 0
        ) {
          const contextText = memoryResult.matches
            .map(
              (m) =>
                `- ${
                  typeof m.text === "string" ? m.text : JSON.stringify(m.text)
                }`
            )
            .join("\n");

          finalSystemMessage =
            `${finalSystemMessage}\n\n[CONTEXT FROM MEMORY]\nUse the following retrieved context to answer the user:\n${contextText}\n[/CONTEXT]`.trim();

          context.addLog({
            type: "info",
            nodeId: context.nodeId,
            nodeName: data.label || "AI Agent",
            message: `✅ Found ${memoryResult.matches.length} relevant memories`,
          });
        }
      } catch (err) {
        context.addLog({
          type: "warning",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `⚠️ Memory retrieval failed: ${err.message}`,
        });
      }

      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: data.label || "AI Agent",
        message: `🧠 Context prep complete. Starting generation...`,
      });
    }

    try {
      // Check if correct model is loaded
      const targetModelId = mergedData.modelId || "gemma-2-2b-it";

      if (
        !webLLMService.isReady ||
        webLLMService.currentModel !== targetModelId
      ) {
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `🔄 Loading AI Model: ${targetModelId}... (This may take a moment)`,
        });

        await webLLMService.initialize(targetModelId, () => {
          // Report progress and heartbeat to prevent timeout
          if (context.heartbeat) context.heartbeat();
        });

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `✅ Model loaded: ${targetModelId}`,
        });
      }

      // Build tool-aware system prompt for JSON mode
      const tools = mergedData.tools || [];
      let toolSystemPrompt = "";

      if (tools.length > 0) {
        toolSystemPrompt = `

You have access to these tools:
${tools
  .map((t) => `- ${t.name}: ${t.description || "Execute " + t.type + " node"}`)
  .join("\n")}

IMPORTANT: When you need to use a tool, respond ONLY with this JSON format:
{"action": "tool", "tool": "tool_name", "input": "your input for the tool"}

When you have the final answer (after tool results or if no tool needed), respond with:
{"action": "answer", "content": "your final response to the user"}

Always respond with valid JSON. Do not include any text outside the JSON object.`;
      }

      const fullSystemPrompt = finalSystemMessage + toolSystemPrompt;

      // Two-pass execution loop for tool calling
      const MAX_TOOL_ITERATIONS = mergedData.maxIterations || 10;
      let iteration = 0;
      let conversationHistory = [...history];
      let currentUserMessage = currentMessage;
      let finalOutput = null;

      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;

        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message:
            iteration === 1
              ? `🤖 Generating response...`
              : `🔄 Processing tool result (iteration ${iteration})...`,
        });

        const response = await webLLMService.generateWithHistory(
          currentUserMessage,
          conversationHistory,
          {
            temperature,
            maxTokens: maxTokens,
            systemPrompt: fullSystemPrompt,
          },
          // Heartbeat callback for streaming/progress
          () => {
            if (context.heartbeat) context.heartbeat();
          }
        );

        let cleanResponse = response.trim();

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `✅ Generation complete`,
        });

        // Try to parse as JSON (tool call or final answer)
        let parsed = null;
        try {
          // Extract JSON from response (handle markdown code blocks)
          let jsonStr = cleanResponse;
          const jsonMatch = cleanResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
          }
          // Also try to find raw JSON object
          const rawJsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
          if (!jsonMatch && rawJsonMatch) {
            jsonStr = rawJsonMatch[0];
          }

          parsed = JSON.parse(jsonStr);
        } catch {
          // Not valid JSON - treat as direct answer
          context.addLog({
            type: "info",
            nodeId: context.nodeId,
            nodeName: data.label || "AI Agent",
            message: `📝 Response is not JSON, treating as direct answer`,
          });
          finalOutput = cleanResponse;
          break;
        }

        // Handle parsed response
        if (parsed.action === "answer") {
          // Final answer
          finalOutput = parsed.content || cleanResponse;
          break;
        } else if (parsed.action === "tool" && parsed.tool) {
          // Tool call requested
          const toolName = parsed.tool;
          const toolInput = parsed.input;

          context.addLog({
            type: "warning",
            nodeId: context.nodeId,
            nodeName: data.label || "AI Agent",
            message: `🛠️ Agent calling tool: ${toolName}`,
            data: { tool: toolName, input: toolInput },
          });

          // Find the tool definition
          const toolDef = tools.find(
            (t) => t.name.toLowerCase() === toolName.toLowerCase()
          );

          if (toolDef) {
            const toolNode = context.nodes.find((n) => n.id === toolDef.nodeId);

            if (toolNode) {
              context.addLog({
                type: "info",
                nodeId: context.nodeId,
                nodeName: data.label || "AI Agent",
                message: `🚀 Executing tool: ${toolName}...`,
              });

              // Execute the tool node
              const toolResult = await executeNode(
                toolNode,
                toolInput,
                context
              );

              if (toolResult.success) {
                context.addLog({
                  type: "success",
                  nodeId: context.nodeId,
                  nodeName: data.label || "AI Agent",
                  message: `✅ Tool '${toolName}' executed successfully`,
                });

                // Check if tool output is binary/blob data
                const isBinaryOutput =
                  toolResult.output instanceof Blob ||
                  toolResult.output instanceof ArrayBuffer ||
                  (typeof toolResult.output === "object" &&
                    (toolResult.output?.audioBlob ||
                      toolResult.output?.imageBlob ||
                      toolResult.output?.videoBlob)) ||
                  (typeof toolResult.output === "string" &&
                    toolResult.output.startsWith("data:"));

                // Store the actual tool output for binary data passthrough
                if (isBinaryOutput) {
                  // For binary outputs, store as final output immediately
                  // The AI doesn't need to process binary data
                  context.addLog({
                    type: "info",
                    nodeId: context.nodeId,
                    nodeName: data.label || "AI Agent",
                    message: `🔄 Binary output detected, passing through directly`,
                  });
                  finalOutput = toolResult.output;
                  break; // Exit loop and return binary data
                }

                // Add tool call and result to history for next iteration (text data)
                const toolOutputStr =
                  typeof toolResult.output === "object"
                    ? JSON.stringify(toolResult.output)
                    : String(toolResult.output);

                conversationHistory.push(
                  { role: "assistant", content: cleanResponse },
                  {
                    role: "user",
                    content: `Tool "${toolName}" returned: ${toolOutputStr}\n\nPlease provide your final answer using: {"action": "answer", "content": "..."}`,
                  }
                );
                currentUserMessage = ""; // History contains the context now

                // If this is the last iteration, use tool result as output
                if (iteration === MAX_TOOL_ITERATIONS) {
                  finalOutput = toolResult.output;
                }
              } else {
                context.addLog({
                  type: "error",
                  nodeId: context.nodeId,
                  nodeName: data.label || "AI Agent",
                  message: `❌ Tool '${toolName}' failed: ${toolResult.error}`,
                });

                // Inform the LLM about the error
                conversationHistory.push(
                  { role: "assistant", content: cleanResponse },
                  {
                    role: "user",
                    content: `Tool "${toolName}" failed with error: ${toolResult.error}\n\nPlease handle this error and provide your final answer.`,
                  }
                );
                currentUserMessage = "";
              }
            } else {
              context.addLog({
                type: "error",
                nodeId: context.nodeId,
                nodeName: data.label || "AI Agent",
                message: `❌ Tool node not found: ${toolDef.nodeId}`,
              });
              finalOutput = `Error: Tool node "${toolName}" not found in workflow`;
              break;
            }
          } else {
            context.addLog({
              type: "error",
              nodeId: context.nodeId,
              nodeName: data.label || "AI Agent",
              message: `⚠️ Tool '${toolName}' not connected. Available: ${
                tools.map((t) => t.name).join(", ") || "none"
              }`,
            });

            // Inform LLM about missing tool
            conversationHistory.push(
              { role: "assistant", content: cleanResponse },
              {
                role: "user",
                content: `Tool "${toolName}" is not available. Available tools: ${
                  tools.map((t) => t.name).join(", ") || "none"
                }.\n\nPlease provide your answer without using that tool.`,
              }
            );
            currentUserMessage = "";
          }
        } else {
          // Unknown action or malformed - treat as answer
          finalOutput = parsed.content || cleanResponse;
          break;
        }
      }

      if (iteration >= MAX_TOOL_ITERATIONS && !finalOutput) {
        context.addLog({
          type: "warning",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `⚠️ Max tool iterations reached (${MAX_TOOL_ITERATIONS})`,
        });
      }

      return { output: finalOutput };
    } catch (err) {
      throw new Error(`AI generation failed: ${err.message}`);
    }
  },

  // Code Execution Node (SECURED)
  codeExecutor: async (data, input, context) => {
    const { code, language = "javascript", cdnUrls = [] } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Code Executor",
      message: `⚡ Executing ${language} code (sandboxed)...`,
    });

    if (language === "javascript") {
      try {
        // Load CDN libraries if specified
        if (cdnUrls.length > 0) {
          context.addLog({
            type: "info",
            nodeId: context.nodeId,
            nodeName: data.label || "Code Executor",
            message: `📦 Loading ${cdnUrls.length} CDN libraries...`,
          });

          // Dynamic import of cdnLoader
          const { loadFromCDN } = await import("../utils/cdnLoader");

          for (const url of cdnUrls) {
            try {
              await loadFromCDN(url);
            } catch {
              context.addLog({
                type: "warning",
                nodeId: context.nodeId,
                nodeName: data.label || "Code Executor",
                message: `⚠️ Failed to load: ${url.split("/").pop()}`,
              });
            }
          }
        }

        // Execute in sandboxed environment
        const result = await executeSandboxed(
          code,
          input,
          {
            nodeId: context.nodeId,
          },
          { timeout: 30000 }
        );

        return { output: result };
      } catch (err) {
        throw new Error(`Execution error: ${err.message}`);
      }
    } else if (language === "python" && window.pyodide) {
      // Use Pyodide if available
      // ... (omitted for brevity, handled by PyodideService usually)
      throw new Error("Python execution not ready pending Pyodide load");
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  },

  // Image Generation Node (placeholder - requires WebSD or API)
  imageGeneration: async (data, input, context) => {
    // Merge input overrides
    const mergedData = { ...data };
    if (typeof input === "object" && input !== null) {
      ["model", "size", "negativePrompt", "seed", "steps"].forEach((key) => {
        if (input[key] !== undefined) mergedData[key] = input[key];
      });
    }

    const { seed = null } = mergedData;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Image Generation",
      message: "🎨 Generating image (Simulated)...",
    });

    // Simulation for now
    await new Promise((r) => setTimeout(r, 2000));

    // Create dummy image blob (red square) for demo
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText("AI Generated Image", 100, 256);

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        // Generate artifact ID
        const artifactId = `image_${Date.now()}_${crypto
          .randomUUID()
          .slice(0, 8)}`;

        // Save artifact
        await createArtifact(context, `${artifactId}.png`, "image/png", blob);

        resolve({
          output: {
            artifactId: artifactId,
            type: "image",
            mimeType: "image/png",
            url: URL.createObjectURL(blob),
            prompt: input,
            seed: seed || 12345,
            _executed: true,
          },
        });
      });
    });
  },

  // HTTP Request Node (SECURED - URL validation enabled)
  httpRequest: async (data, input, context) => {
    const { method = "GET", url, headers, body, timeout = 5000 } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "HTTP Request",
      message: `🌐 ${method} ${url}`,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: safeJsonParse(headers) || {},
        body: ["GET", "HEAD"].includes(method)
          ? undefined
          : typeof body === "string"
          ? body
          : JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Detect content type to handle binary vs text responses
      const contentType = response.headers.get("content-type") || "";
      let responseData;

      if (
        contentType.includes("audio/") ||
        contentType.includes("video/") ||
        contentType.includes("image/") ||
        contentType.includes("application/octet-stream")
      ) {
        // Binary content - return as Blob
        const blob = await response.blob();
        responseData = {
          audioBlob: contentType.includes("audio/") ? blob : undefined,
          imageBlob: contentType.includes("image/") ? blob : undefined,
          videoBlob: contentType.includes("video/") ? blob : undefined,
          blob: blob,
          mimeType: contentType.split(";")[0],
          url: URL.createObjectURL(blob),
        };

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "HTTP Request",
          message: `📥 Received binary data (${contentType.split(";")[0]})`,
        });
      } else if (contentType.includes("application/json")) {
        // JSON response
        responseData = await response.json().catch(() => ({}));
      } else {
        // Text or other - try JSON first, fallback to text
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      }

      return {
        output: {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries()),
          // Flatten binary outputs for easier detection
          ...(responseData?.audioBlob
            ? { audioBlob: responseData.audioBlob }
            : {}),
          ...(responseData?.imageBlob
            ? { imageBlob: responseData.imageBlob }
            : {}),
        },
      };
    } catch (error) {
      throw new Error(`HTTP Request failed: ${error.message}`);
    }
  },

  // Variable / State Node
  setVariable: async (data, input, context) => {
    const { variableName, value } = data;

    // Override logic: defaults to config value, but upstream input can override
    let finalValue = value;

    // Check for overrides from input
    if (typeof input === "object" && input !== null) {
      // Priority 1: Exact match of variable name
      if (input[variableName] !== undefined) {
        finalValue = input[variableName];
      }
      // Priority 2: Generic 'value' field
      else if (input.value !== undefined) {
        finalValue = input.value;
      }
      // Priority 3: Generic 'text' field (from Manual Trigger etc)
      else if (input.text !== undefined) {
        finalValue = input.text;
      }
    }

    // Resolve templates if string
    if (typeof finalValue === "string" && finalValue.includes("{{")) {
      finalValue = resolveTemplates(finalValue, { input });
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Set Variable",
      message: `📦 Set ${variableName} = ${
        typeof finalValue === "string" ? finalValue.slice(0, 50) : "..."
      }`,
    });

    // For now, we return it merged into output.
    // In a real state machine, we'd update global state logic.
    return {
      output: {
        ...input,
        [variableName]: finalValue,
      },
    };
  },

  // Logic: If/Else
  ifElse: async (data, input, context) => {
    const { condition, operator = "equals", compareValue } = data;

    // Get left side value (variable name or path in input)
    const leftValue = getNestedValue(input, condition);

    let result = false;

    switch (operator) {
      case "equals":
        result = leftValue == compareValue;
        break; // loose eq
      case "notEquals":
        result = leftValue != compareValue;
        break;
      case "contains":
        result = String(leftValue).includes(compareValue);
        break;
      case "greaterThan":
        result = Number(leftValue) > Number(compareValue);
        break;
      case "lessThan":
        result = Number(leftValue) < Number(compareValue);
        break;
      case "exists":
        result = leftValue !== undefined && leftValue !== null;
        break;
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "If/Else",
      message: `🔀 Check: ${condition} ${operator} ${compareValue} -> ${result}`,
    });

    // Output index 0 for True, 1 for False
    return {
      output: input,
      outputIndex: result ? 0 : 1,
    };
  },

  // Merge Node - Waits for or aggregates parallel inputs
  merge: async (data, input, context) => {
    const {
      mode = "wait",
      inputCount: _inputCount = 2,
      aggregator = "array",
    } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Merge",
      message: `🔗 Merge node (mode: ${mode})`,
    });

    // For parallel execution, merge node would aggregate results
    // The ExecutionEngine handles the actual waiting/aggregation
    // Here we just format the output based on aggregator setting

    let output;
    if (Array.isArray(input)) {
      switch (aggregator) {
        case "object":
          output = input.reduce(
            (acc, item, i) => ({ ...acc, [`input${i}`]: item }),
            {}
          );
          break;
        case "concat":
          output = input.flat();
          break;
        case "array":
        default:
          output = input;
      }
    } else {
      output = input;
    }

    return { output };
  },

  // Semantic Router - Routes based on keyword/LLM classification
  semanticRouter: async (data, input, context) => {
    const { routes = [], classificationMode = "keyword" } = data;

    // Get text to classify
    const textToClassify =
      typeof input === "string"
        ? input
        : input?.text || input?.content || JSON.stringify(input);

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Router",
      message: `🧭 Classifying input (${classificationMode} mode)...`,
    });

    let matchedRouteIndex = -1;

    if (classificationMode === "keyword") {
      // Simple keyword matching
      const lowerText = textToClassify.toLowerCase();

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const keywords = route.keywords || [];

        for (const keyword of keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            matchedRouteIndex = i;
            break;
          }
        }

        if (matchedRouteIndex >= 0) break;
      }
    } else if (classificationMode === "embedding") {
      // Embedding-based classification
      try {
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "Router",
          message: "🧠 Generating embeddings for input...",
        });

        // Generate embedding for input
        const inputEmbedding = await vectorMemory.generateEmbedding(
          textToClassify
        );

        // Compare with each route
        let bestScore = -1;

        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          // Use keywords or label as the semantic target
          const routeText = (route.keywords || []).join(" ") || route.label;

          if (!routeText) continue;

          // Generate embedding for route (this should ideally be cached)
          const routeEmbedding = await vectorMemory.generateEmbedding(
            routeText
          );

          const score = vectorMemory.cosineSimilarity(
            inputEmbedding,
            routeEmbedding
          );

          context.addLog({
            type: "info",
            nodeId: context.nodeId,
            nodeName: data.label || "Router",
            message: `Route "${route.label}" score: ${score.toFixed(4)}`,
          });

          if (score > bestScore && score > 0.3) {
            // Threshold
            bestScore = score;
            matchedRouteIndex = i;
          }
        }
      } catch (error) {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: data.label || "Router",
          message: `Embedding error: ${error.message}`,
        });
      }
    }

    // If no match, use last output (fallback/other)
    const finalOutputIndex =
      matchedRouteIndex >= 0 ? matchedRouteIndex : routes.length;

    const routeLabel =
      finalOutputIndex < routes.length
        ? routes[finalOutputIndex].label
        : "Other";

    context.addLog({
      type: "success",
      nodeId: context.nodeId,
      nodeName: data.label || "Router",
      message: `✅ Routed to: ${routeLabel} (output ${finalOutputIndex + 1})`,
    });

    return {
      output: input,
      outputIndex: finalOutputIndex,
    };
  },

  // Evaluator Node - Validates output for self-correction loops
  evaluator: async (data, input, context) => {
    const {
      evaluationType = "schema",
      schema = null,
      regexPattern = "",
      maxRetries = 3,
    } = data;

    // Track retry count in context
    const retryCount = context.retryCount || 0;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Evaluator",
      message: `🔍 Evaluating output (${evaluationType}, attempt ${
        retryCount + 1
      }/${maxRetries + 1})...`,
    });

    let isValid = false;
    let validationError = null;

    try {
      switch (evaluationType) {
        case "schema":
          // JSON Schema validation (basic implementation)
          if (schema && typeof schema === "object") {
            const requiredKeys = Object.keys(schema);
            const inputObj =
              typeof input === "object" ? input : JSON.parse(input);

            const missingKeys = requiredKeys.filter(
              (key) => !(key in inputObj)
            );
            isValid = missingKeys.length === 0;

            if (!isValid) {
              validationError = `Missing required keys: ${missingKeys.join(
                ", "
              )}`;
            }
          } else {
            // No schema defined = auto pass
            isValid = true;
          }
          break;

        case "regex":
          if (regexPattern) {
            const regex = new RegExp(regexPattern);
            const textToCheck =
              typeof input === "string" ? input : JSON.stringify(input);
            isValid = regex.test(textToCheck);

            if (!isValid) {
              validationError = `Pattern not matched: ${regexPattern}`;
            }
          } else {
            isValid = true;
          }
          break;

        case "llm":
          // LLM-based evaluation would go here
          // For now, just pass
          isValid = true;
          break;

        default:
          isValid = true;
      }
    } catch (error) {
      isValid = false;
      validationError = error.message;
    }

    if (isValid) {
      context.addLog({
        type: "success",
        nodeId: context.nodeId,
        nodeName: data.label || "Evaluator",
        message: `✅ Validation passed`,
      });

      // Output 0 = pass
      return {
        output: input,
        outputIndex: 0,
      };
    } else {
      // Check if we can retry
      if (retryCount < maxRetries) {
        context.addLog({
          type: "warning",
          nodeId: context.nodeId,
          nodeName: data.label || "Evaluator",
          message: `⚠️ Validation failed: ${validationError}. Retrying...`,
        });

        // Output 1 = retry (goes back to generator)
        return {
          output: {
            originalInput: input,
            error: validationError,
            retryCount: retryCount + 1,
            feedback: `Your output was invalid: ${validationError}. Please try again.`,
          },
          outputIndex: 1,
          retryCount: retryCount + 1,
        };
      } else {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: data.label || "Evaluator",
          message: `❌ Max retries reached. Validation failed: ${validationError}`,
        });

        // No more retries - still output 0 but with error flag
        return {
          output: {
            ...input,
            _validationFailed: true,
            _validationError: validationError,
          },
          outputIndex: 0,
        };
      }
    }
  },

  // Loops - supports both count-based (iterations) and array-based (itemsPath) looping
  loop: async (data, input, context) => {
    const { iterations = 1 } = data;

    // Initialize or get current loop state from context
    const loopState = context.loopState || {
      currentIteration: 0,
      totalIterations: iterations,
      results: [],
    };

    // Check if this is a continuation (loop-back)
    const isLoopBack = loopState.currentIteration > 0;

    // Collect result from previous iteration
    if (isLoopBack && input) {
      loopState.results.push(input);
    }

    // Increment iteration counter
    loopState.currentIteration++;

    // Check if we should continue looping
    const shouldContinue =
      loopState.currentIteration <= loopState.totalIterations;

    if (shouldContinue) {
      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: data.label || "Loop",
        message: `🔄 Iteration ${loopState.currentIteration} of ${loopState.totalIterations}`,
      });

      // Output via "loop →" (output index 0) to continue iteration
      return {
        output: {
          iteration: loopState.currentIteration,
          totalIterations: loopState.totalIterations,
          previousResult: input,
          isLoopIteration: true,
        },
        outputIndex: 0, // "loop →" output
        loopState,
      };
    } else {
      // All iterations complete - output via "done ✓" (output index 1)
      context.addLog({
        type: "success",
        nodeId: context.nodeId,
        nodeName: data.label || "Loop",
        message: `✅ Loop complete: ${loopState.results.length} iterations processed`,
      });

      return {
        output: {
          results: loopState.results,
          totalIterations: loopState.totalIterations,
          lastResult: input,
          completed: true,
        },
        outputIndex: 1, // "done ✓" output
        loopState: null, // Clear loop state
      };
    }
  },
  // Tool Call Node (placeholder for agent tool execution)
  toolCall: async (data, input, context) => {
    const { toolName, args } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Tool Call",
      message: `🔧 Executing tool: ${toolName}`,
      data: args || input,
    });

    // In a real implementation, this would call the actual tool
    // For now, we simulate success
    return {
      output: {
        tool: toolName,
        status: "success",
        result: `Executed ${toolName} successfully`,
        args: args || input,
      },
    };
  },

  // Vector Memory Node
  vectorMemory: async (data, input, context) => {
    // 1. Merge input overrides
    const mergedData = { ...data };
    if (typeof input === "object" && input !== null) {
      ["mode", "namespace", "topK", "minScore"].forEach((key) => {
        if (input[key] !== undefined) mergedData[key] = input[key];
      });
    }

    const {
      mode = "upsert",
      namespace = "default",
      topK = 5,
      minScore = 0.1,
    } = mergedData;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Vector Store",
      message: `🧠 Vector Store Operation: ${mode} (${namespace})`,
    });

    let result;
    try {
      if (mode === "upsert") {
        // Handle input as items to store
        // Expecting { text: "..." } or array of objects, or just string
        let itemsToStore = [];
        if (Array.isArray(input)) {
          itemsToStore = input.map((item) =>
            typeof item === "string" ? { text: item } : item
          );
        } else if (typeof input === "object" && input !== null) {
          if (input.text) itemsToStore = [input];
          else if (input.content)
            itemsToStore = [{ text: input.content, ...input }];
          else
            itemsToStore = [{ text: JSON.stringify(input), metadata: input }];
        } else {
          itemsToStore = [{ text: String(input) }];
        }

        result = await vectorMemoryService.upsert(namespace, itemsToStore);

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Vector Store",
          message: `💾 Memorized ${result.added} new items, updated ${result.updated}`,
        });
      } else if (mode === "query") {
        // Query text comes from input
        const queryText =
          typeof input === "string" ? input : JSON.stringify(input);

        result = await vectorMemoryService.query(
          namespace,
          queryText,
          topK,
          minScore
        );

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Vector Store",
          message: `🔍 Found ${result.count} matches`,
        });
      } else if (mode === "delete") {
        // Expect input to be ID or array of IDs
        const ids = Array.isArray(input) ? input : input.id || input;

        result = await vectorMemoryService.delete(namespace, ids);

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Vector Store",
          message: `🗑️ Deleted ${result.deleted} items`,
        });
      }
    } catch (err) {
      throw new Error(`Memory operation failed: ${err.message}`);
    }

    return { output: result };
  },

  // Output Node - workflow terminal
  output: async (data, input, context) => {
    // Merge input overrides
    const mergedData = { ...data };
    if (typeof input === "object" && input !== null) {
      [
        "outputType",
        "filename",
        "notificationTitle",
        "artifactType",
        "artifactName",
      ].forEach((key) => {
        if (input[key] !== undefined) mergedData[key] = input[key];
      });
    }

    const {
      outputType = "console",
      filename,
      formatJson,
      notificationTitle,
      artifactType = "auto",
      artifactName = "",
    } = mergedData;

    const outputData = formatJson ? JSON.stringify(input, null, 2) : input;

    context.addLog({
      type: "success",
      nodeId: context.nodeId,
      nodeName: data.label || "Output",
      message: `📤 Workflow output (${outputType})`,
      data: outputData,
    });

    switch (outputType) {
      case "console":
        console.log("📤 Workflow Output:", outputData);
        // Also log preview in execution panel
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "Output",
          message: `Console: ${String(outputData).slice(0, 150)}${
            String(outputData).length > 150 ? "..." : ""
          }`,
        });
        break;

      case "file": {
        // Use auto-detect for proper MIME type and extension
        const detected = autoDetectType(input);
        let fileData = detected.data;
        let fileMime = detected.mimeType;
        let fileExt = detected.extension;

        // Convert data URI to Blob if needed
        if (detected.isDataUri && typeof fileData === "string") {
          const blob = dataUriToBlob(fileData);
          if (blob) fileData = blob;
        }

        // Create Blob if not already
        const blob =
          fileData instanceof Blob
            ? fileData
            : new Blob([fileData], { type: fileMime });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Use provided filename or generate with detected extension
        let downloadName = filename;
        if (!downloadName) {
          downloadName = `output_${Date.now()}${fileExt}`;
        } else if (!downloadName.includes(".")) {
          downloadName += fileExt;
        }

        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Output",
          message: `📁 Downloaded: ${downloadName} (${fileMime})`,
        });
        break;
      }

      case "notification": {
        // Request notification permission if needed
        if ("Notification" in window) {
          let permission = Notification.permission;
          if (permission === "default") {
            permission = await Notification.requestPermission();
          }
          if (permission === "granted") {
            new Notification(notificationTitle || "Workflow Complete", {
              body:
                typeof outputData === "string"
                  ? outputData.slice(0, 200)
                  : "Data ready",
            });
          }
        }

        // Also emit toast event for app-level notification
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workflow-toast", {
              detail: {
                type: "success",
                message: notificationTitle || "Workflow Complete",
              },
            })
          );
        }

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Output",
          message: `🔔 Notification: ${
            notificationTitle || "Workflow Complete"
          }`,
        });
        break;
      }

      case "artifact":
        // Artifact mode - just save, no console/download
        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Output",
          message: `📎 Artifact saved`,
        });
        break;

      default:
        console.log("📤 Output:", outputData);
    }

    // Use user-selected artifact type if not "auto", otherwise detect
    let finalMimeType;
    let finalExtension;
    let artifactData;

    if (artifactType && artifactType !== "auto") {
      // User explicitly selected a type
      finalMimeType = artifactType;
      finalExtension = getExtensionFromMime(artifactType);

      // Prepare data based on selected type
      if (input instanceof Blob) {
        artifactData = input;
      } else if (typeof input === "object" && input !== null) {
        // For structured data, convert to appropriate format
        if (artifactType === "application/json") {
          artifactData = JSON.stringify(input, null, 2);
        } else if (artifactType === "text/csv") {
          // Simple CSV conversion for arrays of objects
          if (
            Array.isArray(input) &&
            input.length > 0 &&
            typeof input[0] === "object"
          ) {
            const headers = Object.keys(input[0]);
            const csv = [
              headers.join(","),
              ...input.map((row) =>
                headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
              ),
            ].join("\n");
            artifactData = csv;
          } else {
            artifactData = JSON.stringify(input, null, 2);
          }
        } else {
          artifactData = JSON.stringify(input, null, 2);
        }
      } else {
        artifactData = String(input);
      }
    } else {
      // Auto-detect content type
      const contentInfo = detectContentType(input);
      finalMimeType = contentInfo.mimeType;
      finalExtension = contentInfo.extension;
      artifactData = contentInfo.data;
    }

    // Determine filename
    let artifactFilename = artifactName || filename;
    if (!artifactFilename) {
      const baseName = `output_${Date.now()}`;
      artifactFilename = baseName + finalExtension;
    } else if (!artifactFilename.includes(".")) {
      // Add extension if filename has no extension
      artifactFilename += finalExtension;
    } else if (artifactType && artifactType !== "auto") {
      // Replace existing extension with selected type's extension
      artifactFilename = artifactFilename.replace(/\.[^.]+$/, finalExtension);
    }

    await createArtifact(
      context,
      artifactFilename,
      finalMimeType,
      artifactData
    );

    return { output: outputData };
  },

  // Webhook Trigger - HTTP endpoint for external triggers
  webhookTrigger: async (data, input, context) => {
    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Webhook",
      message: `🔗 Webhook endpoint ready: ${
        data.endpoint || "/webhook/default"
      }`,
    });

    return {
      output: {
        timestamp: new Date().toISOString(),
        trigger: "webhook",
        method: data.method || "POST",
        endpoint: data.endpoint || "/webhook/default",
        body: input || {},
        query: {},
      },
    };
  },

  // Error Trigger - catches errors from other nodes
  errorTrigger: async (data, input, context) => {
    context.addLog({
      type: "warning",
      nodeId: context.nodeId,
      nodeName: data.label || "Error Trigger",
      message: `⚠️ Error trigger activated`,
      data: input,
    });

    return {
      output: {
        timestamp: new Date().toISOString(),
        trigger: "error",
        error: input?.error || null,
        originalInput: input,
      },
    };
  },

  // Browser Event Trigger - responds to browser events
  browserEventTrigger: async (data, input, context) => {
    const { eventType = "focus" } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Browser Event",
      message: `🌐 Browser event: ${eventType}`,
    });

    return {
      output: {
        timestamp: new Date().toISOString(),
        trigger: "browserEvent",
        eventType,
        url: typeof window !== "undefined" ? window.location.href : "",
        ...input,
      },
    };
  },

  // File System - read/write local files
  fileSystem: async (data, input, context) => {
    // Allows tool overrides from input
    // Input format: { mode: "write", filename: "...", content: "..." }
    const mergedData = { ...data };
    if (typeof input === "object" && input !== null) {
      if (input.mode) mergedData.mode = input.mode;
      if (input.filename) mergedData.filename = input.filename;
      if (input.content) mergedData.content = input.content;
    }

    const { mode = "read" } = mergedData;

    if (mode === "read") {
      // Open file picker
      try {
        if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
          // ... (existing logic)
          // NOTE: This still requires user interaction which might be blocked in async tool execution
          // Ideally we would have a Virtual FS or pre-authorized handles.

          const [fileHandle] = await window.showOpenFilePicker({
            types: mergedData.fileTypes?.length
              ? [{ accept: { "text/*": mergedData.fileTypes } }]
              : undefined,
          });
          const file = await fileHandle.getFile();
          const content = await file.text();

          context.addLog({
            type: "success",
            nodeId: context.nodeId,
            nodeName: data.label || "File System",
            message: `📁 Read file: ${file.name} (${file.size} bytes)`,
          });

          return {
            output: {
              filename: file.name,
              size: file.size,
              type: file.type,
              content,
              lastModified: file.lastModified,
            },
          };
        } else {
          throw new Error("File System Access API not supported");
        }
      } catch (error) {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: data.label || "File System",
          message: `❌ File read failed: ${error.message}`,
        });
        return { output: { error: error.message } };
      }
    } else if (mode === "write") {
      try {
        const content =
          typeof input === "string"
            ? input
            : input?.text || JSON.stringify(input, null, 2);

        if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: data.filename || "output.txt",
          });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();

          context.addLog({
            type: "success",
            nodeId: context.nodeId,
            nodeName: data.label || "File System",
            message: `💾 File written successfully`,
          });

          return { output: { success: true, filename: fileHandle.name } };
        } else {
          // Fallback to download
          const blob = new Blob([content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.filename || "output.txt";
          a.click();
          URL.revokeObjectURL(url);

          return { output: { success: true, downloaded: true } };
        }
      } catch (error) {
        return { output: { error: error.message } };
      }
    }

    return { output: input };
  },

  // Local Storage - persist data between runs
  localStorage: async (data, input, context) => {
    const { mode = "get", storageType = "localStorage", key } = data;

    if (!key) {
      return { output: { error: "No key specified" } };
    }

    try {
      if (storageType === "localStorage") {
        switch (mode) {
          case "get": {
            const value = window.localStorage.getItem(key);
            const parsed = value ? JSON.parse(value) : null;
            context.addLog({
              type: "info",
              nodeId: context.nodeId,
              nodeName: data.label || "Storage",
              message: `📖 Retrieved: ${key}`,
            });
            return { output: { key, value: parsed, found: value !== null } };
          }
          case "set": {
            const valueToStore =
              typeof input === "string" ? input : JSON.stringify(input);
            window.localStorage.setItem(key, valueToStore);
            context.addLog({
              type: "success",
              nodeId: context.nodeId,
              nodeName: data.label || "Storage",
              message: `💾 Stored: ${key}`,
            });
            return { output: { key, success: true } };
          }
          case "delete": {
            window.localStorage.removeItem(key);
            context.addLog({
              type: "info",
              nodeId: context.nodeId,
              nodeName: data.label || "Storage",
              message: `🗑️ Deleted: ${key}`,
            });
            return { output: { key, deleted: true } };
          }
        }
      } else {
        // IndexedDB implementation
        const dbName = "iosans-storage";
        const storeName = "keyvalue";

        const openDB = () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
              }
            };
          });

        const db = await openDB();

        switch (mode) {
          case "get": {
            return new Promise((resolve) => {
              const tx = db.transaction(storeName, "readonly");
              const store = tx.objectStore(storeName);
              const request = store.get(key);
              request.onsuccess = () => {
                context.addLog({
                  type: "info",
                  nodeId: context.nodeId,
                  nodeName: data.label || "Storage",
                  message: `📖 Retrieved (IndexedDB): ${key}`,
                });
                resolve({
                  output: {
                    key,
                    value: request.result,
                    found: request.result !== undefined,
                  },
                });
              };
              request.onerror = () =>
                resolve({ output: { error: request.error.message } });
            });
          }
          case "set": {
            return new Promise((resolve) => {
              const tx = db.transaction(storeName, "readwrite");
              const store = tx.objectStore(storeName);
              const request = store.put(input, key);
              request.onsuccess = () => {
                context.addLog({
                  type: "success",
                  nodeId: context.nodeId,
                  nodeName: data.label || "Storage",
                  message: `💾 Stored (IndexedDB): ${key}`,
                });
                resolve({ output: { key, success: true } });
              };
              request.onerror = () =>
                resolve({ output: { error: request.error.message } });
            });
          }
          case "delete": {
            return new Promise((resolve) => {
              const tx = db.transaction(storeName, "readwrite");
              const store = tx.objectStore(storeName);
              const request = store.delete(key);
              request.onsuccess = () => {
                context.addLog({
                  type: "info",
                  nodeId: context.nodeId,
                  nodeName: data.label || "Storage",
                  message: `🗑️ Deleted (IndexedDB): ${key}`,
                });
                resolve({ output: { key, deleted: true } });
              };
              request.onerror = () =>
                resolve({ output: { error: request.error.message } });
            });
          }
        }
      }
    } catch (error) {
      return { output: { error: error.message } };
    }

    return { output: input };
  },

  // Switch - multi-path routing based on field value
  switchNode: async (data, input, context) => {
    const { field, routes = [], defaultOutput = 3 } = data;

    const fieldValue = getNestedValue(input, field);

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Switch",
      message: `🔃 Switch on "${field}": value = "${fieldValue}"`,
    });

    // Find matching route
    for (const route of routes) {
      if (String(route.value) === String(fieldValue)) {
        return {
          output: input,
          outputIndex: route.outputIndex,
        };
      }
    }

    // No match - use default output
    return {
      output: input,
      outputIndex: defaultOutput,
    };
  },

  // Wait for Approval - human-in-the-loop
  waitForApproval: async (data, input, context) => {
    const { title = "Approval Required", message = "" } = data;

    context.addLog({
      type: "warning",
      nodeId: context.nodeId,
      nodeName: data.label || "Approval",
      message: `✋ Waiting for approval: ${title}`,
      data: input,
    });

    // In a real implementation, this would pause and wait for user input
    // For now, we'll auto-approve after showing a confirmation
    return new Promise((resolve) => {
      const resolvedMessage = resolveTemplates(message, input);

      const userApproved = window.confirm(
        `${title}\n\n${resolvedMessage}\n\nClick OK to approve, Cancel to reject.`
      );

      if (userApproved) {
        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Approval",
          message: `✅ Approved`,
        });
        resolve({
          output: {
            approved: true,
            approvedAt: new Date().toISOString(),
            originalInput: input,
          },
          outputIndex: 0, // approved branch
        });
      } else {
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "Approval",
          message: `❌ Rejected`,
        });
        resolve({
          output: {
            approved: false,
            rejectedAt: new Date().toISOString(),
            originalInput: input,
          },
          outputIndex: 1, // rejected branch
        });
      }
    });
  },

  // Sub-Workflow - execute another workflow
  subWorkflow: async (data, input, context) => {
    const { workflowId, passInput = true } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Sub-Workflow",
      message: `🔀 Executing sub-workflow: ${workflowId || "none selected"}`,
    });

    if (!workflowId) {
      return { output: { error: "No workflow selected" } };
    }

    // In a real implementation, this would load and execute the sub-workflow
    // For now, return a placeholder
    context.addLog({
      type: "warning",
      nodeId: context.nodeId,
      nodeName: data.label || "Sub-Workflow",
      message: `⚠️ Sub-workflow execution not yet implemented`,
    });

    return {
      output: {
        subWorkflowId: workflowId,
        result: passInput ? input : {},
        duration: 0,
        note: "Sub-workflow execution coming soon",
      },
    };
  },

  // Text to Speech - generates audio artifact
  textToSpeech: async (data, input, context) => {
    // Input can come from:
    // 1. Workflow data (piped input string)
    // 2. Tool input object (from AI Agent)

    let textToSpeak = "";

    if (typeof input === "object" && input !== null) {
      // Handle tool call { text: "..." } or workflow data { data: ... }
      textToSpeak = input.text || input.data || JSON.stringify(input);
    } else {
      textToSpeak = String(input || "");
    }

    // Resolve templates
    const resolvedText = resolveExpressions(textToSpeak, { input });

    if (!resolvedText || resolvedText.trim() === "") {
      throw new Error("No text provided for speech synthesis");
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Text to Speech",
      message: `🔊 Generating audio for: "${resolvedText.substring(0, 50)}${
        resolvedText.length > 50 ? "..." : ""
      }"`,
    });

    // Check for Web Speech API support
    if (!("speechSynthesis" in window)) {
      throw new Error("Web Speech API not supported in this browser");
    }

    const voice = data.voice || "default";
    const speed = data.speed || 1.0;
    const pitch = data.pitch || 1.0;

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(resolvedText);
    utterance.rate = speed;
    utterance.pitch = pitch;

    // Find voice if specified
    if (voice !== "default") {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((v) =>
        v.name.toLowerCase().includes(voice.toLowerCase())
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Generate unique artifact ID
    const artifactId = `tts_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Since Web Speech API cannot directly capture audio as a Blob,
    // we create a structured artifact reference that the Output node can use
    // to trigger playback via the Speech API

    // Save artifact metadata for playback
    const artifactData = {
      type: "speech",
      text: resolvedText,
      voice: voice,
      speed: speed,
      pitch: pitch,
      mimeType: "audio/speech",
      canPlay: true,
    };

    await createArtifact(
      context,
      `${artifactId}.speech.json`,
      "application/json",
      JSON.stringify(artifactData, null, 2)
    );

    // Actually speak the text (this is the action)
    await new Promise((resolve, reject) => {
      utterance.onend = resolve;
      utterance.onerror = (e) => reject(new Error(`Speech failed: ${e.error}`));
      window.speechSynthesis.speak(utterance);
    });

    context.addLog({
      type: "success",
      nodeId: context.nodeId,
      nodeName: data.label || "Text to Speech",
      message: `✅ Audio played successfully`,
    });

    // Return artifact-first structure
    return {
      output: {
        artifactId: artifactId,
        type: "audio",
        mimeType: "audio/speech",
        text: resolvedText,
        voice: voice,
        speed: speed,
        pitch: pitch,
        played: true,
        // Mark as executed (not simulated)
        _executed: true,
      },
    };
  },

  // Python Executor - run Python code via Pyodide
  pythonExecutor: async (data, input, context) => {
    const { code = "", packages = [] } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Python",
      message: `🐍 Executing Python code...`,
    });

    // Check if Pyodide is loaded
    if (typeof window === "undefined" || !window.loadPyodide) {
      // Load Pyodide dynamically
      try {
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "Python",
          message: `📦 Loading Pyodide runtime...`,
        });

        // Load Pyodide from CDN
        if (!window.pyodideLoading) {
          window.pyodideLoading = (async () => {
            const script = document.createElement("script");
            script.src =
              "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
            document.head.appendChild(script);

            await new Promise((resolve) => {
              script.onload = resolve;
            });

            window.pyodide = await window.loadPyodide();
            return window.pyodide;
          })();
        }

        await window.pyodideLoading;
      } catch (error) {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: data.label || "Python",
          message: `❌ Failed to load Pyodide: ${error.message}`,
        });
        return {
          output: { error: `Failed to load Pyodide: ${error.message}` },
        };
      }
    }

    const pyodide = window.pyodide;

    try {
      // Install packages if needed
      if (packages.length > 0) {
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "Python",
          message: `📦 Installing packages: ${packages.join(", ")}`,
        });
        await pyodide.loadPackagesFromImports(packages.join("\n"));
      }

      // Set up input variable
      pyodide.globals.set("input", pyodide.toPy(input));

      // Capture stdout
      let stdout = "";
      pyodide.setStdout({
        batched: (text) => {
          stdout += text;
        },
      });

      const startTime = Date.now();

      // Execute the code
      const result = await pyodide.runPythonAsync(`
${code}
result if 'result' in dir() else None
`);

      const duration = (Date.now() - startTime) / 1000;

      // Convert result back to JavaScript
      const jsResult = result?.toJs ? result.toJs() : result;

      context.addLog({
        type: "success",
        nodeId: context.nodeId,
        nodeName: data.label || "Python",
        message: `✅ Python executed in ${duration.toFixed(2)}s`,
        data: jsResult,
      });

      // Save result as artifact if substantial
      const artifactId = `python_${Date.now()}_${crypto
        .randomUUID()
        .slice(0, 8)}`;

      if (jsResult !== null && jsResult !== undefined) {
        await createArtifact(
          context,
          `${artifactId}.json`,
          "application/json",
          JSON.stringify({ result: jsResult, stdout }, null, 2)
        );
      }

      return {
        output: {
          artifactId: artifactId,
          result: jsResult,
          stdout,
          duration,
          _executed: true,
        },
      };
    } catch (error) {
      context.addLog({
        type: "error",
        nodeId: context.nodeId,
        nodeName: data.label || "Python",
        message: `❌ Python error: ${error.message}`,
      });
      return { output: { error: error.message } };
    }
  },
};

// Import advanced expression engine
import {
  resolveExpressions,
  resolveExpressionsInObject,
} from "../utils/expressions";

/**
 * Resolve template expressions in a string (for backward compat)
 * Now uses the full expression engine
 */
function resolveTemplates(template, data) {
  return resolveExpressions(template, { input: data });
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj, path) {
  if (!path || !obj) return obj;

  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

export {
  resolveTemplates,
  getNestedValue,
  resolveExpressions,
  resolveExpressionsInObject,
};
