import React from 'react';
import { VoiceSettings, VoiceName, Accent, Mood, AudioSpeed, ExportFormat } from '../types';
import { Volume2, Sparkles, MapPin, Gauge, Download } from 'lucide-react';

interface VoiceSettingsPanelProps {
  settings: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
  exportFormat: ExportFormat;
  onChangeFormat: (format: ExportFormat) => void;
  isGenerating: boolean;
}

// User-friendly voice profiles
export const VOICES: { id: VoiceName; label: string; gender: 'Female' | 'Male'; desc: string; sample: string }[] = [
  { id: 'Kore', label: 'Kore', gender: 'Female', desc: 'Bright, clear, professional & highly articulate.', sample: 'Standard narrator' },
  { id: 'Zephyr', label: 'Zephyr', gender: 'Female', desc: 'Soft, gentle, calm & soothing delivery.', sample: 'Storytelling & wellness' },
  { id: 'Puck', label: 'Puck', gender: 'Male', desc: 'Warm, balanced, inviting mid-frequency tone.', sample: 'Conversational reading' },
  { id: 'Charon', label: 'Charon', gender: 'Male', desc: 'Deep, resonant, authoritative & steady voice.', sample: 'Formal presentations' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'Male', desc: 'Energetic, expressive, and slightly rugged.', sample: 'Dramatic readings' },
];

export const ACCENTS: { id: Accent; label: string; desc: string }[] = [
  { id: 'American', label: 'American', desc: 'Standard General American pronunciation' },
  { id: 'British', label: 'British', desc: 'Received Pronunciation / UK English alignment' },
  { id: 'Australian', label: 'Australian', desc: 'Aussie English inflection & rhythm' },
  { id: 'Canadian', label: 'Canadian', desc: 'Standard Canadian English accent' },
  { id: 'Irish', label: 'Irish', desc: 'Warm, melodic Hiberno-English lilt' },
  { id: 'Indian', label: 'Indian', desc: 'Clear Indian English accentuation' },
];

export const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'Standard', label: 'Standard', emoji: '🎙️' },
  { id: 'Professional', label: 'Professional', emoji: '💼' },
  { id: 'Cheerful', label: 'Cheerful', emoji: '☀️' },
  { id: 'Calm', label: 'Calm', emoji: '🍃' },
  { id: 'Serious', label: 'Serious', emoji: '👔' },
  { id: 'Energetic', label: 'Energetic', emoji: '⚡' },
];

export const SPEEDS: { id: AudioSpeed; label: string; factor: string }[] = [
  { id: 'Slow', label: 'Comfortable & Slow', factor: '0.85x' },
  { id: 'Medium', label: 'Natural / Standard', factor: '1.0x' },
  { id: 'Fast', label: 'Quick / Dynamic', factor: '1.2x' },
];

export default function VoiceSettingsPanel({
  settings,
  onChange,
  exportFormat,
  onChangeFormat,
  isGenerating,
}: VoiceSettingsPanelProps) {
  
  const updateSetting = <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div id="voice-settings-panel" className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6 select-none">
      
      {/* 1. Voice Selection */}
      <div className="space-y-3">
        <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] block">
          Voice Selection
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-1 md:grid-cols-5">
          {VOICES.map((v) => {
            const isSelected = settings.voiceName === v.id;
            return (
              <button
                key={v.id}
                type="button"
                id={`voice-btn-${v.id.toLowerCase()}`}
                disabled={isGenerating}
                onClick={() => updateSetting('voiceName', v.id)}
                className={`p-3 text-left rounded-lg transition-all duration-200 border text-xs cursor-pointer ${
                  isSelected
                    ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#1F2937] font-semibold'
                    : 'border-[#F3F4F6] hover:border-[#D1D5DB] hover:bg-slate-50 bg-[#FFF] text-[#4B5563]'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[#1F2937]">{v.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    v.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {v.gender}
                  </span>
                </div>
                <p className="text-[10px] text-[#6B7280] leading-snug line-clamp-2 mt-1 font-normal">{v.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        
        {/* 2. Accent Tuning */}
        <div className="space-y-3">
          <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] block">
            Regional Dialect
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ACCENTS.map((acc) => {
              const isSelected = settings.accent === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  id={`accent-btn-${acc.id.toLowerCase()}`}
                  disabled={isGenerating}
                  onClick={() => updateSetting('accent', acc.id)}
                  className={`p-2.5 text-center text-xs rounded-lg border transition duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-slate-50 bg-[#FFF] text-[#4B5563]'
                  }`}
                >
                  <div className="truncate font-medium">{acc.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Emotional Tone & Mood */}
        <div className="space-y-3">
          <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] block">
            Conversational Mood
          </span>
          <div className="grid grid-cols-3 gap-2">
            {MOODS.map((m) => {
              const isSelected = settings.mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  id={`mood-btn-${m.id.toLowerCase()}`}
                  disabled={isGenerating}
                  onClick={() => updateSetting('mood', m.id)}
                  className={`p-2 text-center text-xs rounded-lg border transition duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-slate-50 bg-[#FFF] text-[#4B5563]'
                  }`}
                >
                  <span className="text-sm">{m.emoji}</span>
                  <span className="truncate max-w-full text-[10px] font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#F3F4F6]">
        
        {/* 4. Speaking Speed */}
        <div className="space-y-3">
          <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] block">
            Speed & Pace
          </span>
          <div className="grid grid-cols-3 gap-2">
            {SPEEDS.map((sp) => {
              const isSelected = settings.speed === sp.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  id={`speed-btn-${sp.id.toLowerCase()}`}
                  disabled={isGenerating}
                  onClick={() => updateSetting('speed', sp.id)}
                  className={`p-2 rounded-lg border transition duration-150 text-center cursor-pointer ${
                    isSelected
                      ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-slate-50 bg-[#FFF] text-[#4B5563]'
                  }`}
                >
                  <div className="text-xs truncate font-semibold">{sp.label.split(' ').pop()}</div>
                  <div className="text-[9px] text-[#6B7280] font-normal">{sp.factor}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Production Export Format */}
        <div className="space-y-3">
          <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] block">
            Export Format
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="format-btn-wav"
              disabled={isGenerating}
              onClick={() => onChangeFormat('wav')}
              className={`p-2 rounded-lg border transition duration-150 text-left cursor-pointer ${
                exportFormat === 'wav'
                  ? 'border-[#1F2937] bg-[#1F2937] text-[#FFF]'
                  : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-slate-50 bg-[#FFF] text-[#4B5563]'
              }`}
            >
              <div className="text-xs font-semibold">WAV (Lossless)</div>
              <div className={`text-[9px] mt-0.5 ${exportFormat === 'wav' ? 'text-indigo-200' : 'text-slate-400'}`}>High Quality Master</div>
            </button>
            <button
              type="button"
              id="format-btn-mp3"
              disabled={isGenerating}
              onClick={() => onChangeFormat('mp3')}
              className={`p-2 rounded-lg border transition duration-150 text-left cursor-pointer ${
                exportFormat === 'mp3'
                  ? 'border-[#1F2937] bg-[#1F2937] text-[#FFF]'
                  : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-slate-50 bg-[#FFF] text-[#4B5563]'
              }`}
            >
              <div className="text-xs font-semibold">MP3 (128kbps)</div>
              <div className={`text-[9px] mt-0.5 ${exportFormat === 'mp3' ? 'text-indigo-200' : 'text-slate-400'}`}>Compact Streaming</div>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
