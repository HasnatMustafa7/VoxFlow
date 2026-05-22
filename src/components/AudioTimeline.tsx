import React, { useRef, useState, useEffect } from 'react';
import { AudioChunk, ExportFormat } from '../types';
import {
  Play,
  Pause,
  Download,
  AlertCircle,
  RefreshCw,
  Edit2,
  Check,
  X,
  Loader2,
  Volume2,
  FileAudio,
  CheckCircle2,
  Grid
} from 'lucide-react';
import { pcmToWav, pcmToMp3, base64ToInt16Array, estimateDuration } from '../utils/audio';

interface AudioTimelineProps {
  chunks: AudioChunk[];
  exportFormat: ExportFormat;
  onUpdateChunkText: (id: string, text: string) => void;
  onGenerateChunk: (id: string) => Promise<void>;
  onGenerateAll: () => Promise<void>;
  isGeneratingAll: boolean;
  combinedAudioBlob: Blob | null;
  combinedAudioUrl: string | null;
  onCombineAll: () => void;
  isCombining: boolean;
}

// Mini row player matching standard AudioContext & standard elements
function InlineChunkPlayer({ url, durationSec }: { url: string; durationSec: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error("Playback error:", err));
    }
  };

  return (
    <div id="inline-chunk-player" className="flex items-center gap-3 bg-slate-50 border border-[#E5E7EB] rounded-lg px-3 py-1.5 w-full md:w-auto min-w-[185px]">
      <audio ref={audioRef} src={url} className="hidden" preload="metadata" />
      <button
        type="button"
        id="toggle-play-btn"
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white flex items-center justify-center transition shrink-0 cursor-pointer"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
      </button>

      {/* Progress & Duration Details */}
      <div className="flex-1 min-w-0">
        <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#4F46E5] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-[#6B7280] mt-1 font-bold select-none leading-none">
          <span>{isPlaying ? 'PLAYING' : 'AUDIO READY'}</span>
          <span>{~~durationSec}s</span>
        </div>
      </div>
    </div>
  );
}

export default function AudioTimeline({
  chunks,
  exportFormat,
  onUpdateChunkText,
  onGenerateChunk,
  onGenerateAll,
  isGeneratingAll,
  combinedAudioBlob,
  combinedAudioUrl,
  onCombineAll,
  isCombining,
}: AudioTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Row Edit state triggers
  const startEdit = (id: string, initialText: string) => {
    setEditingId(id);
    setEditingText(initialText);
  };

  const saveEdit = (id: string) => {
    onUpdateChunkText(id, editingText);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const readyCount = chunks.filter((c) => c.status === 'ready').length;
  const isAnyReady = readyCount > 0;
  const allCompleted = isAnyReady && readyCount === chunks.length;

  // Single download format handler
  const handleSingleDownload = (chunk: AudioChunk) => {
    if (!chunk.pcmDataBase64) return;
    try {
      const pcmInt16 = base64ToInt16Array(chunk.pcmDataBase64);
      let blob: Blob;

      if (exportFormat === 'mp3') {
        blob = pcmToMp3(pcmInt16);
      } else {
        blob = pcmToWav(pcmInt16);
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `voice_segment_${chunk.index + 1}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.error("Format download failed:", e);
    }
  };

  const handleMasterDownload = () => {
    if (!combinedAudioUrl) return;
    const link = document.createElement('a');
    link.href = combinedAudioUrl;
    link.download = `combined_document_audio.${exportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="audio-timeline-manager" className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
      
      {/* Master Audio Summary Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-[#F3F4F6] rounded-lg p-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4F46E5] shrink-0">
            <FileAudio className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1A1A1E] uppercase tracking-wider">Queue List</h4>
            <p className="text-[11px] text-[#6B7280] leading-none mt-1">
              {readyCount} of {chunks.length} segments ready • Format: <strong className="text-[#4F46E5] uppercase">{exportFormat}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Synthesize All */}
          <button
            type="button"
            id="timeline-synthesize-all-btn"
            disabled={isGeneratingAll || chunks.length === 0}
            onClick={onGenerateAll}
            className={`py-2 px-3.5 rounded-lg text-xs font-bold border border-[#E5E7EB] bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 ${
              isGeneratingAll || chunks.length === 0
                ? 'opacity-55 cursor-not-allowed'
                : ''
            }`}
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                <span>Generate All</span>
              </>
            )}
          </button>

          {/* Merge & Download */}
          {isAnyReady && (
            <button
              type="button"
              id="timeline-combine-btn"
              disabled={isCombining}
              onClick={combinedAudioUrl ? handleMasterDownload : onCombineAll}
              className="py-2.5 px-4 rounded-lg text-xs font-bold transition duration-150 bg-[#4F46E5] hover:bg-[#4338CA] text-white flex items-center gap-1.5 cursor-pointer shadow-[0_2px_4px_rgba(79,70,229,0.1)]"
            >
              {isCombining ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Merging segments...</span>
                </>
              ) : combinedAudioUrl ? (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Audio</span>
                </>
              ) : (
                <>
                  <Grid className="h-3.5 w-3.5" />
                  <span>Compile Chunks</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {combinedAudioUrl && (
        <div id="master-file-alert" className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-800">
          <div className="flex items-start md:items-center gap-2.5 select-none">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 md:mt-0" />
            <div className="text-xs">
              <strong className="block font-semibold">Consolidated Audio Ready!</strong>
              <span className="text-[#4B5563]">Stitched all generated segments together seamlessly.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <InlineChunkPlayer
              url={combinedAudioUrl}
              durationSec={
                estimateDuration(
                  chunks
                    .filter(c => c.status === 'ready' && c.pcmDataBase64)
                    .reduce((sum, c) => sum + (base64ToInt16Array(c.pcmDataBase64!).length), 0)
                )
              }
            />
            <button
              type="button"
              id="master-download-btn"
              onClick={handleMasterDownload}
              className="p-2 bg-[#1F2937] hover:bg-[#111827] text-white rounded-lg transition cursor-pointer"
              title="Download compiled audio"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Paragraph Queue List */}
      <div className="space-y-2.5">
        {chunks.map((chunk, index) => {
          const isEditing = editingId === chunk.id;
          const isPending = chunk.status === 'pending';
          const isGenerating = chunk.status === 'generating';
          const isReady = chunk.status === 'ready';
          const isError = chunk.status === 'error';

          // calculate duration for inline playback
          const rawSamplesLength = chunk.pcmDataBase64 ? base64ToInt16Array(chunk.pcmDataBase64).length : 0;
          const duration = estimateDuration(rawSamplesLength);

          return (
            <div
              key={chunk.id}
              id={`chunk-row-${index}`}
              className={`p-4 rounded-lg border transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isGenerating
                  ? 'border-indigo-300 bg-[#EEF2FF]'
                  : isReady
                  ? 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  : isError
                  ? 'border-rose-200 bg-rose-50/25'
                  : 'border-[#F3F4F6] bg-slate-50/55'
              }`}
            >
              {/* Left Column: Number and Text editor/display */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-2 select-none">
                  <span className="text-[10px] uppercase tracking-[0.05em] font-extrabold text-[#9CA3AF]">
                    Paragraph {index + 1}
                  </span>
                  {isGenerating && (
                    <span className="text-[9px] bg-[#EEF2FF] text-[#4F46E5] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse inline-flex items-center gap-1 leading-none">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Generating
                    </span>
                  )}
                  {isReady && (
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1 leading-none">
                      Completed
                    </span>
                  )}
                  {isError && (
                    <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1 leading-none">
                      Error
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <textarea
                      id={`textarea-edit-${index}`}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full text-xs text-[#374151] bg-white border border-[#4F46E5] rounded-lg p-2.5 focus:outline-none leading-relaxed resize-y min-h-[60px]"
                    />
                    <div className="flex flex-col gap-1 shrink-0 select-none">
                      <button
                        type="button"
                        id={`save-edit-btn-${index}`}
                        onClick={() => saveEdit(chunk.id)}
                        className="p-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        id={`cancel-edit-btn-${index}`}
                        onClick={cancelEdit}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#4B5563] leading-relaxed font-sans line-clamp-3 select-text w-full">
                    {chunk.text}
                  </p>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-3 justify-end shrink-0 select-none">
                {/* Custom Inline Player for ready chunks */}
                {isReady && chunk.audioUrl && (
                  <InlineChunkPlayer url={chunk.audioUrl} durationSec={duration} />
                )}

                {isError && (
                  <div className="flex items-center gap-1.5 text-rose-600 mr-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] max-w-[150px] truncate leading-none" title={chunk.errorMsg}>
                      {chunk.errorMsg || 'Speech failed'}
                    </span>
                  </div>
                )}

                {/* Inline Action Row */}
                <div className="flex items-center gap-1.5">
                  {!isEditing && !isGenerating && (
                    <button
                      type="button"
                      id={`edit-chunk-btn-${index}`}
                      onClick={() => startEdit(chunk.id, chunk.text)}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                      title="Edit text"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {(isPending || isError || isReady) && (
                    <button
                      type="button"
                      id={`renew-chunk-btn-${index}`}
                      disabled={isGeneratingAll}
                      onClick={() => onGenerateChunk(chunk.id)}
                      className={`p-2 rounded-lg transition flex items-center justify-center cursor-pointer ${
                        isGeneratingAll
                          ? 'text-slate-300 cursor-not-allowed'
                          : isReady
                          ? 'hover:bg-slate-100 text-slate-400 hover:text-[#4F46E5]'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-semibold'
                      }`}
                      title={isReady ? 'Regenerate section' : 'Synthesize section'}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isReady && chunk.pcmDataBase64 && (
                    <button
                      type="button"
                      id={`download-chunk-btn-${index}`}
                      onClick={() => handleSingleDownload(chunk)}
                      className="p-2 hover:bg-indigo-50 hover:text-[#4F46E5] text-slate-400 rounded-lg transition cursor-pointer"
                      title={`Download segment as ${exportFormat.toUpperCase()}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
