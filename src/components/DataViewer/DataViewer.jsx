/**
 * DataViewer Component
 * JSON tree view for inspecting node outputs
 */
import { memo, useState, useCallback } from "react";
import "./DataViewer.css";

// Determine the type of a value for styling
function getValueType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "unknown";
}

// Format a value for display
function formatValue(value, type) {
  switch (type) {
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    case "string":
      return `"${value.length > 100 ? value.slice(0, 100) + "..." : value}"`;
    case "number":
    case "boolean":
      return String(value);
    case "array":
      return `Array(${value.length})`;
    case "object":
      return `Object{${Object.keys(value).length}}`;
    default:
      return String(value);
  }
}

// Single tree node component
function TreeNode({ keyName, value, depth = 0, path = "" }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const type = getValueType(value);
  const isExpandable = type === "object" || type === "array";
  const currentPath = path ? `${path}.${keyName}` : keyName;

  const handleCopy = useCallback(
    (e) => {
      e.stopPropagation();
      const textToCopy =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      navigator.clipboard.writeText(textToCopy);
    },
    [value]
  );

  const toggleExpand = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="tree-node" style={{ paddingLeft: depth * 16 }}>
      <div className="tree-node-header" onClick={toggleExpand}>
        {isExpandable && (
          <span className={`tree-expand ${isExpanded ? "expanded" : ""}`}>
            ▶
          </span>
        )}
        {keyName !== undefined && <span className="tree-key">{keyName}:</span>}
        <span className={`tree-value type-${type}`}>
          {isExpandable && !isExpanded
            ? formatValue(value, type)
            : type === "array"
            ? `[`
            : type === "object"
            ? `{`
            : formatValue(value, type)}
        </span>
        <button
          className="tree-copy-btn"
          onClick={handleCopy}
          title={`Copy ${currentPath || "value"}`}
        >
          📋
        </button>
      </div>

      {isExpandable && isExpanded && (
        <div className="tree-children">
          {type === "array"
            ? value.map((item, index) => (
                <TreeNode
                  key={index}
                  keyName={index}
                  value={item}
                  depth={depth + 1}
                  path={currentPath}
                />
              ))
            : Object.entries(value).map(([k, v]) => (
                <TreeNode
                  key={k}
                  keyName={k}
                  value={v}
                  depth={depth + 1}
                  path={currentPath}
                />
              ))}
          <div className="tree-bracket" style={{ paddingLeft: depth * 16 }}>
            {type === "array" ? "]" : "}"}
          </div>
        </div>
      )}
    </div>
  );
}

// Table view for arrays of objects
function TableView({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="table-empty">No data to display</div>;
  }

  // Get all unique keys from all objects
  const allKeys = [
    ...new Set(
      data.flatMap((item) =>
        typeof item === "object" && item !== null ? Object.keys(item) : []
      )
    ),
  ];

  if (allKeys.length === 0) {
    return <div className="table-empty">Array contains non-object values</div>;
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            {allKeys.map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((row, index) => (
            <tr key={index}>
              <td className="row-index">{index}</td>
              {allKeys.map((key) => (
                <td key={key} className={`type-${getValueType(row?.[key])}`}>
                  {formatValue(row?.[key], getValueType(row?.[key]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <div className="table-more">+ {data.length - 100} more rows</div>
      )}
    </div>
  );
}

// Main DataViewer component
function DataViewer({ data, title, showViewToggle = true }) {
  const [viewMode, setViewMode] = useState("tree"); // tree | table | raw
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }, [data]);

  // Filter data based on search (simple implementation)
  const filteredData = searchQuery
    ? JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (
            typeof value === "string" &&
            value.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return value;
          }
          if (
            typeof key === "string" &&
            key.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return value;
          }
          if (typeof value === "object") return value;
          return undefined;
        })
      )
    : data;

  const isArray = Array.isArray(data);
  const canShowTable =
    isArray && data.length > 0 && typeof data[0] === "object";

  return (
    <div className="data-viewer">
      {/* Header */}
      <div className="data-viewer-header">
        {title && <span className="data-viewer-title">{title}</span>}

        <div className="data-viewer-controls">
          {/* Search */}
          <input
            type="text"
            className="data-search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* View toggle */}
          {showViewToggle && (
            <div className="view-toggle">
              <button
                className={viewMode === "tree" ? "active" : ""}
                onClick={() => setViewMode("tree")}
                title="Tree view"
              >
                🌲
              </button>
              {canShowTable && (
                <button
                  className={viewMode === "table" ? "active" : ""}
                  onClick={() => setViewMode("table")}
                  title="Table view"
                >
                  📊
                </button>
              )}
              <button
                className={viewMode === "raw" ? "active" : ""}
                onClick={() => setViewMode("raw")}
                title="Raw JSON"
              >
                {}
              </button>
            </div>
          )}

          {/* Copy all */}
          <button
            className="copy-all-btn"
            onClick={handleCopyAll}
            title="Copy all"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="data-viewer-content">
        {data === undefined || data === null ? (
          <div className="data-empty">No data available</div>
        ) : viewMode === "tree" ? (
          <TreeNode value={filteredData} depth={0} />
        ) : viewMode === "table" && canShowTable ? (
          <TableView data={data} />
        ) : (
          <pre className="data-raw">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export default memo(DataViewer);
export { TreeNode, TableView };
