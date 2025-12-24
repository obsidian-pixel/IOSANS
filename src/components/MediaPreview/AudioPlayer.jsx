/**
 * AudioPlayer Component
 * Renders audio artifacts with waveform visualization and playback controls
 */
import { useState, useRef, useEffect, memo } from "react";
import "./AudioPlayer.css";

function AudioPlayer({ data, artifactId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Handle speech synthesis playback for speech artifacts
  const isSpeechArtifact =
    data?.type === "speech" || data?.mimeType === "audio/speech";

  useEffect(() => {
    const interval = progressInterval.current;
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      // Cancel any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (isSpeechArtifact) {
      // Use Web Speech API
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(data.text);
      utterance.rate = data.speed || 1.0;
      utterance.pitch = data.pitch || 1.0;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        setProgress(100);
      };

      // Estimate duration (rough: ~150 words per minute)
      const words = data.text?.split(/\s+/).length || 0;
      const estimatedDuration = (words / 150) * 60;
      setDuration(estimatedDuration);

      window.speechSynthesis.speak(utterance);
    } else if (audioRef.current) {
      // Regular audio file
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
      setDuration(total);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-player">
      <div className="audio-player-header">
        <span className="audio-icon">🔊</span>
        <span className="audio-title">
          {isSpeechArtifact ? "Speech" : "Audio"}
        </span>
        {artifactId && (
          <span className="audio-id">{artifactId.slice(0, 12)}...</span>
        )}
      </div>

      {/* Waveform visualization (simplified) */}
      <div className="audio-waveform">
        <div className="waveform-bars">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`waveform-bar ${isPlaying ? "active" : ""}`}
              style={{
                height: `${20 + Math.sin(i * 0.5) * 15 + (i % 3) * 5}px`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
        <div className="progress-overlay" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="audio-controls">
        <button
          className={`play-btn ${isPlaying ? "playing" : ""}`}
          onClick={handlePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="time-display">
          <span className="current-time">
            {formatTime((progress / 100) * duration)}
          </span>
          <span className="separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Hidden audio element for regular audio files */}
      {!isSpeechArtifact && data?.url && (
        <audio
          ref={audioRef}
          src={data.url}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(100);
          }}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        />
      )}

      {/* Text preview for speech */}
      {isSpeechArtifact && data?.text && (
        <div className="speech-text">
          "
          {data.text.length > 100 ? data.text.slice(0, 100) + "..." : data.text}
          "
        </div>
      )}
    </div>
  );
}

export default memo(AudioPlayer);
