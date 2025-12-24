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
    httpRequest: `Make HTTP requests. Input: { "url": "string", "method": "GET|POST", "body"?: object }`,
    codeExecutor: `Execute JavaScript code. Input: { "code": "string" } or pass data to process.`,
    setVariable: `Store a value. Input: { "key": "string", "value": any }`,
    ifElse: `Check a condition. Input: { "value": any } - returns evaluation result.`,
  };

  return descriptions[node.type] || `Execute ${node.type} node.`;
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

export default {
  generateToolSchema,
  formatToolsForPrompt,
  parseReActResponse,
  runReActLoop,
};
