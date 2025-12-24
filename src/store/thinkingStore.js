/**
 * ThinkingStore
 * Zustand store for streaming real-time AI reasoning steps
 */
import { create } from "zustand";

const useThinkingStore = create((set) => ({
  // Array of thinking steps
  thinkingStream: [],

  // Whether thinking is active
  isThinking: false,

  // Current reasoning strategy
  currentStrategy: null,

  // Start a new thinking session
  startThinking: (strategy = "cot") =>
    set({
      thinkingStream: [],
      isThinking: true,
      currentStrategy: strategy,
    }),

  // Add a step to the stream
  addStep: (step) =>
    set((state) => ({
      thinkingStream: [
        ...state.thinkingStream,
        {
          type: step.type || "thought",
          content: step.content || step.message || "",
          details: step.details || null,
          timestamp: Date.now(),
        },
      ],
    })),

  // End thinking session
  endThinking: () =>
    set({
      isThinking: false,
    }),

  // Clear all steps
  clearThinking: () =>
    set({
      thinkingStream: [],
      isThinking: false,
      currentStrategy: null,
    }),
}));

export default useThinkingStore;
