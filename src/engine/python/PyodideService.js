/**
 * PyodideService
 * Manages Python execution in browser using Pyodide
 */

class PyodideService {
  constructor() {
    this.pyodide = null;
    this.isLoading = false;
    this.isReady = false;
    this.loadProgress = 0;
  }

  async initialize() {
    if (this.pyodide || this.isLoading) return;

    this.isLoading = true;

    try {
      // Load Pyodide from CDN
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      // Initialize Pyodide
      this.pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });

      // Pre-load common packages
      await this.pyodide.loadPackage(["numpy", "pandas"]);

      this.isReady = true;
    } finally {
      this.isLoading = false;
    }
  }

  async runPython(code, inputData = {}) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Set input data as Python globals
      for (const [key, value] of Object.entries(inputData)) {
        this.pyodide.globals.set(key, value);
      }

      // Execute Python code
      const result = await this.pyodide.runPythonAsync(code);

      // Convert result to JavaScript
      if (result && typeof result.toJs === "function") {
        return result.toJs();
      }
      return result;
    } catch (error) {
      throw new Error(`Python error: ${error.message}`);
    }
  }

  async installPackage(packageName) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      await this.pyodide.loadPackage(packageName);
      return true;
    } catch {
      return false;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
    };
  }
}

// Singleton instance
const pyodideService = new PyodideService();
export default pyodideService;
