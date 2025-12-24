/**
 * OutputNode Component
 * Terminal node that collects and displays workflow output with rich media
 */
import { memo, useMemo } from "react";
import BaseNode from "../base/BaseNode";
import { AudioPlayer, ImageLightbox } from "../../components/MediaPreview";
import { autoDetectType } from "../../utils/autoDetectType";
import "./OutputNode.css";

function OutputNode({ data }) {
  const getOutputTypeLabel = () => {
    switch (data.outputType) {
      case "file":
        return "📁 File";
      case "notification":
        return "🔔 Notify";
      case "artifact":
        return "📎 Artifact";
      default:
        return "🖥️ Console";
    }
  };

  // Detect content type of last output for intelligent rendering
  const renderPreview = useMemo(() => {
    const lastOutput = data.lastOutput;
    if (!lastOutput) return null;

    // Check if it's a structured artifact
    if (typeof lastOutput === "object" && lastOutput !== null) {
      // Audio artifact (from TTS)
      if (
        lastOutput.type === "audio" ||
        lastOutput.mimeType?.startsWith("audio/")
      ) {
        return (
          <AudioPlayer data={lastOutput} artifactId={lastOutput.artifactId} />
        );
      }

      // Image artifact
      if (
        lastOutput.type === "image" ||
        lastOutput.mimeType?.startsWith("image/")
      ) {
        return (
          <ImageLightbox data={lastOutput} artifactId={lastOutput.artifactId} />
        );
      }

      // JSON data
      return (
        <div className="output-preview-json">
          <pre>{JSON.stringify(lastOutput, null, 2).slice(0, 200)}</pre>
          {JSON.stringify(lastOutput).length > 200 && (
            <span className="preview-more">...more</span>
          )}
        </div>
      );
    }

    // String content - use auto-detect
    if (typeof lastOutput === "string") {
      const detected = autoDetectType(lastOutput);

      if (detected.isDataUri && detected.mimeType?.startsWith("audio/")) {
        return <AudioPlayer data={{ url: lastOutput }} />;
      }

      if (detected.isDataUri && detected.mimeType?.startsWith("image/")) {
        return <ImageLightbox data={{ url: lastOutput }} />;
      }

      // Text preview
      return (
        <div className="output-preview-text">
          {lastOutput.slice(0, 100)}
          {lastOutput.length > 100 && "..."}
        </div>
      );
    }

    return null;
  }, [data.lastOutput]);

  return (
    <BaseNode type="output" data={data} inputs={1} outputs={0}>
      <div className="output-node-body">
        <div className="output-type-badge">{getOutputTypeLabel()}</div>

        {renderPreview && <div className="output-preview">{renderPreview}</div>}
      </div>
    </BaseNode>
  );
}

export default memo(OutputNode);
