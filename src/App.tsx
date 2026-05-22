import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceSettings, AudioChunk, ExportFormat } from './types';
import VoiceSettingsPanel from './components/VoiceSettingsPanel';
import DocumentWorkspace from './components/DocumentWorkspace';
import AudioTimeline from './components/AudioTimeline';
import { Headphones, Sparkles, BookOpen, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { base64ToInt16Array, pcmToWav, pcmToMp3, concatenatePCMParts } from './utils/audio';

export default function App() {
  const [text, setText] = useState<string>('');
  const [title, setTitle] = useState<string>('Untitled Audiobook');
  const [settings, setSettings] = useState<VoiceSettings>({
    voiceName: 'Kore',
    accent: 'American',
    mood: 'Standard',
    speed: 'Medium',
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isSplitted, setIsSplitted] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  
  const [isCombining, setIsCombining] = useState<boolean>(false);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Checks and verifies if backend is available
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (!data.apiConfigured) {
          setApiError("The Gemini API Key is not set in secrets. Please configure GEMINI_API_KEY inside the Secrets settings panel.");
        }
      })
      .catch(err => {
        console.error("Backend health integration failed:", err);
      });
  }, []);

  // Clear compiled master files whenever target settings, voices, or paragraph models are updated
  useEffect(() => {
    if (combinedAudioUrl) {
      URL.revokeObjectURL(combinedAudioUrl);
      setCombinedAudioUrl(null);
    }
  }, [settings, exportFormat]);

  // Document Chunking Parser: split paragraphs gracefully down to manageable 2000-character segments
  const handleSplitDocument = () => {
    if (text.trim().length === 0) return;
    
    // Split into structural paragraphs first
    const rawParagraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
      
    const finalChunks: AudioChunk[] = [];
    let chunkCount = 0;

    // Failsafe sub-splitter recursively split any chunk segment exceeding 2000 chars cleanly
    const tsplit = (str: string, limit = 2000): string[] => {
      if (str.length <= limit) return [str];
      let boundary = str.lastIndexOf(' ', limit);
      if (boundary === -1) boundary = limit;
      return [
        str.substring(0, boundary).trim(),
        ...tsplit(str.substring(boundary).trim(), limit)
      ].filter(s => s.length > 0);
    };

    for (const para of rawParagraphs) {
      // Chunk-prevention threshold: split paragraph by sentences if it exceeds 2000 characters
      if (para.length <= 2000) {
        finalChunks.push({
          id: `chunk_${Date.now()}_${chunkCount}`,
          index: chunkCount,
          text: para,
          status: 'pending',
        });
        chunkCount++;
      } else {
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
        let subChunkText = '';
        
        for (const sentence of sentences) {
          if (subChunkText.length + sentence.length <= 2000) {
            subChunkText += sentence;
          } else {
            if (subChunkText.trim().length > 0) {
              const parts = tsplit(subChunkText.trim(), 2000);
              for (const part of parts) {
                finalChunks.push({
                  id: `chunk_${Date.now()}_${chunkCount}`,
                  index: chunkCount,
                  text: part,
                  status: 'pending',
                });
                chunkCount++;
              }
            }
            subChunkText = sentence;
          }
        }
        
        if (subChunkText.trim().length > 0) {
          const parts = tsplit(subChunkText.trim(), 2000);
          for (const part of parts) {
            finalChunks.push({
              id: `chunk_${Date.now()}_${chunkCount}`,
              index: chunkCount,
              text: part,
              status: 'pending',
                });
            chunkCount++;
          }
        }
      }
    }

    setChunks(finalChunks);
    setIsSplitted(true);
    if (combinedAudioUrl) {
      URL.revokeObjectURL(combinedAudioUrl);
      setCombinedAudioUrl(null);
    }
  };

  const handleUpdateChunkText = (id: string, newText: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text: newText, status: 'pending' as const, audioUrl: undefined, pcmDataBase64: undefined } : c))
    );
    if (combinedAudioUrl) {
      URL.revokeObjectURL(combinedAudioUrl);
      setCombinedAudioUrl(null);
    }
  };

  // Synthesizes a single chunk using the backend Gemini proxy
  const handleGenerateChunk = async (chunkId: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === chunkId ? { ...c, status: 'generating', errorMsg: undefined } : c))
    );
    if (combinedAudioUrl) {
      setCombinedAudioUrl(null);
    }

    const chunk = chunks.find((c) => c.id === chunkId);
    if (!chunk) return;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: chunk.text,
          voiceName: settings.voiceName,
          accent: settings.accent,
          mood: settings.mood,
          speed: settings.speed,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server returned error status ${res.status}`);
      }

      const data = await res.json();
      const pcmData = base64ToInt16Array(data.audioDataBase64);
      
      // Pack immediately to standard single WAVE container
      const wavBlob = pcmToWav(pcmData);
      const url = URL.createObjectURL(wavBlob);

      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId
            ? {
                ...c,
                status: 'ready',
                audioUrl: url,
                pcmDataBase64: data.audioDataBase64,
              }
            : c
        )
      );
    } catch (error: any) {
      console.error(`Error generating chunk ${chunkId}:`, error);
      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId
            ? {
                ...c,
                status: 'error',
                errorMsg: error.message || 'Speech generation failed',
              }
            : c
        )
      );
    }
  };

  // Sequentially generates all chunks to prevent overwhelming the server / rate limiters
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setApiError(null);
    
    // Clear combined audio first
    if (combinedAudioUrl) {
      setCombinedAudioUrl(null);
    }

    try {
      for (const chunk of chunks) {
        // Skip already ready chunks to conserve computation & quota limits
        if (chunk.status === 'ready') continue;
        await handleGenerateChunk(chunk.id);
      }
    } catch (e: any) {
      setApiError("Sequential pipeline was halted early: " + e.message);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Compile individual elements together seamlessly
  const handleCombineAll = async () => {
    const readyChunks = chunks.filter((c) => c.status === 'ready' && c.pcmDataBase64);
    if (readyChunks.length === 0) return;

    setIsCombining(true);
    try {
      const parts = readyChunks.map((c) => c.pcmDataBase64!);
      const concatenatedPCM = concatenatePCMParts(parts);

      let finalBlob: Blob;
      if (exportFormat === 'mp3') {
        finalBlob = pcmToMp3(concatenatedPCM);
      } else {
        finalBlob = pcmToWav(concatenatedPCM);
      }

      const url = URL.createObjectURL(finalBlob);
      setCombinedAudioUrl(url);
    } catch (err: any) {
      console.error("Master concatenation failed:", err);
      setApiError("Failed to concatenate segments: " + err.message);
    } finally {
      setIsCombining(false);
    }
  };

  // Total word counts
  const totalWords = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="min-h-screen bg-[#F4F4F7] text-[#1A1A1E] font-sans flex flex-col selection:bg-indigo-100/50">
      
      {/* Pristine Minimalist Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="text-[#4F46E5]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span className="font-bold text-[20px] tracking-[-0.02em] text-[#1A1A1E]">VoxFlow</span>
          </div>

          <nav className="hidden md:flex gap-6 font-medium text-sm text-[#6B7280]">
            <span className="hover:text-[#1A1A1E] transition cursor-pointer">Library</span>
            <span className="hover:text-[#1A1A1E] transition cursor-pointer">Voices</span>
            <span className="hover:text-[#1A1A1E] transition cursor-pointer">Usage</span>
            <span className="text-[#4F46E5] font-semibold hover:opacity-85 transition cursor-pointer">Upgrade</span>
          </nav>
        </div>
      </header>

      {/* Main Studio Body Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-8 py-8 w-full flex flex-col space-y-6">
        
        {/* Verification and Alerts Warning */}
        {apiError && (
          <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 flex items-start gap-3 text-amber-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-4xl mx-auto w-full">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block font-semibold">Active Operational Settings Notice</strong>
              <p className="mt-0.5 leading-normal">{apiError}</p>
            </div>
          </div>
        )}

        {/* Dashboard Main Grid Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Primary Content Workspace */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-6">
            <DocumentWorkspace
              text={text}
              onChangeText={setText}
              title={title}
              onChangeTitle={setTitle}
              onSplit={handleSplitDocument}
              isSplitted={isSplitted}
              isGenerating={isGeneratingAll}
            />

            {/* Introductory instructions shown only when workspace is empty */}
            {text.length === 0 && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-[#4F46E5]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1A1A1E] uppercase tracking-wider">Quick Guide to Conversion</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                    Paste or load any text document. Once you click <strong>Generate Conversational Audio</strong>, our engine parses the script and creates isolated paragraphs (modules) so you can synthesize and refine them in steps.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Controls, Voices & Download Timelines */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-6">
            
            <VoiceSettingsPanel
              settings={settings}
              onChange={setSettings}
              exportFormat={exportFormat}
              onChangeFormat={setExportFormat}
              isGenerating={isGeneratingAll || isCombining}
            />

            {/* Split Queue Audio Timelines */}
            <AnimatePresence mode="wait">
              {isSplitted && chunks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AudioTimeline
                    chunks={chunks}
                    exportFormat={exportFormat}
                    onUpdateChunkText={handleUpdateChunkText}
                    onGenerateChunk={handleGenerateChunk}
                    onGenerateAll={handleGenerateAll}
                    isGeneratingAll={isGeneratingAll}
                    combinedAudioBlob={null}
                    combinedAudioUrl={combinedAudioUrl}
                    onCombineAll={handleCombineAll}
                    isCombining={isCombining}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* Modern Minimalist Footer Section */}
      <footer className="mt-auto border-t border-[#E5E7EB] bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#9CA3AF] font-medium tracking-wide">
          <p>© 2026 VoxFlow. Clean Minimalism Voice Platform.</p>
          <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
            <span>Gemini Audio API</span>
            <span className="text-[#E5E7EB]">•</span>
            <span>24kHz Studio Quality PCM</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
