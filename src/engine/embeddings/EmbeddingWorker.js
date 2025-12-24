/**
 * EmbeddingWorker.js
 * Web Worker for running local embedding generation off the main thread
 * Uses @xenova/transformers (Transformers.js)
 */
import { pipeline, env } from "@xenova/transformers";

// Skip local checks for dev environment
env.allowLocalModels = false;
env.useBrowserCache = true;

class EmbeddingPipeline {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance = null;

  static async getInstance(progressCallback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback: progressCallback,
      });
    }
    return this.instance;
  }
}

// Listen for messages from main thread
self.addEventListener("message", async (event) => {
  const { type, text, id } = event.data;

  try {
    switch (type) {
      case "load":
        // Just preload the model
        await EmbeddingPipeline.getInstance((progress) => {
          self.postMessage({
            type: "progress",
            progress: progress,
            status: progress.status,
          });
        });
        self.postMessage({ type: "ready" });
        break;

      case "extract": {
        const extractor = await EmbeddingPipeline.getInstance();
        const output = await extractor(text, {
          pooling: "mean",
          normalize: true,
        });
        // Convert Tensor to standard array for transfer
        const embedding = Array.from(output.data);

        self.postMessage({
          type: "result",
          id,
          embedding,
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error.message,
    });
  }
});
