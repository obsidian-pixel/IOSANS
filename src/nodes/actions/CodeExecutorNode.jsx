/**
 * CodeExecutorNode Component
 * Action node for executing JavaScript code with Monaco editor
 */
import { memo, useState, useEffect, useRef } from "react";
import BaseNode from "../base/BaseNode";
import "./CodeExecutorNode.css";

// Lazy load Monaco editor from CDN
const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs";

function CodeExecutorNode({ data }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [monacoReady, setMonacoReady] = useState(!!window.monaco);
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  // Preview first line of code
  const previewCode = (data.code || "").split("\n")[0].slice(0, 40);

  // Load Monaco when editor opens
  useEffect(() => {
    if (!isEditorOpen || monacoReady) return;
    if (window.monaco) {
      // Monaco already loaded globally, just update state once
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMonacoReady(true);
      return;
    }

    let isMounted = true;
    const script = document.createElement("script");
    script.src = `${MONACO_CDN}/loader.js`;
    script.async = true;
    script.onload = () => {
      window.require.config({ paths: { vs: MONACO_CDN } });
      window.require(["vs/editor/editor.main"], () => {
        if (isMounted) setMonacoReady(true);
      });
    };
    document.body.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, [isEditorOpen, monacoReady]);

  // Initialize editor when Monaco is loaded
  useEffect(() => {
    if (
      monacoReady &&
      isEditorOpen &&
      containerRef.current &&
      !editorRef.current
    ) {
      editorRef.current = window.monaco.editor.create(containerRef.current, {
        value: data.code || "// JavaScript code\nreturn input;",
        language: "javascript",
        theme: "vs-dark",
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      });
    }
  }, [monacoReady, isEditorOpen, data.code]);

  // Cleanup editor on unmount or close
  useEffect(() => {
    if (!isEditorOpen && editorRef.current) {
      editorRef.current.dispose();
      editorRef.current = null;
    }
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [isEditorOpen]);

  return (
    <BaseNode type="codeExecutor" data={data} inputs={1} outputs={1}>
      <div className="code-executor-content">
        <div
          className="node-preview code-preview"
          onClick={() => setIsEditorOpen(true)}
          title="Click to edit code"
        >
          <span className="code-text">
            {previewCode || "// JavaScript code"}
            {previewCode && previewCode.length >= 40 && "..."}
          </span>
          <span className="edit-hint">✏️</span>
        </div>

        {data.cdnUrls?.length > 0 && (
          <div className="cdn-badge">
            📦 {data.cdnUrls.length} CDN{data.cdnUrls.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Monaco Editor Modal */}
      {isEditorOpen && (
        <div
          className="monaco-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditorOpen(false);
          }}
        >
          <div className="monaco-modal">
            <div className="monaco-header">
              <span>📝 Code Editor</span>
              <button
                className="monaco-close"
                onClick={() => setIsEditorOpen(false)}
              >
                ✕
              </button>
            </div>
            <div ref={containerRef} className="monaco-container">
              {!monacoReady && (
                <div className="monaco-loading">Loading editor...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </BaseNode>
  );
}

export default memo(CodeExecutorNode);
