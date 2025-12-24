/**
 * ManualTriggerConfig Component
 * Configuration panel for Manual Trigger with form builder
 */
import { memo, useState } from "react";
import "./ManualTriggerConfig.css";

// Available field types
const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "📝" },
  { value: "number", label: "Number", icon: "🔢" },
  { value: "dropdown", label: "Dropdown", icon: "📋" },
  { value: "toggle", label: "Toggle", icon: "🔘" },
  { value: "textarea", label: "Text Area", icon: "📄" },
  { value: "json", label: "JSON", icon: "{ }" },
];

function ManualTriggerConfig({ data, onUpdate }) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const fields = data.inputFields || [];
  const inputValues = data.inputValues || {};

  // Add a new field
  const handleAddField = () => {
    if (!newFieldName.trim()) return;

    const fieldId = `field_${Date.now()}`;
    const newField = {
      id: fieldId,
      name: newFieldName.trim(),
      type: newFieldType,
      options:
        newFieldType === "dropdown" ? ["Option 1", "Option 2"] : undefined,
      defaultValue: getDefaultValue(newFieldType),
    };

    onUpdate({
      inputFields: [...fields, newField],
      inputValues: {
        ...inputValues,
        [fieldId]: newField.defaultValue,
      },
    });

    setNewFieldName("");
  };

  // Get default value based on type
  const getDefaultValue = (type) => {
    switch (type) {
      case "number":
        return 0;
      case "toggle":
        return false;
      case "json":
        return "{}";
      default:
        return "";
    }
  };

  // Remove a field
  const handleRemoveField = (fieldId) => {
    const newValues = { ...inputValues };
    delete newValues[fieldId];
    onUpdate({
      inputFields: fields.filter((f) => f.id !== fieldId),
      inputValues: newValues,
    });
  };

  // Update field value
  const handleValueChange = (fieldId, value) => {
    onUpdate({
      inputValues: {
        ...inputValues,
        [fieldId]: value,
      },
    });
  };

  // Update field options (for dropdown)
  const handleOptionsChange = (fieldId, optionsString) => {
    const options = optionsString
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    onUpdate({
      inputFields: fields.map((f) =>
        f.id === fieldId ? { ...f, options } : f
      ),
    });
  };

  // Move field up/down
  const handleMoveField = (index, direction) => {
    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    onUpdate({ inputFields: newFields });
  };

  // Render input based on field type
  const renderFieldInput = (field) => {
    const value = inputValues[field.id] ?? field.defaultValue;

    switch (field.type) {
      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handleValueChange(field.id, parseFloat(e.target.value) || 0)
            }
          />
        );

      case "toggle":
        return (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleValueChange(field.id, e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">{value ? "On" : "Off"}</span>
          </label>
        );

      case "dropdown":
        return (
          <select
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            rows={3}
          />
        );

      case "json":
        return (
          <textarea
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className="json-input"
            rows={4}
            placeholder='{"key": "value"}'
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="manual-trigger-config">
      <div className="config-section">
        <div className="config-section-title">Trigger Settings</div>

        <div className="config-field">
          <label>Trigger Name</label>
          <input
            type="text"
            value={data.label || "Manual Trigger"}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Start Workflow"
          />
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">
          Input Fields
          <span className="field-count">{fields.length}</span>
        </div>
        <p className="hint">
          Define input fields that users will fill when running this workflow
        </p>

        {/* Field List */}
        <div className="fields-list">
          {fields.map((field, index) => (
            <div key={field.id} className="field-item">
              <div className="field-header">
                <span className="field-icon">
                  {FIELD_TYPES.find((t) => t.value === field.type)?.icon ||
                    "📝"}
                </span>
                <span className="field-name">{field.name}</span>
                <span className="field-type">{field.type}</span>
                <div className="field-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleMoveField(index, "up")}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleMoveField(index, "down")}
                    disabled={index === fields.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleRemoveField(field.id)}
                    title="Remove field"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="field-input">{renderFieldInput(field)}</div>

              {field.type === "dropdown" && (
                <div className="field-options">
                  <label>Options (comma-separated)</label>
                  <input
                    type="text"
                    value={(field.options || []).join(", ")}
                    onChange={(e) =>
                      handleOptionsChange(field.id, e.target.value)
                    }
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
            </div>
          ))}

          {fields.length === 0 && (
            <div className="empty-fields">
              <p>No input fields defined</p>
              <p className="hint">Add fields below to create a form</p>
            </div>
          )}
        </div>

        {/* Add Field Form */}
        <div className="add-field-form">
          <div className="add-field-row">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name..."
              className="field-name-input"
              onKeyDown={(e) => e.key === "Enter" && handleAddField()}
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className="field-type-select"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <button
              className="add-field-btn"
              onClick={handleAddField}
              disabled={!newFieldName.trim()}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Output Preview</div>
        <div className="output-preview">
          <pre>{JSON.stringify(inputValues, null, 2)}</pre>
        </div>
        <p className="hint">This data will be passed to connected nodes</p>
      </div>
    </div>
  );
}

export default memo(ManualTriggerConfig);
