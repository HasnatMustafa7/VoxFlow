export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
export type Accent = 'American' | 'British' | 'Australian' | 'Canadian' | 'Irish' | 'Indian';
export type Mood = 'Standard' | 'Professional' | 'Cheerful' | 'Calm' | 'Serious' | 'Energetic';
export type AudioSpeed = 'Slow' | 'Medium' | 'Fast';
export type ExportFormat = 'wav' | 'mp3';

export interface VoiceSettings {
  voiceName: VoiceName;
  accent: Accent;
  mood: Mood;
  speed: AudioSpeed;
}

export interface AudioChunk {
  id: string;
  index: number;
  text: string;
  status: 'pending' | 'generating' | 'ready' | 'error';
  errorMsg?: string;
  audioUrl?: string; // Blob URL
  pcmDataBase64?: string; // Raw base64 PCM from server (to combine later)
}

export interface TTSProject {
  id: string;
  title: string;
  text: string;
  settings: VoiceSettings;
  chunks: AudioChunk[];
  createdAt: string;
}
