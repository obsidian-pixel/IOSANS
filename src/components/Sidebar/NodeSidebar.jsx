/**
 * NodeSidebar Component
 * File explorer-style folder navigation for nodes
 */
import { memo, useState, useMemo, useCallback } from "react";
import { getNodesByCategory, NODE_CATEGORIES } from "../../utils/nodeTypes";
import { WORKFLOW_TEMPLATES } from "../../data/templates";
import useWorkflowStore from "../../store/workflowStore";
import { useToastStore } from "../../store/toastStore";
import "./NodeSidebar.css";

// Get nodes grouped by category
const nodesByCategory = getNodesByCategory();

function NodeSidebar() {
  // Current folder view: null = root (categories), string = inside a category
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  // Store actions
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const toast = useToastStore();

  // Get current category info
  const currentCategory = currentFolder
    ? Object.values(NODE_CATEGORIES).find((c) => c.name === currentFolder)
    : null;

  // Get nodes for current folder
  const currentNodes = useMemo(() => {
    if (!currentFolder) return [];
    return nodesByCategory[currentFolder] || [];
  }, [currentFolder]);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return currentNodes;
    const query = searchQuery.toLowerCase();
    return currentNodes.filter(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query)
    );
  }, [currentNodes, searchQuery]);

  // Filter categories based on search (when at root)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return Object.entries(nodesByCategory);
    const query = searchQuery.toLowerCase();
    return Object.entries(nodesByCategory).filter(([categoryName, nodes]) => {
      // Match category name OR any node inside
      if (categoryName.toLowerCase().includes(query)) return true;
      return nodes.some(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.description.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const handleOpenFolder = useCallback((categoryName) => {
    setCurrentFolder(categoryName);
    setSearchQuery("");
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentFolder(null);
    setSearchQuery("");
  }, []);

  const handleDragStart = useCallback((event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleLoadTemplate = useCallback(
    (template) => {
      loadWorkflow({
        nodes: template.nodes,
        edges: template.edges,
      });
      toast.success(`Loaded template: ${template.name}`);
    },
    [loadWorkflow, toast]
  );

  const totalNodes = Object.values(nodesByCategory).flat().length;

  return (
    <aside className="node-sidebar">
      {/* Header with breadcrumb */}
      <div className="sidebar-header">
        {currentFolder ? (
          <div className="breadcrumb">
            <button
              className="back-btn"
              onClick={handleGoBack}
              title="Back to folders"
            >
              ←
            </button>
            <span
              className="current-folder"
              style={{ "--folder-color": currentCategory?.color }}
            >
              📂 {currentFolder}
            </span>
          </div>
        ) : (
          <h2>🗂️ Nodes</h2>
        )}
        <div className="header-actions">
          <button
            className={`templates-toggle ${showTemplates ? "active" : ""}`}
            onClick={() => setShowTemplates(!showTemplates)}
            title="Templates"
          >
            📋
          </button>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="templates-panel">
          <div className="templates-header">
            <h3>📁 Templates</h3>
            <span className="templates-count">{WORKFLOW_TEMPLATES.length}</span>
          </div>
          <div className="templates-list">
            {WORKFLOW_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="template-item"
                onClick={() => handleLoadTemplate(template)}
              >
                <span className="template-icon">{template.icon}</span>
                <div className="template-info">
                  <span className="template-name">{template.name}</span>
                  <span className="template-desc">{template.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showTemplates && (
        <>
          {/* Search */}
          <div className="sidebar-search">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={
                  currentFolder ? "Search in folder..." : "Search nodes..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="node-search-input"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="sidebar-content">
            {/* ROOT VIEW: Show folders */}
            {!currentFolder && (
              <div className="folder-list">
                {filteredCategories.map(([categoryName, nodes]) => {
                  const category = Object.values(NODE_CATEGORIES).find(
                    (c) => c.name === categoryName
                  );
                  return (
                    <button
                      key={categoryName}
                      className="folder-item"
                      onClick={() => handleOpenFolder(categoryName)}
                      style={{ "--folder-color": category?.color }}
                    >
                      <span className="folder-icon">📁</span>
                      <div className="folder-info">
                        <span className="folder-name">{categoryName}</span>
                        <span className="folder-desc">
                          {category?.description}
                        </span>
                      </div>
                      <span className="folder-count">{nodes.length}</span>
                      <span className="folder-arrow">→</span>
                    </button>
                  );
                })}

                {searchQuery && filteredCategories.length === 0 && (
                  <div className="no-results">
                    <p>No folders match "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}

            {/* FOLDER VIEW: Show nodes inside current folder */}
            {currentFolder && (
              <div className="node-list">
                {filteredNodes.map((node) => (
                  <div
                    key={node.type}
                    className="draggable-node"
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.type)}
                    style={{ "--node-color": currentCategory?.color }}
                    title={node.description}
                  >
                    <span className="node-icon">{node.icon}</span>
                    <div className="node-info">
                      <span className="node-name">{node.name}</span>
                      <span className="node-description">
                        {node.description}
                      </span>
                    </div>
                  </div>
                ))}

                {searchQuery && filteredNodes.length === 0 && (
                  <div className="no-results">
                    <p>No nodes match "{searchQuery}"</p>
                    <button onClick={() => setSearchQuery("")}>Clear</button>
                  </div>
                )}

                {!searchQuery && filteredNodes.length === 0 && (
                  <div className="no-results">
                    <p>This folder is empty</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div className="sidebar-footer">
        <p className="tip">
          {showTemplates
            ? "Click template to load"
            : currentFolder
            ? `${filteredNodes.length} nodes • Drag to canvas`
            : `${totalNodes} nodes in ${
                Object.keys(nodesByCategory).length
              } folders`}
        </p>
      </div>
    </aside>
  );
}

export default memo(NodeSidebar);
