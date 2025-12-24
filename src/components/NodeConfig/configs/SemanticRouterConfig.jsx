/**
 * SemanticRouterConfig Component
 * Configuration panel for Semantic Router Node
 */
import { memo, useCallback } from "react";

function SemanticRouterConfig({ data, onUpdate }) {
  // Helpers to manage routes
  const handleAddRoute = useCallback(() => {
    const currentRoutes = data.routes || [];
    const newId = `route-${Date.now()}`;
    const newRoute = {
      id: newId,
      label: `Route ${currentRoutes.length + 1}`,
      keywords: [],
    };
    onUpdate({ routes: [...currentRoutes, newRoute] });
  }, [data.routes, onUpdate]);

  const handleRemoveRoute = useCallback(
    (index) => {
      const currentRoutes = [...(data.routes || [])];
      currentRoutes.splice(index, 1);
      onUpdate({ routes: currentRoutes });
    },
    [data.routes, onUpdate]
  );

  const handleUpdateRoute = useCallback(
    (index, field, value) => {
      const currentRoutes = [...(data.routes || [])];

      if (field === "keywords") {
        // Convert comma-separated string to array
        const keywords = value
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
        currentRoutes[index] = { ...currentRoutes[index], keywords };
      } else {
        currentRoutes[index] = { ...currentRoutes[index], [field]: value };
      }

      onUpdate({ routes: currentRoutes });
    },
    [data.routes, onUpdate]
  );

  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Routing Logic</div>

        <div className="config-field">
          <label>Classification Mode</label>
          <select
            value={data.classificationMode || "keyword"}
            onChange={(e) => onUpdate({ classificationMode: e.target.value })}
          >
            <option value="keyword">Keyword Matching (Exact)</option>
            <option value="embedding">Neural Embeddings (Semantic)</option>
            <option value="llm">LLM (Generative)</option>
          </select>
          <p className="hint">
            {data.classificationMode === "keyword"
              ? "Matches exact words in the input text"
              : data.classificationMode === "embedding"
              ? "Routes based on semantic meaning (requires Vector Memory)"
              : "Uses AI model to determine intent (slowest but smartest)"}
          </p>
        </div>
      </div>

      <div className="config-section">
        <div
          className="config-header-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <div className="config-section-title" style={{ marginBottom: 0 }}>
            Routes
          </div>
          <button
            className="btn-small"
            onClick={handleAddRoute}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              background: "var(--color-primary-light)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add Route
          </button>
        </div>

        <div
          className="routes-list"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {(data.routes || []).map((route, index) => (
            <div
              key={route.id || index}
              className="route-item"
              style={{
                background: "var(--bg-depth-1)",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                position: "relative",
              }}
            >
              <button
                className="btn-remove-route"
                onClick={() => handleRemoveRoute(index)}
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  background: "none",
                  border: "none",
                  color: "var(--color-error)",
                  cursor: "pointer",
                  opacity: 0.7,
                }}
                title="Remove Route"
              >
                ✕
              </button>

              <div className="config-field" style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "11px" }}>Label (Output Name)</label>
                <input
                  type="text"
                  value={route.label}
                  onChange={(e) =>
                    handleUpdateRoute(index, "label", e.target.value)
                  }
                  placeholder="e.g., Technical Question"
                />
              </div>

              <div className="config-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "11px" }}>
                  {data.classificationMode === "keyword"
                    ? "Keywords (comma separated)"
                    : "Description/Topic"}
                </label>
                <input
                  type="text"
                  value={(route.keywords || []).join(", ")}
                  onChange={(e) =>
                    handleUpdateRoute(index, "keywords", e.target.value)
                  }
                  placeholder={
                    data.classificationMode === "keyword"
                      ? "bug, code, error"
                      : "User is asking for code or technical help"
                  }
                />
              </div>
            </div>
          ))}

          {(data.routes || []).length === 0 && (
            <div
              className="empty-state"
              style={{
                padding: "20px",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontStyle: "italic",
              }}
            >
              No routes defined. All traffic will go to "Other".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(SemanticRouterConfig);
