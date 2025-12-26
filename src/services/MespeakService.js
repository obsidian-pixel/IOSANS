/**
 * MespeakService - Local Text-to-Speech using mespeak.js
 * Generates actual audio data (WAV) that can be saved as files
 */

let mespeakLoaded = false;
let loadPromise = null;
let meSpeak = null;

/**
 * Load mespeak library and voice data
 */
async function loadMespeak() {
  if (mespeakLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // Dynamically import mespeak
      const mespeakModule = await import("mespeak");
      meSpeak = mespeakModule.default || mespeakModule;

      // Load config and voice from public folder
      // These are copied from node_modules/mespeak to public/mespeak
      const configResponse = await fetch("/mespeak/mespeak_config.json");
      if (!configResponse.ok) {
        throw new Error(
          `Failed to load mespeak config: ${configResponse.status}`
        );
      }
      const config = await configResponse.json();

      const voiceResponse = await fetch("/mespeak/voices/en/en-us.json");
      if (!voiceResponse.ok) {
        throw new Error(
          `Failed to load mespeak voice: ${voiceResponse.status}`
        );
      }
      const voiceData = await voiceResponse.json();

      meSpeak.loadConfig(config);
      meSpeak.loadVoice(voiceData);

      mespeakLoaded = true;
      window.meSpeak = meSpeak;
      console.log("[MespeakService] Loaded successfully");
      return true;
    } catch (error) {
      console.error("[MespeakService] Failed to load mespeak:", error);
      // Reset so we can retry
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Convert text to WAV audio blob using mespeak
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Voice options
 * @returns {Promise<{blob: Blob, duration: number, mimeType: string, text: string}>}
 */
export async function textToAudio(text, options = {}) {
  await loadMespeak();

  const {
    pitch = 50, // 0-99, default 50
    speed = 175, // words per minute, default 175
    amplitude = 100, // 0-200, default 100
    wordgap = 0, // pause between words in 10ms units
  } = options;

  return new Promise((resolve, reject) => {
    try {
      if (!meSpeak || !meSpeak.speak) {
        reject(new Error("mespeak not loaded"));
        return;
      }

      // Generate audio as complete WAV file ArrayBuffer
      // rawdata: true returns the complete WAV file as Uint8Array
      const wavData = meSpeak.speak(text, {
        rawdata: true, // Returns complete WAV file as ArrayBuffer
        pitch: Math.round(pitch),
        speed: Math.round(speed),
        amplitude: Math.round(amplitude),
        wordgap: Math.round(wordgap),
      });

      if (!wavData || wavData.length === 0) {
        reject(new Error("Failed to generate audio - no data returned"));
        return;
      }

      // Create Blob directly from WAV data (it's already a complete WAV file)
      const wavBlob = new Blob([wavData], { type: "audio/wav" });

      // Estimate duration from WAV data size
      // WAV format: 22050 Hz, 16-bit mono = 44100 bytes per second
      // Header is typically 44 bytes
      const dataSize = wavData.byteLength - 44;
      const duration = Math.max(0.1, dataSize / 44100);

      console.log(
        `[MespeakService] Generated ${wavBlob.size} bytes, ~${duration.toFixed(
          1
        )}s`
      );

      resolve({
        blob: wavBlob,
        mimeType: "audio/wav",
        duration: duration,
        text: text,
      });
    } catch (error) {
      console.error("[MespeakService] speak error:", error);
      reject(error);
    }
  });
}

/**
 * Get available voices
 */
export function getAvailableVoices() {
  return [
    { id: "en/en-us", name: "English (US)", language: "en-US" },
    { id: "en/en", name: "English (UK)", language: "en-GB" },
    { id: "de", name: "German", language: "de" },
    { id: "es", name: "Spanish", language: "es" },
    { id: "fr", name: "French", language: "fr" },
    { id: "it", name: "Italian", language: "it" },
  ];
}

/**
 * Check if mespeak is loaded and ready
 */
export function isReady() {
  return mespeakLoaded;
}

/**
 * Preload mespeak (can be called early to avoid delay)
 */
export async function preload() {
  try {
    await loadMespeak();
    return true;
  } catch {
    return false;
  }
}

export default {
  textToAudio,
  getAvailableVoices,
  isReady,
  preload,
};
