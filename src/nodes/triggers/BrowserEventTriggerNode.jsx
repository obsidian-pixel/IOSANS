/**
 * BrowserEventTriggerNode Component
 * Triggers on browser events: tab focus, URL change, DOM events
 */
import { memo } from "react";
import BaseNode from "../base/BaseNode";
import "./BrowserEventTriggerNode.css";

const EVENT_LABELS = {
  focus: "Tab Focus",
  blur: "Tab Blur",
  urlChange: "URL Change",
  domClick: "DOM Click",
  domChange: "DOM Change",
  keypress: "Key Press",
  timer: "Timer",
};

function BrowserEventTriggerNode({ data }) {
  const eventType = data.eventType || "focus";
  const label = EVENT_LABELS[eventType] || eventType;

  return (
    <BaseNode type="browserEventTrigger" data={data} inputs={0} outputs={1}>
      <div className="browser-event-content">
        <div className="event-icon">🌐</div>

        <div className="event-type">{label}</div>

        {eventType === "domClick" && data.selector && (
          <div className="selector-preview">
            <code>{data.selector}</code>
          </div>
        )}

        {eventType === "timer" && data.interval && (
          <div className="timer-preview">Every {data.interval}ms</div>
        )}

        {eventType === "urlChange" && data.urlPattern && (
          <div className="pattern-preview">
            {data.urlPattern.slice(0, 30)}...
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(BrowserEventTriggerNode);
