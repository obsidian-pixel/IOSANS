/**
 * WebhookTriggerNode Component
 * Exposes a local endpoint to receive external triggers
 */
import { memo, useState } from "react";
import BaseNode from "../base/BaseNode";
import "./WebhookTriggerNode.css";

function WebhookTriggerNode({ data }) {
  const [copied, setCopied] = useState(false);

  const endpoint = data.endpoint || `/webhook/${data.id || "default"}`;
  const method = data.method || "POST";

  const copyEndpoint = () => {
    navigator.clipboard.writeText(`${window.location.origin}${endpoint}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BaseNode type="webhookTrigger" data={data} inputs={0} outputs={1}>
      <div className="webhook-content">
        <div className="method-badge">{method}</div>

        <div className="endpoint-display" onClick={copyEndpoint}>
          <span className="endpoint-path">{endpoint}</span>
          <span className="copy-hint">{copied ? "✓" : "📋"}</span>
        </div>

        {data.authRequired && (
          <div className="auth-badge">🔒 Auth Required</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(WebhookTriggerNode);
