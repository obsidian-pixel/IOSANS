/**
 * ExpressionInput Component
 * Text input with expression autocomplete and preview
 */
import { memo, useState, useRef, useCallback } from "react";
import {
  getAvailableVariables,
  resolveExpressions,
} from "../../utils/expressions";
import "./ExpressionInput.css";

function ExpressionInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  previewContext = {},
}) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);

  const availableVariables = getAvailableVariables();

  // Filter autocomplete options
  const filteredOptions = availableVariables.filter(
    (v) =>
      v.name.toLowerCase().includes(autocompleteFilter.toLowerCase()) ||
      v.description.toLowerCase().includes(autocompleteFilter.toLowerCase())
  );

  // Check if cursor is inside {{ }}
  const isInsideExpression = useCallback((text, pos) => {
    const before = text.slice(0, pos);
    const lastOpen = before.lastIndexOf("{{");
    const lastClose = before.lastIndexOf("}}");
    return lastOpen > lastClose;
  }, []);

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart;
    setCursorPosition(pos);
    onChange(newValue);

    // Check if we should show autocomplete
    if (isInsideExpression(newValue, pos)) {
      // Get the text after the last {{
      const before = newValue.slice(0, pos);
      const lastOpen = before.lastIndexOf("{{");
      const filterText = before.slice(lastOpen + 2).trim();
      setAutocompleteFilter(filterText);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const selectOption = (option) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);

    // Find where the current expression starts
    const lastOpen = before.lastIndexOf("{{");
    const prefix = before.slice(0, lastOpen + 2);

    // Insert the variable
    const newValue = prefix + " " + option.name + " }}" + after;
    onChange(newValue);
    setShowAutocomplete(false);

    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Handle key navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowAutocomplete(false);
    }
    // Could add arrow key navigation for autocomplete list
  };

  // Preview the resolved expression
  const hasExpression = value && value.includes("{{");
  const preview = hasExpression
    ? resolveExpressions(value, { input: previewContext })
    : null;

  // Validate expressions
  const expressionValid = !hasExpression || !preview?.includes("{{ERROR:");

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className="expression-input-wrapper">
      <div
        className={`expression-input-container ${
          !expressionValid ? "error" : ""
        }`}
      >
        <InputComponent
          ref={inputRef}
          type={multiline ? undefined : "text"}
          value={value || ""}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
          placeholder={placeholder}
          className={`expression-input ${
            hasExpression ? "has-expression" : ""
          }`}
        />

        {hasExpression && (
          <span className="expression-badge" title="Contains expressions">
            {"{{ }}"}
          </span>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && filteredOptions.length > 0 && (
        <div className="expression-autocomplete">
          {filteredOptions.slice(0, 10).map((option) => (
            <button
              key={option.name}
              className="autocomplete-option"
              onMouseDown={() => selectOption(option)}
            >
              <span className="option-name">{option.name}</span>
              <span className="option-desc">{option.description}</span>
              <code className="option-example">{option.example}</code>
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {hasExpression && preview && (
        <div
          className={`expression-preview ${!expressionValid ? "error" : ""}`}
        >
          <span className="preview-label">Preview:</span>
          <span className="preview-value">
            {preview.length > 100 ? preview.slice(0, 100) + "..." : preview}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(ExpressionInput);
