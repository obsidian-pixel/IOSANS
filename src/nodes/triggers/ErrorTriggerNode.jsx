/**
 * ErrorTriggerNode Component
 * Global error handler that triggers when any other node fails
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./ErrorTriggerNode.css";

function ErrorTriggerNode({ data }) {
  const watchAll = data.watchAll !== false;
  const specificNodes = data.specificNodes || [];

  return (
    <BaseNode type="errorTrigger" data={data} inputs={0} outputs={1}>
      <div className="error-trigger-content">
        <div className="error-icon">⚠️</div>

        <div className="watch-mode">
          {watchAll ? (
            <span className="watch-all">Watching all nodes</span>
          ) : (
            <span className="watch-specific">
              Watching {specificNodes.length} node(s)
            </span>
          )}
        </div>

        {data.retryEnabled && (
          <div className="retry-badge">
            🔄 Auto-retry: {data.retryCount || 3}x
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(ErrorTriggerNode);
