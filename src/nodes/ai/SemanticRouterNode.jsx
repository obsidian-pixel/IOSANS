/**
 * SemanticRouterNode Component
 * Routes input to different outputs based on semantic classification
 * Uses fast local model (Qwen 1.5B) to classify intent
 */
import { memo, useEffect } from "react";
import { useNodeId, useUpdateNodeInternals } from "@xyflow/react";
import BaseNode from "../base/BaseNode";
import "./SemanticRouterNode.css";

function SemanticRouterNode({ data }) {
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();

  // Dynamic routes from data or defaults
  const routes = data.routes || [
    { id: "route-0", label: "General", keywords: ["general", "other"] },
    {
      id: "route-1",
      label: "Technical",
      keywords: ["code", "programming", "bug"],
    },
    {
      id: "route-2",
      label: "Creative",
      keywords: ["story", "write", "creative"],
    },
  ];

  // Track number of outputs for dynamic port generation
  const outputCount = routes.length + 1; // +1 for fallback "other" route

  // Update node internals when routes change
  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [routes.length, nodeId, updateNodeInternals]);

  // Generate output labels dynamically
  const outputLabels = [
    ...routes.map((r) => r.label),
    "Other", // Fallback route
  ];

  return (
    <BaseNode
      type="semanticRouter"
      data={data}
      inputs={1}
      outputs={outputCount}
      outputLabels={outputLabels}
    >
      <div className="semantic-router-content">
        <div className="routes-header">
          <span className="routes-icon">🧭</span>
          <span className="routes-count">{routes.length} routes</span>
        </div>

        {/* Route Preview */}
        <div className="routes-preview">
          {routes.slice(0, 3).map((route, i) => (
            <div key={route.id || i} className="route-chip">
              <span className="route-number">{i + 1}</span>
              <span className="route-label">{route.label}</span>
            </div>
          ))}
          {routes.length > 3 && (
            <div className="route-chip more">+{routes.length - 3}</div>
          )}
        </div>

        {/* Classification preview */}
        <div className="classification-mode">
          <span className="mode-label">Mode:</span>
          <span className="mode-value">
            {data.classificationMode || "keyword"}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(SemanticRouterNode);
