import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  centered?: boolean;
  skillTag?: string | null;
  onClearSkill?: () => void;
  defaultValue?: string;
  onFocus?: () => void;
}

export default function ChatInput({ onSend, disabled, centered, skillTag, onClearSkill, defaultValue, onFocus }: ChatInputProps) {
  const [input, setInput] = useState(defaultValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const names = Array.from(files).map(f => f.name).join(', ');
      onSend(`[文件] ${names}`);
      e.target.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const names = Array.from(files).map(f => f.name).join(', ');
      onSend(`[图片] ${names}`);
      e.target.value = '';
    }
  };

  // ===== Centered (home) mode =====
  if (centered) {
    return (
      <div className="px-6 py-4" style={{ flexShrink: 0 }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col rounded-2xl px-5 py-5 border border-slate-200/80 bg-white min-h-[110px]">
            {skillTag && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">
                  {skillTag}
                  <button onClick={onClearSkill} className="hover:text-slate-800 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              placeholder=""
              rows={3}
              disabled={disabled}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-700 py-1 leading-relaxed max-h-[200px]"
            />

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                {/* File upload */}
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  title="添加文件"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                {/* Image upload */}
                <input ref={imageInputRef} type="file" multiple className="hidden" onChange={handleImageChange} accept="image/*" />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  title="添加图片"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || disabled}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                  ${input.trim() && !disabled
                    ? 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Bottom (conversation) mode =====
  return (
    <div className="border-t border-slate-100 bg-white px-4 py-3" style={{ flexShrink: 0 }}>
      <div className="max-w-4xl mx-auto">
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md" />
        <input ref={imageInputRef} type="file" multiple className="hidden" onChange={handleImageChange} accept="image/*" />

        {/* Input container */}
        <div className="flex items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 focus-within:border-slate-300 focus-within:bg-white transition-all duration-200">
          {skillTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full border border-slate-200 flex-shrink-0">
              {skillTag}
              <button onClick={onClearSkill} className="hover:text-slate-800 transition-colors">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {/* Upload buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="添加文件"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="添加图片"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder=""
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-700 py-0.5 leading-relaxed max-h-[200px]"
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
                ${input.trim() && !disabled
                  ? 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
