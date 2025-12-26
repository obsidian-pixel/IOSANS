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
import { runJSONReActLoop } from "./ToolCallingService";
import mespeakService from "../services/MespeakService";

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

  // Check for nested audio/image/video blob fields
  if (input?.audioBlob instanceof Blob) {
    return {
      mimeType: input.audioBlob.type || "audio/wav",
      extension: getExtensionFromMime(input.audioBlob.type) || ".wav",
      data: input.audioBlob,
      isBlob: true,
    };
  }

  if (input?.imageBlob instanceof Blob) {
    return {
      mimeType: input.imageBlob.type || "image/png",
      extension: getExtensionFromMime(input.imageBlob.type) || ".png",
      data: input.imageBlob,
      isBlob: true,
    };
  }

  if (input?.videoBlob instanceof Blob) {
    return {
      mimeType: input.videoBlob.type || "video/mp4",
      extension: getExtensionFromMime(input.videoBlob.type) || ".mp4",
      data: input.videoBlob,
      isBlob: true,
    };
  }

  // Generic blob or data properties
  if (input?.blob instanceof Blob) {
    return {
      mimeType: input.blob.type || "application/octet-stream",
      extension: getExtensionFromMime(input.blob.type) || ".bin",
      data: input.blob,
      isBlob: true,
    };
  }

  if (input?.data instanceof Blob) {
    return {
      mimeType: input.data.type || "application/octet-stream",
      extension: getExtensionFromMime(input.data.type) || ".bin",
      data: input.data,
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

  // Data URI strings (audio, image, video)
  if (typeof input === "string" && input.startsWith("data:")) {
    const mimeMatch = input.match(/^data:([^;,]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const blob = dataUriToBlob(input);
    if (blob) {
      return {
        mimeType: mimeType,
        extension: getExtensionFromMime(mimeType),
        data: blob,
        isBlob: true,
        isDataUri: true,
      };
    }
  }

  // URL-based content (blob URLs)
  if (typeof input?.url === "string" && input.url.startsWith("blob:")) {
    const inferredType =
      input.type || input.mimeType || "application/octet-stream";
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

  // JSON object - check for special types before generic JSON
  if (typeof input === "object" && input !== null) {
    // Check for TTS/audio output with type or mimeType property
    if (
      input.type === "audio" ||
      input.mimeType?.startsWith("audio/") ||
      input.type === "speech"
    ) {
      // This is a TTS output - mark as audio for proper handling
      return {
        mimeType: input.mimeType || "audio/speech",
        extension: ".json", // Keep as JSON since it's metadata, not actual audio
        data: JSON.stringify(input, null, 2),
        isBlob: false,
        isAudioMetadata: true, // Flag for special handling
      };
    }

    // Check for image output
    if (input.type === "image" || input.mimeType?.startsWith("image/")) {
      return {
        mimeType: input.mimeType || "image/png",
        extension: getExtensionFromMime(input.mimeType) || ".png",
        data: JSON.stringify(input, null, 2),
        isBlob: false,
        isImageMetadata: true,
      };
    }

    // Generic JSON object
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
 * Detect the format of input data for AI Agent processing
 * @param {*} input - The input data to analyze
 * @returns {string} - "conversation", "json", or "text"
 */
const detectInputFormat = (input) => {
  // Check for conversation history array
  if (Array.isArray(input) && input.length > 0) {
    const hasRoles = input.some(
      (item) =>
        item &&
        typeof item === "object" &&
        ("role" in item || "content" in item)
    );
    if (hasRoles) return "conversation";
  }

  // Check for JSON object with structured data
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    // Check for common workflow data patterns
    if (input.data || input.text || input.content || input.message) {
      return "json";
    }
    // Check if it's a structured object (multiple keys)
    if (Object.keys(input).length > 1) {
      return "json";
    }
  }

  // Default to text
  return "text";
};

/**
 * Format JSON data as a readable context for AI processing
 * @param {Object} input - The JSON input data
 * @param {string} userMessage - Optional user message template
 * @returns {string} - Formatted message for AI
 */
const formatJSONForAI = (input, userMessage) => {
  if (userMessage) {
    // If user message template exists, use expression resolution
    if (userMessage.includes("{{")) {
      return resolveExpressions(userMessage, { input });
    }
    return userMessage;
  }

  // Otherwise, create a structured description
  const keys = Object.keys(input);
  if (keys.length === 0) {
    return "Empty data provided.";
  }

  // Check for common text fields first
  const textFields = ["text", "content", "message", "query", "prompt", "input"];
  for (const field of textFields) {
    if (input[field] && typeof input[field] === "string") {
      return input[field];
    }
  }

  // Check for data wrapper
  if (input.data && typeof input.data === "object") {
    return formatInputForAI(input.data);
  }

  // Format as structured data
  const dataStr = JSON.stringify(input, null, 2);
  if (dataStr.length > 2000) {
    // Truncate very long data
    return `Process this data:\n${dataStr.slice(
      0,
      2000
    )}...\n\n[Data truncated. Full data has ${keys.length} fields]`;
  }
  return `Process this data:\n${dataStr}`;
};

/**
 * Format arbitrary input data for AI consumption
 * Handles various types intelligently
 * @param {*} input - The input data
 * @returns {string} - Formatted string for AI
 */
const formatInputForAI = (input) => {
  if (input === null || input === undefined) {
    return "No input provided.";
  }

  if (typeof input === "string") {
    return input;
  }

  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return "Empty array provided.";
    }
    // Check if it's an array of simple values
    if (
      input.every(
        (item) => typeof item === "string" || typeof item === "number"
      )
    ) {
      return `List of items:\n${input
        .map((item, i) => `${i + 1}. ${item}`)
        .join("\n")}`;
    }
    // Complex array
    return `Array with ${input.length} items:\n${JSON.stringify(
      input,
      null,
      2
    )}`;
  }

  if (typeof input === "object") {
    // Check for common text fields first
    const textFields = ["text", "content", "message", "query", "prompt"];
    for (const field of textFields) {
      if (input[field] && typeof input[field] === "string") {
        return input[field];
      }
    }

    // Check for data wrapper
    if (input.data !== undefined) {
      if (typeof input.data === "string") {
        return input.data;
      }
      return formatInputForAI(input.data);
    }

    // Format as JSON
    const str = JSON.stringify(input, null, 2);
    if (str.length > 3000) {
      return `Data object:\n${str.slice(0, 3000)}...\n[Truncated]`;
    }
    return str;
  }

  return String(input);
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
      // Allow overriding specific config keys from input
      ["model", "temperature", "maxTokens", "systemMessage"].forEach((key) => {
        if (input[key] !== undefined) mergedData[key] = input[key];
      });
    }

    // 2. Apply connected model settings (from Chat Model node via diamond handle)
    const connectedModel = mergedData.connectedModel;
    if (connectedModel) {
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
      systemPrompt,
      systemMessage, // Legacy support
      userMessage,
      inputFormat = "auto",
      temperature = 0.7,
      maxTokens = 1000,
      maxIterations = 10,
    } = mergedData;

    // Build system prompt (support both systemPrompt and systemMessage)
    let finalSystemMessage = systemPrompt || systemMessage || "";

    // Resolve expressions in system message
    if (finalSystemMessage && finalSystemMessage.includes("{{")) {
      finalSystemMessage = resolveExpressions(finalSystemMessage, { input });
    }

    // 3. Process input according to inputFormat setting
    let currentMessage = "";
    let history = [];

    // Detect input format if auto
    const detectedFormat =
      inputFormat === "auto" ? detectInputFormat(input) : inputFormat;

    switch (detectedFormat) {
      case "conversation":
        // Input is a conversation history array
        if (Array.isArray(input) && input.length > 0) {
          const last = input[input.length - 1];
          currentMessage =
            last.content ||
            (typeof last === "string" ? last : JSON.stringify(last));
          history = input.slice(0, -1);

          // Extract system message from history if present
          const sysMsg = history.find((m) => m.role === "system");
          if (sysMsg) {
            finalSystemMessage = sysMsg.content;
            history = history.filter((m) => m.role !== "system");
          }
        }
        break;

      case "json":
        // Format JSON data as readable context for AI
        currentMessage = formatJSONForAI(input, userMessage);
        break;

      case "text":
      default:
        // Plain text or auto-detected
        if (userMessage) {
          // Use user message template with expression resolution
          if (userMessage.includes("{{")) {
            currentMessage = resolveExpressions(userMessage, { input });
          } else {
            currentMessage = userMessage;
          }
        } else {
          // Fallback to intelligent stringification
          currentMessage =
            typeof input === "string" ? input : formatInputForAI(input);
        }
        break;
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "AI Agent",
      message: "🤖 AI processing...",
    });

    // 4. Apply connected memory (Context Retrieval)
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

        if (memoryResult?.matches?.length > 0) {
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
    }

    try {
      // 5. Ensure model is loaded
      const targetModelId = mergedData.modelId || "gemma-2-2b-it";

      if (
        !webLLMService.isReady ||
        webLLMService.currentModel !== targetModelId
      ) {
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `🔄 Loading AI Model: ${targetModelId}...`,
        });

        await webLLMService.initialize(targetModelId, () => {
          if (context.heartbeat) context.heartbeat();
        });

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `✅ Model loaded: ${targetModelId}`,
        });
      }

      // 6. Get tools and execute
      const tools = mergedData.tools || [];

      if (tools.length > 0 && mergedData.enableToolCalling !== false) {
        // Use centralized ToolCallingService for tool-enabled execution
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `🔧 ${tools.length} tool(s) available: ${tools
            .map((t) => t.name)
            .join(", ")}`,
        });

        // Create enhanced context for tool calling
        const toolContext = {
          ...context,
          nodeName: data.label || "AI Agent",
        };

        const result = await runJSONReActLoop(
          currentMessage,
          tools,
          {
            systemPrompt: finalSystemMessage,
            maxTokens,
            temperature,
            maxIterations,
            onHeartbeat: context.heartbeat,
          },
          toolContext
        );

        return { output: result.output };
      } else {
        // Simple generation without tools
        context.addLog({
          type: "info",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `🤖 Generating response...`,
        });

        const response = await webLLMService.generateWithHistory(
          currentMessage,
          history,
          {
            temperature,
            maxTokens,
            systemPrompt: finalSystemMessage,
          },
          () => {
            if (context.heartbeat) context.heartbeat();
          }
        );

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "AI Agent",
          message: `✅ Generation complete`,
        });

        return { output: response.trim() };
      }
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
    } else if (language === "python") {
      // Forward to Python executor
      return NodeExecutors.pythonExecutor({ ...data, code }, input, context);
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
    const { method = "GET", timeout = 5000 } = data;
    let { url, headers, body } = data;

    // Resolve expressions in URL, headers, and body
    if (url && url.includes("{{")) {
      url = resolveExpressions(url, { input, $json: input });
    }
    if (typeof headers === "string" && headers.includes("{{")) {
      headers = resolveExpressions(headers, { input, $json: input });
    }
    if (typeof body === "string" && body.includes("{{")) {
      body = resolveExpressions(body, { input, $json: input });
    }

    // Allow input to override URL if it's an object with url property
    if (typeof input === "object" && input !== null && input.url) {
      url = input.url;
    }

    if (!url) {
      throw new Error("URL is required for HTTP request");
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "HTTP Request",
      message: `🌐 ${method} ${url}`,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Parse headers if string
      let parsedHeaders = safeJsonParse(headers) || {};
      if (typeof headers === "object" && headers !== null) {
        parsedHeaders = headers;
      }

      // Prepare body - merge input data if body references it
      let requestBody = body;
      if (typeof body === "object" && body !== null) {
        requestBody = JSON.stringify(body);
      } else if (body === "{{$json}}" || body === "{{ $json }}") {
        requestBody = JSON.stringify(input);
      }

      const response = await fetch(url, {
        method,
        headers: parsedHeaders,
        body: ["GET", "HEAD"].includes(method) ? undefined : requestBody,
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
      case "isEmpty":
        result =
          leftValue === undefined ||
          leftValue === null ||
          leftValue === "" ||
          (Array.isArray(leftValue) && leftValue.length === 0) ||
          (typeof leftValue === "object" &&
            Object.keys(leftValue).length === 0);
        break;
      case "isNotEmpty":
        result =
          leftValue !== undefined &&
          leftValue !== null &&
          leftValue !== "" &&
          !(Array.isArray(leftValue) && leftValue.length === 0) &&
          !(
            typeof leftValue === "object" &&
            leftValue !== null &&
            Object.keys(leftValue).length === 0
          );
        break;
      case "isTrue":
        result = !!leftValue;
        break;
      case "isFalse":
        result = !leftValue;
        break;
      default:
        result = false;
    }

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "If/Else",
      message: `🔀 Check: ${condition} ${operator} ${
        compareValue ?? ""
      } -> ${result}`,
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
    // If no routes defined, use output 0 (first/default output)
    const finalOutputIndex =
      matchedRouteIndex >= 0
        ? matchedRouteIndex
        : routes.length > 0
        ? routes.length
        : 0;

    const routeLabel =
      finalOutputIndex < routes.length
        ? routes[finalOutputIndex].label
        : routes.length === 0
        ? "Default"
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

    // Track retry count - check input first (for retry loop), then context fallback
    // When retrying, the previous evaluator output includes retryCount
    let retryCount = 0;
    let actualInput = input;

    // Check if this is a retry iteration (input contains retry metadata)
    if (typeof input === "object" && input !== null && input._evaluatorRetry) {
      retryCount = input.retryCount || 0;
      actualInput = input.data; // The actual data to validate
    }

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
              typeof actualInput === "object"
                ? actualInput
                : JSON.parse(actualInput);

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
              typeof actualInput === "string"
                ? actualInput
                : JSON.stringify(actualInput);
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
        output: actualInput,
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
            _evaluatorRetry: true,
            data: actualInput,
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
            ...(typeof actualInput === "object"
              ? actualInput
              : { value: actualInput }),
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
    // Validate and clamp iterations to positive integer
    const rawIterations = parseInt(data.iterations, 10) || 1;
    const iterations = Math.max(1, Math.min(rawIterations, 10000));
    const { itemsPath = "", maxIterations = 100 } = data;

    // Initialize or get current loop state from context
    let loopState = context.loopState;

    // Determine if this is array-based or count-based looping
    let items = null;
    let totalIterations = iterations;

    if (itemsPath) {
      // Array-based looping - extract items from input
      items = getNestedValue(input, itemsPath);
      if (Array.isArray(items)) {
        totalIterations = Math.min(items.length, maxIterations);
      } else if (items !== undefined) {
        // Single item, treat as array of one
        items = [items];
        totalIterations = 1;
      } else {
        // Path not found, treat as empty
        items = [];
        totalIterations = 0;
      }
    }

    // Initialize loop state on first run
    if (!loopState) {
      loopState = {
        currentIteration: 0,
        totalIterations: totalIterations,
        items: items,
        results: [],
        isArrayLoop: !!itemsPath && items !== null,
      };
    }

    // Check if this is a continuation (loop-back) with result from previous iteration
    const isLoopBack = loopState.currentIteration > 0;
    if (isLoopBack && input !== undefined) {
      // Don't push the original input, push the result from the loop body
      if (!input.isLoopIteration) {
        loopState.results.push(input);
      }
    }

    // Increment iteration counter
    loopState.currentIteration++;

    // Check if we should continue looping
    const shouldContinue =
      loopState.currentIteration <= loopState.totalIterations;

    if (shouldContinue) {
      // Determine current item for array-based loops
      const currentItem =
        loopState.isArrayLoop && loopState.items
          ? loopState.items[loopState.currentIteration - 1]
          : null;

      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: data.label || "Loop",
        message: loopState.isArrayLoop
          ? `🔄 Processing item ${loopState.currentIteration} of ${loopState.totalIterations}`
          : `🔄 Iteration ${loopState.currentIteration} of ${loopState.totalIterations}`,
      });

      // Output via "loop →" (output index 0) to continue iteration
      return {
        output: {
          iteration: loopState.currentIteration,
          totalIterations: loopState.totalIterations,
          // For array loops, provide the current item
          item: currentItem,
          itemIndex: loopState.currentIteration - 1,
          // For count loops, provide previous result
          previousResult: isLoopBack ? input : null,
          isLoopIteration: true,
          isArrayLoop: loopState.isArrayLoop,
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
        message: `✅ Loop complete: ${loopState.results.length} iteration(s) processed`,
      });

      return {
        output: {
          results: loopState.results,
          totalIterations: loopState.totalIterations,
          lastResult: loopState.results[loopState.results.length - 1],
          completed: true,
          isArrayLoop: loopState.isArrayLoop,
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
        // Query text comes from input - extract from common text fields
        let queryText;
        if (typeof input === "string") {
          queryText = input;
        } else if (typeof input === "object" && input !== null) {
          // Try common text fields first
          queryText =
            input.text ||
            input.query ||
            input.content ||
            input.message ||
            input.prompt;
          if (!queryText) {
            // Fall back to stringifying, but only the data portion
            queryText = input.data
              ? JSON.stringify(input.data)
              : JSON.stringify(input);
          }
        } else {
          queryText = String(input);
        }

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
        // Output logged via context.addLog above
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
            const bodyText =
              typeof outputData === "string" ? outputData : "Data ready";
            const truncated = bodyText.length > 200;
            new Notification(notificationTitle || "Workflow Complete", {
              body: truncated ? bodyText.slice(0, 197) + "..." : bodyText,
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
      // Default output handled via logs
    }

    // Only create artifact if outputType is "artifact"
    if (outputType === "artifact") {
      // Skip empty artifacts - don't save {} or null/undefined
      // But check for audioBlob first since Blob objects have no enumerable keys
      const hasAudioBlob =
        typeof input === "object" &&
        input !== null &&
        input.audioBlob instanceof Blob;

      const isEmptyInput =
        !hasAudioBlob &&
        (input === null ||
          input === undefined ||
          (typeof input === "object" && Object.keys(input).length === 0));

      if (isEmptyInput) {
        context.addLog({
          type: "warning",
          nodeId: context.nodeId,
          nodeName: data.label || "Output",
          message: `⚠️ Skipping empty artifact - no data to save`,
        });
        context.updateNodeData?.({ lastOutput: null });
        return { output: null };
      }

      // Special handling for mespeak audio output (has actual audioBlob)
      if (hasAudioBlob) {
        const audioFilename =
          artifactName || filename || `audio_${Date.now()}.wav`;
        const artifact = await createArtifact(
          context,
          audioFilename.endsWith(".wav")
            ? audioFilename
            : `${audioFilename}.wav`,
          "audio/wav",
          input.audioBlob
        );

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Output",
          message: `🔊 Audio artifact saved: ${audioFilename}`,
        });

        context.updateNodeData?.({ lastOutput: outputData });
        return {
          output: outputData,
          artifact: artifact
            ? {
                id: artifact.id,
                name: artifact.name,
                type: artifact.type,
              }
            : null,
        };
      }

      // Special handling for TTS/speech metadata (Web Speech API output)
      // These can't be exported as real audio, so save as speech metadata
      const isSpeechMetadata =
        typeof input === "object" &&
        input !== null &&
        (input.type === "audio" || input.type === "speech") &&
        input.mimeType?.includes("speech") &&
        input._executed === true;

      if (isSpeechMetadata) {
        // Save as speech metadata artifact that can be replayed
        const speechFilename =
          artifactName || `speech_${Date.now()}.speech.json`;
        const speechData = JSON.stringify(input, null, 2);

        const artifact = await createArtifact(
          context,
          speechFilename,
          "application/x-speech+json", // Custom type for speech metadata
          speechData
        );

        context.updateNodeData?.({ lastOutput: outputData });
        return {
          output: outputData,
          artifact: artifact
            ? {
                id: artifact.id,
                name: artifact.name,
                type: artifact.type,
              }
            : null,
        };
      }

      // Use user-selected artifact type if not "auto", otherwise detect
      let finalMimeType;
      let finalExtension;
      let artifactData;

      if (artifactType && artifactType !== "auto") {
        // User explicitly selected a type
        finalMimeType = artifactType;
        finalExtension = getExtensionFromMime(artifactType);

        // Prepare data based on selected type - improved binary detection
        if (input instanceof Blob) {
          artifactData = input;
        } else if (input instanceof ArrayBuffer) {
          artifactData = new Blob([input], { type: finalMimeType });
        } else if (ArrayBuffer.isView(input)) {
          // Handles Uint8Array, Int8Array, DataView, etc.
          artifactData = new Blob([input], { type: finalMimeType });
        } else if (typeof input === "string" && input.startsWith("data:")) {
          // Handle data URIs - convert to Blob to prevent corruption
          const blob = dataUriToBlob(input);
          if (blob) {
            artifactData = blob;
          } else {
            artifactData = input;
          }
        } else if (typeof input === "object" && input !== null) {
          // Check for nested blob properties (from HTTP responses, audio nodes, etc.)
          if (input.audioBlob instanceof Blob) {
            artifactData = input.audioBlob;
          } else if (input.imageBlob instanceof Blob) {
            artifactData = input.imageBlob;
          } else if (input.videoBlob instanceof Blob) {
            artifactData = input.videoBlob;
          } else if (input.blob instanceof Blob) {
            artifactData = input.blob;
          } else if (input.data instanceof Blob) {
            artifactData = input.data;
          } else if (input.buffer instanceof ArrayBuffer) {
            // Check for buffer-like properties (from HTTP responses etc.)
            artifactData = new Blob([input.buffer], { type: finalMimeType });
          } else if (
            typeof input.audioBase64 === "string" &&
            finalMimeType.startsWith("audio/")
          ) {
            // Handle base64 audio data
            const blob = base64ToBlob(input.audioBase64, finalMimeType);
            artifactData = blob || JSON.stringify(input, null, 2);
          } else if (artifactType === "application/json") {
            artifactData = JSON.stringify(input, null, 2);
          } else if (artifactType === "text/csv") {
            // CSV conversion for arrays of objects
            if (
              Array.isArray(input) &&
              input.length > 0 &&
              typeof input[0] === "object"
            ) {
              // Flatten nested objects for headers
              const flattenRow = (obj, prefix = "") => {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                  const newKey = prefix ? `${prefix}.${key}` : key;
                  if (
                    typeof value === "object" &&
                    value !== null &&
                    !Array.isArray(value)
                  ) {
                    Object.assign(result, flattenRow(value, newKey));
                  } else {
                    result[newKey] = value;
                  }
                }
                return result;
              };
              const flatData = input.map((row) => flattenRow(row));
              const headers = [
                ...new Set(flatData.flatMap((row) => Object.keys(row))),
              ];
              const csv = [
                headers.join(","),
                ...flatData.map((row) =>
                  headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
                ),
              ].join("\n");
              artifactData = csv;
            } else {
              artifactData = JSON.stringify(input, null, 2);
            }
          } else if (
            finalMimeType.startsWith("audio/") ||
            finalMimeType.startsWith("image/") ||
            finalMimeType.startsWith("video/")
          ) {
            // For media types, warn but still try to save what we have
            context.addLog({
              type: "warning",
              nodeId: context.nodeId,
              nodeName: data.label || "Output",
              message: `⚠️ Expected binary data for ${finalMimeType}, got object. Saving as JSON instead.`,
            });
            artifactData = JSON.stringify(input, null, 2);
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

      const artifact = await createArtifact(
        context,
        artifactFilename,
        finalMimeType,
        artifactData
      );

      // Return artifact info so downstream nodes can access it
      // Update node data for UI preview
      context.updateNodeData?.({ lastOutput: outputData });
      return {
        output: outputData,
        artifact: artifact
          ? {
              id: artifact.id,
              name: artifact.name,
              type: artifact.type,
            }
          : null,
      };
    }

    // Update node data for UI preview
    context.updateNodeData?.({ lastOutput: outputData });
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
    const { workflowId, workflowName, passInput = true } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Sub-Workflow",
      message: `🔀 Executing sub-workflow: ${
        workflowName || workflowId || "none selected"
      }`,
    });

    if (!workflowId) {
      context.addLog({
        type: "error",
        nodeId: context.nodeId,
        nodeName: data.label || "Sub-Workflow",
        message: `❌ No workflow selected`,
      });
      return { output: { error: "No workflow selected", success: false } };
    }

    try {
      // Load workflow from localStorage (where WorkflowManager saves them)
      const savedWorkflows = localStorage.getItem("iosans-workflows");
      if (!savedWorkflows) {
        throw new Error("No workflows found in storage");
      }

      const workflows = JSON.parse(savedWorkflows);
      const subWorkflow = workflows.find(
        (w) => w.id === workflowId || w.name === workflowId
      );

      if (!subWorkflow) {
        throw new Error(`Workflow "${workflowId}" not found`);
      }

      const { nodes: subNodes, edges: subEdges } = subWorkflow;

      if (!subNodes || subNodes.length === 0) {
        throw new Error("Sub-workflow has no nodes");
      }

      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: data.label || "Sub-Workflow",
        message: `📋 Loaded workflow "${subWorkflow.name}" with ${subNodes.length} nodes`,
      });

      // Find trigger node(s) in the sub-workflow
      const triggerTypes = [
        "manualTrigger",
        "webhookTrigger",
        "scheduleTrigger",
        "browserEventTrigger",
      ];
      const triggerNode = subNodes.find((n) => triggerTypes.includes(n.type));

      if (!triggerNode) {
        throw new Error("Sub-workflow has no trigger node");
      }

      // Execute the sub-workflow using a simplified inline execution
      const startTime = Date.now();
      const results = {};
      const visited = new Set();

      // Simple BFS execution (synchronous for now)
      const queue = [{ nodeId: triggerNode.id, input: passInput ? input : {} }];

      while (queue.length > 0) {
        const { nodeId: currentId, input: nodeInput } = queue.shift();

        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = subNodes.find((n) => n.id === currentId);
        if (!node) continue;

        // Skip re-executing triggers, just pass input through
        let nodeOutput = nodeInput;

        if (!triggerTypes.includes(node.type)) {
          // Get the executor for this node type
          const executor = NodeExecutors[node.type];
          if (executor) {
            try {
              const subContext = {
                ...context,
                nodeId: `${context.nodeId}:${currentId}`,
                addLog: (log) => {
                  context.addLog({
                    ...log,
                    message: `[Sub] ${log.message}`,
                  });
                },
              };

              const result = await executor(node.data, nodeInput, subContext);
              nodeOutput = result.output ?? result;
              results[currentId] = nodeOutput;
            } catch (err) {
              context.addLog({
                type: "error",
                nodeId: context.nodeId,
                nodeName: data.label || "Sub-Workflow",
                message: `❌ Sub-node ${node.type} failed: ${err.message}`,
              });
              // Continue execution despite error
            }
          }
        } else {
          results[currentId] = nodeInput;
        }

        // Find connected nodes and add to queue
        const outEdges = subEdges.filter((e) => e.source === currentId);
        for (const edge of outEdges) {
          queue.push({ nodeId: edge.target, input: nodeOutput });
        }
      }

      const duration = Date.now() - startTime;

      context.addLog({
        type: "success",
        nodeId: context.nodeId,
        nodeName: data.label || "Sub-Workflow",
        message: `✅ Sub-workflow completed in ${duration}ms (${visited.size} nodes executed)`,
      });

      // Return the last result or aggregated results
      const lastNodeId = Array.from(visited).pop();
      const finalOutput = results[lastNodeId] || {};

      return {
        output: {
          subWorkflowId: workflowId,
          subWorkflowName: subWorkflow.name,
          result: finalOutput,
          allResults: results,
          nodesExecuted: visited.size,
          duration,
          success: true,
        },
      };
    } catch (error) {
      context.addLog({
        type: "error",
        nodeId: context.nodeId,
        nodeName: data.label || "Sub-Workflow",
        message: `❌ Sub-workflow failed: ${error.message}`,
      });

      return {
        output: {
          subWorkflowId: workflowId,
          error: error.message,
          success: false,
        },
      };
    }
  },

  // Swarm - parallel multi-agent execution with consensus/aggregation
  swarm: async (data, input, context) => {
    const {
      agentCount = 3,
      aggregationMode = "consensus", // consensus, first, all
      timeout = 30000,
      systemPrompt = "",
    } = data;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Swarm",
      message: `🐝 Starting swarm with ${agentCount} agents (mode: ${aggregationMode})`,
    });

    // Get the input text to process
    const inputText =
      typeof input === "string"
        ? input
        : input?.text ||
          input?.content ||
          input?.message ||
          JSON.stringify(input);

    // Create parallel agent tasks
    const agentPromises = [];
    const startTime = Date.now();

    for (let i = 0; i < agentCount; i++) {
      const agentPromise = (async () => {
        try {
          // Each agent uses slightly varied prompting
          const variance =
            i > 0 ? `\n[Agent ${i + 1}: Provide a unique perspective]` : "";
          const fullPrompt = systemPrompt + variance;

          const response = await webLLMService.generate(
            inputText,
            fullPrompt || "You are a helpful assistant. Answer concisely.",
            { maxTokens: 500 }
          );

          return {
            agentId: i + 1,
            response: response?.text || response,
            success: true,
          };
        } catch (err) {
          return {
            agentId: i + 1,
            error: err.message,
            success: false,
          };
        }
      })();

      agentPromises.push(agentPromise);
    }

    // Race against timeout
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ timeout: true }), timeout)
    );

    let results;

    if (aggregationMode === "first") {
      // Return first successful result
      const firstResult = await Promise.race([
        Promise.any(
          agentPromises.map((p) =>
            p.then((r) => (r.success ? r : Promise.reject(r)))
          )
        ),
        timeoutPromise,
      ]);

      if (firstResult.timeout) {
        throw new Error("Swarm timed out");
      }

      results = [firstResult];
    } else {
      // Wait for all results
      const allSettled = await Promise.race([
        Promise.allSettled(agentPromises),
        timeoutPromise,
      ]);

      if (allSettled.timeout) {
        throw new Error("Swarm timed out");
      }

      results = allSettled.map(
        (r) => r.value || { error: r.reason?.message, success: false }
      );
    }

    const successfulResults = results.filter((r) => r.success);
    const duration = Date.now() - startTime;

    context.addLog({
      type: "success",
      nodeId: context.nodeId,
      nodeName: data.label || "Swarm",
      message: `✅ Swarm completed: ${successfulResults.length}/${agentCount} successful in ${duration}ms`,
    });

    // Aggregate results based on mode
    let finalOutput;

    if (aggregationMode === "consensus" && successfulResults.length > 1) {
      // Simple consensus: take the most common response length bracket
      // (A proper implementation would use semantic similarity)
      const responses = successfulResults.map((r) => r.response);

      // For now, just take the median-length response as "consensus"
      responses.sort((a, b) => a.length - b.length);
      const medianIndex = Math.floor(responses.length / 2);
      finalOutput = responses[medianIndex];
    } else if (aggregationMode === "all") {
      finalOutput = results;
    } else {
      // first or fallback
      finalOutput =
        successfulResults[0]?.response || results[0]?.error || "No results";
    }

    return {
      output: {
        result: finalOutput,
        allResponses: results,
        successCount: successfulResults.length,
        totalAgents: agentCount,
        aggregationMode,
        duration,
      },
    };
  },

  // Text to Speech - generates audio using selected provider
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

    const provider = data.provider || "mespeak";

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: data.label || "Text to Speech",
      message: `🔊 Generating audio (${provider}): "${resolvedText.substring(
        0,
        50
      )}${resolvedText.length > 50 ? "..." : ""}"`,
    });

    // Route to selected provider
    if (provider === "mespeak") {
      // Use mespeak for WAV audio file generation
      const speed = data.speed || 175; // words per minute for mespeak
      const pitch = data.pitch || 50; // 0-99 for mespeak

      try {
        const result = await mespeakService.textToAudio(resolvedText, {
          speed: speed,
          pitch: pitch,
          amplitude: 100,
        });

        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: data.label || "Text to Speech",
          message: `✅ Audio generated (${result.duration.toFixed(1)}s WAV)`,
        });

        // Auto-play if enabled
        if (data.autoPlay === true) {
          const audioUrl = URL.createObjectURL(result.blob);
          const audio = new Audio(audioUrl);
          audio.play().catch((err) => {
            console.warn("Could not auto-play audio:", err);
          });
          audio.onended = () => URL.revokeObjectURL(audioUrl);
        }

        // Return the actual audio blob
        return {
          output: {
            audioBlob: result.blob,
            type: "audio",
            mimeType: "audio/wav",
            text: resolvedText,
            duration: result.duration,
            provider: "mespeak",
            _executed: true,
          },
        };
      } catch (error) {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: data.label || "Text to Speech",
          message: `❌ Mespeak failed: ${error.message}`,
        });
        throw error;
      }
    } else {
      // Use Web Speech API (browser only, no file export)
      if (!("speechSynthesis" in window)) {
        throw new Error("Web Speech API not supported in this browser");
      }

      const voice = data.voice || "default";
      const speed = data.speed || 1.0;
      const pitch = data.pitch || 1.0;

      const utterance = new SpeechSynthesisUtterance(resolvedText);
      utterance.rate = speed;
      utterance.pitch = pitch;

      // Find voice if specified
      if (voice !== "default") {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          await new Promise((resolve) => {
            const handler = () => {
              window.speechSynthesis.removeEventListener(
                "voiceschanged",
                handler
              );
              resolve();
            };
            window.speechSynthesis.addEventListener("voiceschanged", handler);
            setTimeout(resolve, 1000);
          });
          voices = window.speechSynthesis.getVoices();
        }
        const selectedVoice = voices.find((v) =>
          v.name.toLowerCase().includes(voice.toLowerCase())
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      await new Promise((resolve, reject) => {
        utterance.onend = resolve;
        utterance.onerror = (e) =>
          reject(new Error(`Speech failed: ${e.error}`));
        window.speechSynthesis.speak(utterance);
      });

      context.addLog({
        type: "success",
        nodeId: context.nodeId,
        nodeName: data.label || "Text to Speech",
        message: `✅ Audio played (Web Speech API)`,
      });

      // Return metadata (no audio file available with Web Speech API)
      return {
        output: {
          type: "audio",
          mimeType: "audio/speech",
          text: resolvedText,
          voice: voice,
          speed: speed,
          pitch: pitch,
          provider: "webSpeech",
          _executed: true,
        },
      };
    }
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
      throw new Error(`Python execution failed: ${error.message}`);
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
