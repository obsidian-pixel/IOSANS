/**
 * TextToSpeechNode Component
 * Convert text to speech with manual play/download controls
 */
import { memo, useState, useCallback } from "react";
import { useNodeId } from "@xyflow/react";
import BaseNode from "../base/BaseNode";
import useExecutionStore from "../../store/executionStore";
import "./TextToSpeechNode.css";

function TextToSpeechNode({ data }) {
  const nodeId = useNodeId();
  const voice = data.voice || "default";
  const speed = data.speed || 1.0;
  const provider = data.provider || "webSpeech";

  // Get execution result for this node
  const nodeResults = useExecutionStore((state) => state.nodeResults);
  const result = nodeResults[nodeId];
  const audioData = result?.output;

  const [isPlaying, setIsPlaying] = useState(false);

  // Play audio using stored utterance
  const handlePlay = useCallback(() => {
    if (!audioData?.audioId) return;

    const stored = window.__ttsAudio?.[audioData.audioId];
    if (!stored) {
      // Create new utterance from text
      const utterance = new SpeechSynthesisUtterance(audioData.text);
      utterance.rate = audioData.speed || 1.0;
      utterance.pitch = audioData.pitch || 1.0;

      utterance.onend = () => {
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent("audioEnd"));
      };
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("audioStart"));
      speechSynthesis.speak(utterance);
      return;
    }

    const { utterance, text } = stored;

    // Create fresh utterance (can't replay same one)
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.rate = utterance.rate;
    newUtterance.pitch = utterance.pitch;
    if (utterance.voice) newUtterance.voice = utterance.voice;

    newUtterance.onend = () => {
      setIsPlaying(false);
      window.dispatchEvent(new CustomEvent("audioEnd"));
    };
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent("audioStart"));
    speechSynthesis.speak(newUtterance);
  }, [audioData]);

  // Stop playback
  const handleStop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    window.dispatchEvent(new CustomEvent("audioEnd"));
  }, []);

  // Download as text file (Web Speech can't export audio)
  const handleDownload = useCallback(() => {
    if (!audioData?.text) return;

    // Create a text file with speech content
    const content = `Text to Speech Content\n${"=".repeat(40)}\n\n${
      audioData.text
    }\n\n---\nVoice: ${audioData.voice}\nSpeed: ${audioData.speed}x\nPitch: ${
      audioData.pitch
    }`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "speech-content.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [audioData]);

  const hasAudio = audioData?.canPlay;

  return (
    <BaseNode
      type="textToSpeech"
      data={data}
      inputs={0}
      outputs={0}
      providerOutput={{ id: "tool-out", type: "tool", label: null }}
    >
      <div className="tts-content">
        <div className="tts-icon">🔊</div>

        <div className="tts-config">
          <div className="provider-badge">
            {provider === "webSpeech" ? "Web Speech API" : provider}
          </div>

          <div className="voice-info">
            <span className="voice-label">Voice:</span>
            <span className="voice-name">{voice}</span>
          </div>

          <div className="speed-info">
            {speed !== 1.0 && <span>{speed}x speed</span>}
          </div>
        </div>

        {data.autoPlay && <div className="autoplay-badge">▶️ Auto-play</div>}

        {/* Audio controls - show when audio is ready */}
        {hasAudio && (
          <div className="tts-audio-controls">
            {!isPlaying ? (
              <button className="tts-btn tts-btn-play" onClick={handlePlay}>
                ▶️ Play
              </button>
            ) : (
              <button className="tts-btn tts-btn-stop" onClick={handleStop}>
                ⏹️ Stop
              </button>
            )}
            <button
              className="tts-btn tts-btn-download"
              onClick={handleDownload}
            >
              📥
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(TextToSpeechNode);
