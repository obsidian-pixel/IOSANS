/**
 * ToolCallingService
 * Implements ReAct (Reasoning + Acting) pattern for AI tool calling
 * Allows AI Agent to call connected nodes as tools during reasoning
 */
import webLLMService from "./WebLLMService";
import { executeNode } from "./NodeExecutors";

// Maximum iterations to prevent infinite loops
const MAX_ITERATIONS = 10;

// ReAct prompt template
const REACT_SYSTEM_PROMPT = `You are an AI assistant that can use tools to help answer questions.

Available tools:
{tools}

When you need to use a tool, respond with EXACTLY this format:
Thought: [Your reasoning about what to do]
Action: [tool_name]
Action Input: [JSON input for the tool]

Wait for the Observation (tool result) before continuing.

When you have enough information to answer, respond with:
Thought: I now have all the information needed.
Final Answer: [Your complete answer]

IMPORTANT:
- Always think step by step
- Only use tools when necessary
- Tool names are case-sensitive
- Action Input must be valid JSON
- Never make up tool results - wait for the actual Observation`;

/**
 * Generate tool schema from connected nodes
 */
export function generateToolSchema(connectedNodes) {
  const tools = [];

  for (const node of connectedNodes) {
    const tool = {
      id: node.id,
      name: node.data.label || node.type,
      type: node.type,
      description: getToolDescription(node),
      inputSchema: getToolInputSchema(node),
    };
    tools.push(tool);
  }

  return tools;
}

/**
 * Get tool description based on node type
 */
function getToolDescription(node) {
  const descriptions = {
    // Core utility nodes
    httpRequest: `Make HTTP requests. Input: { "url": "string", "method": "GET|POST", "body"?: object }`,
    codeExecutor: `Execute JavaScript code. Input: { "code": "string" } or pass data to process.`,
    setVariable: `Store a value. Input: { "key": "string", "value": any }`,
    ifElse: `Check a condition. Input: { "value": any } - returns evaluation result.`,
    loopEach: `Iterate through array items. Input: array of items.`,
    switchNode: `Route based on value matching cases. Input: value to match.`,
    delay: `Wait for specified duration. Input: { "duration": number } in ms.`,
    merge: `Combine multiple inputs. Input: array of values.`,
    // Media/AI nodes
    textToSpeech: `Convert text to spoken audio. Input: { "text": "string" } or plain text string.`,
    imageGeneration: `Generate image from prompt. Input: { "prompt": "string" } or plain text.`,
    pythonExecutor: `Execute Python code. Input: data to process in Python.`,
    speechToText: `Convert audio to text. Input: audio blob or URL.`,
    // Data processing nodes
    dataTransformer: `Transform data using mapping rules. Input: object to transform.`,
    vectorMemory: `Store or query vectors. Input: { "text": "string", "mode": "store|query" }.`,
    semanticRouter: `Route based on semantic meaning. Input: text to classify.`,
    evaluator: `Validate output. Input: data to validate.`,
    // NOTE: Output is NOT a tool - it's a workflow terminal
  };

  return (
    descriptions[node.type] ||
    node.data?.description ||
    `Execute ${node.type} node.`
  );
}

/**
 * Get input schema based on node type
 */
function getToolInputSchema(node) {
  const schemas = {
    httpRequest: { url: "string", method: "string", body: "object?" },
    codeExecutor: { data: "any" },
    setVariable: { key: "string", value: "any" },
    ifElse: { value: "any" },
    loopEach: { items: "array" },
    switchNode: { value: "any" },
    delay: { duration: "number" },
    merge: { inputs: "array" },
    textToSpeech: { text: "string" },
    imageGeneration: { prompt: "string" },
    pythonExecutor: { data: "any" },
    speechToText: { audio: "blob|url" },
    dataTransformer: { data: "object" },
    vectorMemory: { text: "string", mode: "string?" },
    semanticRouter: { text: "string" },
    evaluator: { data: "any" },
    // NOTE: Output is NOT a tool - it's a workflow terminal
  };

  return schemas[node.type] || { input: "any" };
}

/**
 * Format tools for the system prompt
 */
export function formatToolsForPrompt(tools) {
  if (!tools || tools.length === 0) {
    return "No tools available.";
  }

  return tools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n");
}

/**
 * Parse AI response for ReAct components
 */
export function parseReActResponse(response) {
  const result = {
    thought: null,
    action: null,
    actionInput: null,
    finalAnswer: null,
    raw: response,
  };

  // Check for Final Answer
  const finalMatch = response.match(/Final Answer:\s*(.+)/is);
  if (finalMatch) {
    result.finalAnswer = finalMatch[1].trim();
    return result;
  }

  // Parse Thought
  const thoughtMatch = response.match(
    /Thought:\s*(.+?)(?=\n(?:Action|Final Answer)|\n\n|$)/is
  );
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  // Parse Action
  const actionMatch = response.match(/Action:\s*(.+?)(?=\n|$)/i);
  if (actionMatch) {
    result.action = actionMatch[1].trim();
  }

  // Parse Action Input
  const inputMatch = response.match(/Action Input:\s*(.+?)(?=\n\n|$)/is);
  if (inputMatch) {
    try {
      // Try to parse as JSON
      result.actionInput = JSON.parse(inputMatch[1].trim());
    } catch {
      // If not valid JSON, use as string
      result.actionInput = inputMatch[1].trim();
    }
  }

  return result;
}

/**
 * Execute a tool (node) with given input
 */
async function executeTool(tool, input, context) {
  // Find the actual node to execute
  const toolNode = context.nodes?.find((n) => n.id === tool.id);
  if (!toolNode) {
    return { error: `Tool "${tool.name}" not found` };
  }

  try {
    const result = await executeNode(toolNode, input, context);

    // Validate artifact-first pattern for media tools
    const mediaTypes = ["textToSpeech", "imageGeneration", "pythonExecutor"];
    if (mediaTypes.includes(toolNode.type)) {
      const output = result.output;
      if (output && typeof output === "object" && !output._executed) {
        // Tool returned but didn't actually execute - warn
        context.addLog?.({
          type: "warning",
          nodeId: context.nodeId,
          nodeName: context.nodeName || "AI Agent",
          message: `⚠️ Tool "${tool.name}" returned without _executed flag - may be simulated`,
        });
      }
    }

    return result;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Run ReAct loop with tool calling
 */
export async function runReActLoop(userMessage, tools, options, context) {
  const {
    systemPrompt = "",
    maxTokens = 2000,
    temperature = 0.7,
    maxIterations = MAX_ITERATIONS,
  } = options;

  // Build enhanced system prompt with tools
  const toolsDescription = formatToolsForPrompt(tools);
  const enhancedSystemPrompt = `${systemPrompt}\n\n${REACT_SYSTEM_PROMPT.replace(
    "{tools}",
    toolsDescription
  )}`;

  const history = [];
  let iterations = 0;
  let finalResult = null;

  // Log start
  context.addLog({
    type: "ai",
    nodeId: context.nodeId,
    nodeName: context.nodeName || "AI Agent",
    message: `Starting ReAct loop with ${tools.length} tools available`,
  });

  // ReAct loop
  while (iterations < maxIterations) {
    iterations++;

    // Generate response
    const response = await webLLMService.generateWithHistory(
      iterations === 1
        ? userMessage
        : "Continue based on the observation above.",
      history
        .map((h) => ({
          query: h.role === "user" ? h.content : "",
          response: h.role === "assistant" ? h.content : "",
        }))
        .filter((h) => h.query || h.response),
      {
        systemPrompt: enhancedSystemPrompt,
        maxTokens,
        temperature,
      }
    );

    // Add assistant response to history
    history.push({ role: "assistant", content: response });

    // Parse response
    const parsed = parseReActResponse(response);

    // Log thought
    if (parsed.thought) {
      context.addLog({
        type: "ai",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `💭 Thought: ${parsed.thought.slice(0, 100)}...`,
      });
    }

    // Check for final answer
    if (parsed.finalAnswer) {
      finalResult = parsed.finalAnswer;
      context.addLog({
        type: "ai",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `✅ Final Answer reached after ${iterations} iteration(s)`,
      });
      break;
    }

    // Check for action
    if (parsed.action) {
      // Find matching tool
      const tool = tools.find(
        (t) => t.name.toLowerCase() === parsed.action.toLowerCase()
      );

      if (!tool) {
        const observation = `Tool "${
          parsed.action
        }" not found. Available tools: ${tools.map((t) => t.name).join(", ")}`;
        history.push({ role: "user", content: `Observation: ${observation}` });
        context.addLog({
          type: "warning",
          nodeId: context.nodeId,
          nodeName: context.nodeName || "AI Agent",
          message: `⚠️ Tool not found: ${parsed.action}`,
        });
        continue;
      }

      // Execute tool
      context.addLog({
        type: "ai",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `🔧 Action: ${parsed.action}`,
        data: parsed.actionInput,
      });

      const toolResult = await executeTool(tool, parsed.actionInput, context);

      // Format observation
      const observation = toolResult.error
        ? `Error: ${toolResult.error}`
        : JSON.stringify(toolResult.output || toolResult, null, 2);

      history.push({ role: "user", content: `Observation: ${observation}` });

      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `📋 Observation received`,
        data: toolResult.output || toolResult,
      });
    } else if (!parsed.finalAnswer) {
      // No action and no final answer - ask to continue
      history.push({
        role: "user",
        content:
          "Please either use a tool with the Action format, or provide a Final Answer.",
      });
    }
  }

  // Check if we hit max iterations
  if (!finalResult && iterations >= maxIterations) {
    context.addLog({
      type: "warning",
      nodeId: context.nodeId,
      nodeName: context.nodeName || "AI Agent",
      message: `⚠️ Max iterations (${maxIterations}) reached without final answer`,
    });
    finalResult =
      history[history.length - 1]?.content || "Max iterations reached.";
  }

  return {
    finalAnswer: finalResult,
    iterations,
    history,
    tools: tools.map((t) => t.name),
  };
}

// JSON-based system prompt for structured tool calling
const JSON_REACT_SYSTEM_PROMPT = `You have access to these tools:
{tools}

IMPORTANT: When you need to use a tool, respond ONLY with this JSON format:
{"action": "tool", "tool": "tool_name", "input": "your input for the tool"}

When you have the final answer (after tool results or if no tool needed), respond with:
{"action": "answer", "content": "your final response to the user"}

Always respond with valid JSON. Do not include any text outside the JSON object.`;

/**
 * Parse JSON-based response for tool calls or final answer
 */
export function parseJSONResponse(response) {
  let cleanResponse = response.trim();

  // Try to extract JSON from response (handle markdown code blocks)
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

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      isJSON: true,
      action: parsed.action,
      tool: parsed.tool,
      input: parsed.input,
      content: parsed.content,
      raw: response,
    };
  } catch {
    // Not valid JSON - treat as direct answer
    return {
      isJSON: false,
      action: "answer",
      content: cleanResponse,
      raw: response,
    };
  }
}

/**
 * Check if output is binary/blob data or media output that should be passed through directly
 */
function isBinaryOutput(output) {
  // Direct binary types
  if (output instanceof Blob || output instanceof ArrayBuffer) {
    return true;
  }

  // Data URI string
  if (typeof output === "string" && output.startsWith("data:")) {
    return true;
  }

  // Object with nested blob properties
  if (typeof output === "object" && output !== null) {
    if (
      output.audioBlob ||
      output.imageBlob ||
      output.videoBlob ||
      output.blob
    ) {
      return true;
    }

    // Media output with type or mimeType property (from TTS, imageGeneration, etc.)
    if (
      output.type === "audio" ||
      output.type === "speech" ||
      output.type === "image" ||
      output.type === "video" ||
      output.mimeType?.startsWith("audio/") ||
      output.mimeType?.startsWith("image/") ||
      output.mimeType?.startsWith("video/")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Run JSON-based ReAct loop with tool calling
 * This is the preferred method for structured tool interactions
 */
export async function runJSONReActLoop(userMessage, tools, options, context) {
  const {
    systemPrompt = "",
    maxTokens = 2000,
    temperature = 0.7,
    maxIterations = MAX_ITERATIONS,
    onHeartbeat = null,
  } = options;

  // Build enhanced system prompt with tools
  const toolsDescription = formatToolsForPrompt(tools);
  const toolSystemPrompt = JSON_REACT_SYSTEM_PROMPT.replace(
    "{tools}",
    toolsDescription
  );
  const fullSystemPrompt = systemPrompt
    ? `${systemPrompt}\n\n${toolSystemPrompt}`
    : toolSystemPrompt;

  const conversationHistory = [];
  let currentUserMessage = userMessage;
  let iterations = 0;
  let finalOutput = null;

  // Log start with tool details
  context.addLog({
    type: "info",
    nodeId: context.nodeId,
    nodeName: context.nodeName || "AI Agent",
    message: `🤖 Starting AI processing with ${tools.length} tool(s) available`,
    data: {
      tools: tools.map((t) => ({
        name: t.name,
        type: t.type,
        nodeId: t.nodeId,
        id: t.id,
      })),
    },
  });

  // ReAct loop
  while (iterations < maxIterations) {
    iterations++;

    context.addLog({
      type: "info",
      nodeId: context.nodeId,
      nodeName: context.nodeName || "AI Agent",
      message:
        iterations === 1
          ? `🤖 Generating response...`
          : `🔄 Processing tool result (iteration ${iterations})...`,
    });

    // Heartbeat to prevent timeout
    if (onHeartbeat) onHeartbeat();

    // Generate response
    const response = await webLLMService.generateWithHistory(
      currentUserMessage || "Please continue based on the previous context.",
      conversationHistory,
      {
        systemPrompt: fullSystemPrompt,
        maxTokens,
        temperature,
      },
      // Token callback for heartbeat
      () => {
        if (onHeartbeat) onHeartbeat();
      }
    );

    context.addLog({
      type: "success",
      nodeId: context.nodeId,
      nodeName: context.nodeName || "AI Agent",
      message: `✅ Generation complete`,
    });

    // Parse response
    const parsed = parseJSONResponse(response);

    // Handle final answer
    if (parsed.action === "answer") {
      finalOutput = parsed.content || response;
      context.addLog({
        type: "success",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `✅ Final answer reached after ${iterations} iteration(s)`,
      });
      break;
    }

    // Handle tool call - support multiple formats:
    // 1. {"action": "tool", "tool": "Tool Name", "input": ...}
    // 2. {"action": "text_to_speech", "input": ...} - action IS the tool
    let toolName = null;
    let toolInput = parsed.input;
    let toolDef = null;

    if (parsed.action === "tool" && parsed.tool) {
      // Standard format
      toolName = parsed.tool;
    } else if (parsed.action && parsed.action !== "answer") {
      // Fallback: action might be the tool name or type
      // Try to match action against tool names or types
      const actionLower = parsed.action.toLowerCase().replace(/[_-]/g, "");

      toolDef = tools.find((t) => {
        const nameLower = t.name.toLowerCase().replace(/[_-\s]/g, "");
        const typeLower = (t.type || "").toLowerCase().replace(/[_-]/g, "");
        return (
          nameLower.includes(actionLower) ||
          actionLower.includes(nameLower) ||
          typeLower === actionLower ||
          actionLower.includes(typeLower)
        );
      });

      if (toolDef) {
        toolName = toolDef.name;
        // Use input or the parsed.tool field if input is missing
        toolInput = parsed.input || parsed.tool || parsed.content;
      }
    }

    if (toolName) {
      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `🛠️ Agent calling tool: ${toolName}`,
        data: { tool: toolName, input: toolInput },
      });

      // Find the tool definition if not already found
      if (!toolDef) {
        toolDef = tools.find(
          (t) => t.name.toLowerCase() === toolName.toLowerCase()
        );
      }

      if (!toolDef) {
        // Tool not found - inform AI
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: context.nodeName || "AI Agent",
          message: `⚠️ Tool '${toolName}' not found. Available: ${
            tools.map((t) => t.name).join(", ") || "none"
          }`,
        });

        conversationHistory.push(
          { role: "assistant", content: response },
          {
            role: "user",
            content: `Tool "${toolName}" is not available. Available tools: ${
              tools.map((t) => t.name).join(", ") || "none"
            }.\n\nPlease provide your answer without using that tool.`,
          }
        );
        currentUserMessage = "";
        continue;
      }

      // Find the actual node to execute (support both nodeId and id property names)
      const toolNodeId = toolDef.nodeId || toolDef.id;
      const toolNode = context.nodes?.find((n) => n.id === toolNodeId);

      if (!toolNode) {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: context.nodeName || "AI Agent",
          message: `❌ Tool node not found: ${
            toolNodeId || "undefined"
          }. Tool def: ${JSON.stringify(toolDef)}`,
        });
        finalOutput = `Error: Tool node "${toolName}" not found in workflow`;
        break;
      }

      context.addLog({
        type: "info",
        nodeId: context.nodeId,
        nodeName: context.nodeName || "AI Agent",
        message: `🚀 Executing tool: ${toolName}...`,
      });

      // Execute the tool node
      const toolResult = await executeNode(toolNode, toolInput, context);

      if (toolResult.success) {
        context.addLog({
          type: "success",
          nodeId: context.nodeId,
          nodeName: context.nodeName || "AI Agent",
          message: `✅ Tool '${toolName}' executed successfully`,
        });

        // Check if tool output is binary - pass through directly
        if (isBinaryOutput(toolResult.output)) {
          context.addLog({
            type: "info",
            nodeId: context.nodeId,
            nodeName: context.nodeName || "AI Agent",
            message: `🔄 Binary output detected, passing through directly`,
          });
          finalOutput = toolResult.output;
          break;
        }

        // Add tool result to history for next iteration
        const toolOutputStr =
          typeof toolResult.output === "object"
            ? JSON.stringify(toolResult.output)
            : String(toolResult.output);

        conversationHistory.push(
          { role: "assistant", content: response },
          {
            role: "user",
            content: `Tool "${toolName}" returned:\n${toolOutputStr}\n\nBased on this result, please provide your final answer using: {"action": "answer", "content": "..."}`,
          }
        );
        currentUserMessage = "";

        // If last iteration, use tool result as output
        if (iterations === maxIterations) {
          finalOutput = toolResult.output;
        }
      } else {
        context.addLog({
          type: "error",
          nodeId: context.nodeId,
          nodeName: context.nodeName || "AI Agent",
          message: `❌ Tool '${toolName}' failed: ${toolResult.error}`,
        });

        // Inform the AI about the error
        conversationHistory.push(
          { role: "assistant", content: response },
          {
            role: "user",
            content: `Tool "${toolName}" failed with error: ${toolResult.error}\n\nPlease handle this error and provide your final answer using: {"action": "answer", "content": "..."}`,
          }
        );
        currentUserMessage = "";
      }
    } else {
      // Unknown action or malformed - treat as answer
      finalOutput = parsed.content || response;
      break;
    }
  }

  // Check if we hit max iterations
  if (iterations >= maxIterations && !finalOutput) {
    context.addLog({
      type: "warning",
      nodeId: context.nodeId,
      nodeName: context.nodeName || "AI Agent",
      message: `⚠️ Max iterations (${maxIterations}) reached`,
    });
    // Use last conversation content as fallback
    const lastAssistant = conversationHistory
      .filter((m) => m.role === "assistant")
      .pop();
    finalOutput =
      lastAssistant?.content || "Max iterations reached without final answer.";
  }

  return {
    output: finalOutput,
    iterations,
    history: conversationHistory,
    tools: tools.map((t) => t.name),
  };
}

export default {
  generateToolSchema,
  formatToolsForPrompt,
  parseReActResponse,
  parseJSONResponse,
  runReActLoop,
  runJSONReActLoop,
};
