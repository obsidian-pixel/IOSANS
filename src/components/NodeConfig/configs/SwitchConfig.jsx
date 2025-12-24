/**
 * SwitchConfig Component
 * Configuration panel for Switch routing nodes
 */
import { memo, useCallback, useMemo } from "react";

function SwitchConfig({ data, onUpdate }) {
  const routes = useMemo(() => data.routes || [], [data.routes]);

  const addRoute = useCallback(() => {
    const newRoutes = [...routes, { value: "", outputIndex: routes.length }];
    onUpdate({ routes: newRoutes });
  }, [routes, onUpdate]);

  const updateRoute = useCallback(
    (index, field, value) => {
      const newRoutes = routes.map((route, i) =>
        i === index ? { ...route, [field]: value } : route
      );
      onUpdate({ routes: newRoutes });
    },
    [routes, onUpdate]
  );

  const removeRoute = useCallback(
    (index) => {
      const newRoutes = routes.filter((_, i) => i !== index);
      onUpdate({ routes: newRoutes });
    },
    [routes, onUpdate]
  );

  return (
    <div className="switch-config">
      <div className="config-section">
        <div className="config-section-title">Switch Field</div>

        <div className="config-field">
          <label>Field Path</label>
          <input
            type="text"
            value={data.field || ""}
            onChange={(e) => onUpdate({ field: e.target.value })}
            placeholder="status"
          />
          <p className="hint">Path to the field to switch on</p>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Routes</div>

        {routes.map((route, index) => (
          <div key={index} className="route-row">
            <input
              type="text"
              value={route.value}
              onChange={(e) => updateRoute(index, "value", e.target.value)}
              placeholder={`Value for output ${index + 1}`}
              className="route-value"
            />
            <span className="route-output">
              → Output {route.outputIndex + 1}
            </span>
            <button
              className="btn-icon btn-small"
              onClick={() => removeRoute(index)}
              title="Remove route"
            >
              ✕
            </button>
          </div>
        ))}

        <button className="btn-add-route" onClick={addRoute}>
          + Add Route
        </button>

        <p className="hint" style={{ marginTop: "8px", marginBottom: "8px" }}>
          Routes map values to dynamic output handles
        </p>

        <div className="config-field" style={{ marginTop: "12px" }}>
          <label>Default Output</label>
          <p className="hint">
            When no routes match, data flows to the "default" output handle
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SwitchConfig);
