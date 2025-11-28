export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

export enum AppMode {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progressMessage: string;
  videoUri: string | null;
  error: string | null;
}

export interface AudioGenerationState {
  isGenerating: boolean;
  audioUrl: string | null;
  error: string | null;
}

export const VOICES = [
  { name: 'Kore', gender: 'Female', style: 'Calm & Soothing' },
  { name: 'Puck', gender: 'Male', style: 'Energetic & Playful' },
  { name: 'Charon', gender: 'Male', style: 'Deep & Authoritative' },
  { name: 'Fenrir', gender: 'Male', style: 'Fast & Intense' },
  { name: 'Zephyr', gender: 'Female', style: 'Soft & Gentle' },
];

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';