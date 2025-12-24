/**
 * OutputConfig Component
 * Configuration panel for Output node
 */
import { memo } from "react";

// Comprehensive artifact type options grouped by category
const ARTIFACT_TYPES = [
  // Auto-detect
  { value: "auto", label: "Auto-detect", category: "Auto" },

  // Text & Documents
  { value: "text/plain", label: "Text (.txt)", category: "Text" },
  { value: "text/markdown", label: "Markdown (.md)", category: "Text" },
  { value: "text/html", label: "HTML (.html)", category: "Text" },
  { value: "text/css", label: "CSS (.css)", category: "Text" },
  { value: "text/javascript", label: "JavaScript (.js)", category: "Text" },
  { value: "application/json", label: "JSON (.json)", category: "Data" },
  { value: "text/csv", label: "CSV (.csv)", category: "Data" },
  { value: "application/xml", label: "XML (.xml)", category: "Data" },
  { value: "application/yaml", label: "YAML (.yaml)", category: "Data" },

  // Documents
  { value: "application/pdf", label: "PDF (.pdf)", category: "Document" },
  { value: "application/msword", label: "Word (.doc)", category: "Document" },
  {
    value:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Word (.docx)",
    category: "Document",
  },
  {
    value: "application/vnd.ms-excel",
    label: "Excel (.xls)",
    category: "Document",
  },
  {
    value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Excel (.xlsx)",
    category: "Document",
  },
  {
    value: "application/vnd.ms-powerpoint",
    label: "PowerPoint (.ppt)",
    category: "Document",
  },
  {
    value:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    label: "PowerPoint (.pptx)",
    category: "Document",
  },

  // Audio
  { value: "audio/wav", label: "WAV Audio (.wav)", category: "Audio" },
  { value: "audio/mpeg", label: "MP3 Audio (.mp3)", category: "Audio" },
  { value: "audio/ogg", label: "OGG Audio (.ogg)", category: "Audio" },
  { value: "audio/webm", label: "WebM Audio (.webm)", category: "Audio" },
  { value: "audio/flac", label: "FLAC Audio (.flac)", category: "Audio" },
  { value: "audio/aac", label: "AAC Audio (.aac)", category: "Audio" },

  // Video
  { value: "video/mp4", label: "MP4 Video (.mp4)", category: "Video" },
  { value: "video/webm", label: "WebM Video (.webm)", category: "Video" },
  { value: "video/ogg", label: "OGG Video (.ogv)", category: "Video" },
  { value: "video/quicktime", label: "QuickTime (.mov)", category: "Video" },
  { value: "video/x-msvideo", label: "AVI Video (.avi)", category: "Video" },

  // Images
  { value: "image/png", label: "PNG Image (.png)", category: "Image" },
  { value: "image/jpeg", label: "JPEG Image (.jpg)", category: "Image" },
  { value: "image/gif", label: "GIF Image (.gif)", category: "Image" },
  { value: "image/webp", label: "WebP Image (.webp)", category: "Image" },
  { value: "image/svg+xml", label: "SVG Image (.svg)", category: "Image" },
  { value: "image/bmp", label: "Bitmap Image (.bmp)", category: "Image" },

  // Archives
  {
    value: "application/zip",
    label: "ZIP Archive (.zip)",
    category: "Archive",
  },
  {
    value: "application/x-tar",
    label: "TAR Archive (.tar)",
    category: "Archive",
  },
  {
    value: "application/gzip",
    label: "GZIP Archive (.gz)",
    category: "Archive",
  },
  {
    value: "application/x-7z-compressed",
    label: "7-Zip Archive (.7z)",
    category: "Archive",
  },

  // Binary/Other
  {
    value: "application/octet-stream",
    label: "Binary (.bin)",
    category: "Binary",
  },
];

// Group artifact types by category for optgroup rendering
const groupedArtifactTypes = ARTIFACT_TYPES.reduce((acc, type) => {
  if (!acc[type.category]) {
    acc[type.category] = [];
  }
  acc[type.category].push(type);
  return acc;
}, {});

function OutputConfig({ data, onUpdate }) {
  return (
    <div className="config-sections">
      <div className="config-section">
        <div className="config-section-title">Output Settings</div>

        <div className="config-field">
          <label>Output Type</label>
          <select
            value={data.outputType || "console"}
            onChange={(e) => onUpdate({ outputType: e.target.value })}
          >
            <option value="console">Console Log</option>
            <option value="file">Save to File</option>
            <option value="notification">Show Notification</option>
            <option value="artifact">Save as Artifact</option>
          </select>
        </div>

        {data.outputType === "file" && (
          <div className="config-field">
            <label>Filename</label>
            <input
              type="text"
              value={data.filename || "output.txt"}
              onChange={(e) => onUpdate({ filename: e.target.value })}
              placeholder="output.txt"
            />
          </div>
        )}

        {data.outputType === "artifact" && (
          <>
            <div className="config-field">
              <label>Artifact Type</label>
              <select
                value={data.artifactType || "auto"}
                onChange={(e) => onUpdate({ artifactType: e.target.value })}
              >
                {Object.entries(groupedArtifactTypes).map(
                  ([category, types]) => (
                    <optgroup key={category} label={category}>
                      {types.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>

            <div className="config-field">
              <label>Artifact Name</label>
              <input
                type="text"
                value={data.artifactName || ""}
                onChange={(e) => onUpdate({ artifactName: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </div>
          </>
        )}

        {data.outputType === "notification" && (
          <div className="config-field">
            <label>Notification Title</label>
            <input
              type="text"
              value={data.notificationTitle || "Workflow Complete"}
              onChange={(e) => onUpdate({ notificationTitle: e.target.value })}
            />
          </div>
        )}

        <div className="config-toggle">
          <label>Format as JSON</label>
          <div
            className={`toggle-switch ${data.formatJson ? "active" : ""}`}
            onClick={() => onUpdate({ formatJson: !data.formatJson })}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(OutputConfig);
