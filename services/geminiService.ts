import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio } from "../types";

// Helper to get the AI client. 
// We accept an optional key parameter to support user-entered keys.
const getAiClient = (explicitKey?: string) => {
  const apiKey = explicitKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select a project or enter a key in settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to decode base64 audio
const decodeAudio = (base64String: string): Uint8Array => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return false; // Fallback or dev environment without the injected script
};

export const openApiKeySelection = async () => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  } else {
    console.warn("AI Studio key selection not available in this environment.");
  }
};

export const enhancePrompt = async (apiKey: string | undefined, input: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ parts: [{ text: input }] }],
    config: {
      systemInstruction: "You are an expert prompt engineer for video generation models. Convert the user's short input or keywords into a detailed, visually rich prompt suitable for generating a video. Focus on movement, lighting, camera angles, and atmosphere. Keep the result concise (max 2-3 sentences). Output ONLY the enhanced prompt text.",
    },
  });
  return response.text || input;
};

export const generateVeoVideo = async (
  apiKey: string | undefined,
  prompt: string,
  imageBase64: string,
  mimeType: string,
  aspectRatio: AspectRatio,
  onProgress: (msg: string) => void
): Promise<string> => {
  const ai = getAiClient(apiKey);
  
  onProgress("Initializing video generation...");

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt || "Animate this image", 
    image: {
      imageBytes: imageBase64,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p', // '720p' or '1080p'
      aspectRatio: aspectRatio,
    }
  });

  onProgress("Rendering video... This may take a moment.");

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
    onProgress("Still rendering...");
    // Refresh operation status
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if (operation.error) {
    throw new Error(operation.error.message || "Video generation failed");
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("No video URI returned from the API.");
  }

  // The URI needs the API key appended to be accessible
  // If we have an explicit key, use it. Otherwise use the env one (which might be null if strictly relying on explicit).
  // Ideally, getAiClient handles the check, but here we need the string.
  const effectiveKey = apiKey || process.env.API_KEY;
  return `${videoUri}&key=${effectiveKey}`;
};

export const generateTextToSpeech = async (apiKey: string | undefined, text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = getAiClient(apiKey);
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data generated.");
  }

  // Convert base64 to blob URL for playback
  const audioBytes = decodeAudio(base64Audio);
  
  const wavBlob = pcmToWav(audioBytes, 24000);
  return URL.createObjectURL(wavBlob);
};

export const generateClonedSpeech = async (
  apiKey: string | undefined,
  text: string,
  audioBase64: string,
  mimeType: string
): Promise<string> => {
  const ai = getAiClient(apiKey);
  
  // Using the native audio model which supports multimodal input and audio output.
  // This allows us to pass a reference audio file and ask the model to mimic it.
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    contents: [
      {
        parts: [
          {
             inlineData: {
               mimeType: mimeType,
               data: audioBase64
             }
          },
          {
            text: `Please read the following text. Mimic the voice, tone, and speaking style of the speaker in the provided audio clip as closely as possible. Text to read: "${text}"`
          }
        ]
      }
    ],
    config: {
      responseModalities: [Modality.AUDIO],
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data generated.");
  }

  const audioBytes = decodeAudio(base64Audio);
  
  // Native audio model often outputs 24kHz.
  const wavBlob = pcmToWav(audioBytes, 24000);
  return URL.createObjectURL(wavBlob);
};

// Simple PCM to WAV converter for immediate playback compatibility
const pcmToWav = (pcmData: Uint8Array, sampleRate: number): Blob => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};