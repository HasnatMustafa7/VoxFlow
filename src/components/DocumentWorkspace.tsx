import React, { useRef, useState } from 'react';
import { FileText, Trash2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface DocumentWorkspaceProps {
  text: string;
  onChangeText: (text: string) => void;
  title: string;
  onChangeTitle: (title: string) => void;
  onSplit: () => void;
  isSplitted: boolean;
  isGenerating: boolean;
}

const DOCUMENT_SAMPLES = [
  {
    title: "Eco Retreat Announcement",
    text: "Welcome to the Whispering Pines Sanctuary. Tucked away under an emerald canopy, our eco-retreat offers complete digital disconnect. Guests can wander down quiet streamside walkways, join sunrise vinyasa sessions, or simply rest next to a cozy stone hearth. Dinner features hand-harvested woodland ingredients, prepared slowly over an open-air woodfire grill. We look forward to guiding you through a peaceful stay.",
  },
  {
    title: "Artificial Intelligence Insight",
    text: "In the next decade, technology will transition from responsive tools to collaborative partners. This evolution is driven by unified models that merge comprehension of written text, natural spoken language, and real-time visual streams. By shifting computation from basic retrieval to rigorous step-by-step reasoning, systems can now assist humans in solving complex scientific, medical, and environmental challenges.",
  },
  {
    title: "Guided Deep Breathing",
    text: "Sit comfortably, resting your hands gently upon your lap. Let your shoulders fall, releasing any tension you've gathered through the day. Gently close your eyes. Now, take a slow, deep breath in, counting to four. Feel your lungs expand fully with fresh, cool air. Hold that breath for a moment... and now, release it slowly through your mouth, letting go of all worry. Good.",
  },
];

export default function DocumentWorkspace({
  text,
  onChangeText,
  title,
  onChangeTitle,
  onSplit,
  isSplitted,
  isGenerating,
}: DocumentWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File Upload Handlers (Supports TXT, MD, JSON or any standard text files)
  const handleFile = (file: File) => {
    if (!file) return;
    setErrorMsg(null);

    // Read only text files or fallback to try reading
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        onChangeText(content);
        // Automatically set title if it was empty or default
        if (!title || title.toLowerCase().includes('untitled')) {
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          onChangeTitle(nameWithoutExt);
        }
      } else {
        setErrorMsg('Failed to read the file as plaintext.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('An error occurred while reading the file.');
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  // Text formatting helpers (Anti-AI-slop & presentation polish)
  const handleCleanText = () => {
    // Trim, replace redundant multiple spaces and line endings
    let formatted = text
      .replace(/[ \t]+/g, ' ') // replace multiple spaces or tabs
      .replace(/\n\s*\n\s*\n/g, '\n\n') // replace triple newlines with double newlines
      .trim();
    onChangeText(formatted);
  };

  const loadSample = (sample: typeof DOCUMENT_SAMPLES[0]) => {
    onChangeTitle(sample.title);
    onChangeText(sample.text);
  };

  const counts = {
    characters: text.length,
    words: text.trim() === "" ? 0 : text.trim().split(/\s+/).length,
    paragraphs: text.trim() === "" ? 0 : text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
  };

  return (
    <div id="document-workspace" className="bg-[#FFF] rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
      
      {/* Title & Stats Header */}
      <div className="px-6 py-4 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex-1">
          <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] block mb-1">Document Title</span>
          <input
            type="text"
            id="doc-title-input"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Document Title (e.g. Podcast Script)"
            className="w-full font-bold text-[#1A1A1E] text-base focus:outline-none placeholder-[#9CA3AF] border-none p-0"
          />
        </div>
        
        {/* Quick Sample Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-center h-full">
          <span className="text-[11px] text-[#6B7280] font-semibold leading-none">Template:</span>
          {DOCUMENT_SAMPLES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              id={`sample-btn-${idx}`}
              onClick={() => loadSample(sample)}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#F3F4F6] text-[#6B7280] hover:bg-[#EEF2FF] hover:text-[#4F46E5] cursor-pointer transition"
            >
              {sample.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Drag zone / Textarea */}
      <div
        id="drag-file-zone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex flex-col min-h-[300px] transition-all duration-150 ${
          isDragging ? 'bg-[#EEF2FF]' : 'bg-[#FFF]'
        }`}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.md,.rtf,.doc"
          className="hidden"
        />

        {/* Text Area */}
        <textarea
          id="document-textarea"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Paste or import your document text here..."
          className="flex-1 w-full bg-transparent resize-none p-6 sm:p-8 text-[18px] text-[#374151] leading-[1.6] placeholder-slate-400 focus:outline-none select-text border-none focus:ring-0"
        />

        {/* Hover drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#EEF2FF]/95 rounded-xl flex flex-col items-center justify-center space-y-2 z-10">
            <FileText className="h-10 w-10 text-[#4F46E5] animate-bounce" />
            <p className="text-sm font-bold text-[#1A1A1E]">Drop your file here to upload</p>
            <p className="text-xs text-[#6B7280]">Supports text files (.txt, .md)</p>
          </div>
        )}

        {/* Direct Upload Prompt inside empty block */}
        {text.length === 0 && !isDragging && (
          <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
            <button
              type="button"
              id="inside-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              className="pointer-events-auto px-4 py-2 bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#E5E7EB] hover:border-[#D1D5DB] text-[#374151] text-xs font-semibold flex items-center gap-2 hover:bg-[#F9FAFB] cursor-pointer transition"
            >
              <FileText className="h-4 w-4 text-[#9CA3AF]" />
              Import File
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div id="workspace-error-banner" className="mx-6 mb-4 bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Text Toolbar & Counts */}
      <div className="px-6 py-4 border-t border-[#F3F4F6] bg-slate-50/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Statistics info visually aligned with Clean Minimalism stats boxes */}
        <div className="flex items-center gap-6 mt-1 select-none">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider leading-none">Characters</span>
            <span className="text-[14px] font-bold text-[#1F2937] mt-1">{counts.characters}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider leading-none">Word Count</span>
            <span className="text-[14px] font-bold text-[#1F2937] mt-1">{counts.words}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider leading-none">Paragraphs</span>
            <span className="text-[14px] font-bold text-[#1F2937] mt-1">{counts.paragraphs}</span>
          </div>
        </div>

        {/* Live helper buttons */}
        <div className="flex items-center justify-end gap-2.5">
          {text.trim().length > 0 && (
            <>
              <button
                type="button"
                id="doc-clean-whitespace-btn"
                onClick={handleCleanText}
                className="border border-[#E5E7EB] py-2.5 px-3.5 rounded-lg text-[13px] font-medium text-center bg-white cursor-pointer hover:bg-slate-50 transition text-[#374151] flex items-center gap-1.5"
                title="Format spacings, remove redundant tabs & multiple spaces"
              >
                <span>✨ Clean Text</span>
              </button>
              
              <button
                type="button"
                id="doc-clear-btn"
                onClick={() => {
                  onChangeText('');
                  onChangeTitle('Untitled Document');
                }}
                className="border border-[#E5E7EB] py-2.5 px-3.5 rounded-lg text-[13px] font-medium text-center bg-white cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition text-[#374151] flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                <span>Clear</span>
              </button>
            </>
          )}

          <button
            type="button"
            id="doc-analyze-split-btn"
            disabled={text.trim().length === 0 || isGenerating}
            onClick={onSplit}
            className={`py-2.5 px-5 rounded-lg font-bold text-[13px] border-none cursor-pointer flex items-center gap-2 transition duration-150 ${
              text.trim().length === 0 || isGenerating
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white hover:shadow-[0_2px_4px_rgba(79,70,229,0.1)]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Conversational Audio</span>
          </button>
        </div>
      </div>

    </div>
  );
}
