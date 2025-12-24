/**
 * WebLLM Worker - Runs LLM inference in a separate thread
 * This prevents UI blocking during model generation
 */

import * as webllm from "@mlc-ai/web-llm";

let engine = null;
let isReady = false;

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, payload, id } = event.data;

  try {
    switch (type) {
      case "INIT":
        await handleInit(payload, id);
        break;
      case "GENERATE":
        await handleGenerate(payload, id);
        break;
      case "RESET":
        await handleReset(id);
        break;
      default:
        self.postMessage({
          type: "ERROR",
          id,
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({ type: "ERROR", id, error: error.message });
  }
};

async function handleInit(payload, id) {
  const { modelId } = payload;

  self.postMessage({
    type: "INIT_PROGRESS",
    id,
    progress: 0,
    text: "Starting model load...",
  });

  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      self.postMessage({
        type: "INIT_PROGRESS",
        id,
        progress: report.progress,
        text: report.text,
        timeElapsed: report.timeElapsed,
      });
    },
  });

  isReady = true;
  self.postMessage({ type: "INIT_COMPLETE", id });
}

async function handleGenerate(payload, id) {
  if (!isReady || !engine) {
    self.postMessage({ type: "ERROR", id, error: "Model not loaded" });
    return;
  }

  const {
    userMessage,
    systemPrompt = "",
    history = [],
    maxTokens = 40000000,
    temperature = 1,
    streaming = false,
  } = payload;

  // Build messages array with optional system prompt
  const messages = [];

  // Add system prompt if provided
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // Add conversation history
  // Add conversation history
  history.slice(-10).forEach((h) => {
    if (h.role && h.content) {
      messages.push({ role: h.role, content: h.content });
    } else if (h.query && h.response) {
      messages.push({ role: "user", content: h.query });
      messages.push({ role: "assistant", content: h.response });
    }
  });

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  if (streaming) {
    // Streaming mode - send tokens as they arrive
    let fullText = "";
    const stream = await engine.chat.completions.create({
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullText += delta;
      self.postMessage({
        type: "GENERATE_TOKEN",
        id,
        token: delta,
        text: fullText,
      });
    }

    self.postMessage({ type: "GENERATE_COMPLETE", id, text: fullText });
  } else {
    // Non-streaming for simplicity and performance
    const response = await engine.chat.completions.create({
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const text = response.choices[0]?.message?.content || "";
    self.postMessage({ type: "GENERATE_COMPLETE", id, text });
  }
}

async function handleReset(id) {
  if (engine) {
    await engine.resetChat();
  }
  self.postMessage({ type: "RESET_COMPLETE", id });
}
