/* eslint-env jest */
import "@testing-library/jest-dom";

// Mock WebLLMService to avoid worker issues in Jest
jest.mock("./src/engine/WebLLMService.js", () => ({
  initialize: jest.fn().mockResolvedValue(true),
  generateWithHistory: jest.fn().mockResolvedValue("Mock response"),
  resetChat: jest.fn(),
  unload: jest.fn(),
  checkWebGPUSupport: jest.fn().mockResolvedValue({ supported: true }),
}));

// Mock ResizeObserver for React Flow
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
