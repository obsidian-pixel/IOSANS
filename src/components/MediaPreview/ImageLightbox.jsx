/**
 * ImageLightbox Component
 * Renders image artifacts with zoom and lightbox functionality
 */
import { useState, memo } from "react";
import "./ImageLightbox.css";

function ImageLightbox({ data, artifactId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const imageUrl = data?.url || data?.blobUrl;
  const prompt = data?.prompt;

  if (!imageUrl) {
    return (
      <div className="image-placeholder">
        <span className="placeholder-icon">🎨</span>
        <span className="placeholder-text">No image available</span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div className="image-thumbnail" onClick={() => setIsOpen(true)}>
        <div className="image-header">
          <span className="image-icon">🎨</span>
          <span className="image-title">Generated Image</span>
          {artifactId && (
            <span className="image-id">{artifactId.slice(0, 12)}...</span>
          )}
        </div>

        <div className="thumbnail-container">
          <img
            src={imageUrl}
            alt={prompt || "Generated image"}
            className={`thumbnail-img ${isLoaded ? "loaded" : ""}`}
            onLoad={() => setIsLoaded(true)}
          />
          {!isLoaded && (
            <div className="thumbnail-loader">
              <div className="loader-spinner" />
            </div>
          )}
          <div className="thumbnail-overlay">
            <span className="zoom-icon">🔍</span>
            <span className="zoom-text">Click to enlarge</span>
          </div>
        </div>

        {prompt && (
          <div className="image-prompt">
            {prompt.length > 60 ? prompt.slice(0, 60) + "..." : prompt}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div className="lightbox-modal" onClick={() => setIsOpen(false)}>
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              ×
            </button>

            <img
              src={imageUrl}
              alt={prompt || "Generated image"}
              className="lightbox-img"
            />

            {prompt && (
              <div className="lightbox-prompt">
                <span className="prompt-label">Prompt:</span>
                <span className="prompt-text">{prompt}</span>
              </div>
            )}

            <div className="lightbox-actions">
              <a
                href={imageUrl}
                download={`${artifactId || "image"}.png`}
                className="download-btn"
                onClick={(e) => e.stopPropagation()}
              >
                ⬇ Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(ImageLightbox);
