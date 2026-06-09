/**
 * SmartRenderer — renders structured JSON responses as visual card components.
 * "待补充" items become sequential inline fill-in prompts with tag selection.
 */
import { useState, useEffect } from 'react';

// ===== Types =====
interface Section {
  type: 'text' | 'params' | 'questions' | 'table' | 'metrics' | 'confirm' | 'list';
  content?: string;
  headers?: string[];
  rows?: string[][];
  items?: any[];
  message?: string;
}

interface AIResponse {
  stage?: string;
  sections?: Section[];
}

interface SmartRendererProps {
  content: string;
  isStreaming?: boolean;
  onSendMessage?: (text: string) => void;
  onPendingChange?: (hasPending: boolean) => void;
}

// ===== Predefined tag options for common fields =====
const FIELD_TAGS: Record<string, string[]> = {
  '目标人群': ['流失商家', '沉默用户', '活跃客户', '高净值用户', '新注册用户', '逾期客户', '白名单用户', '大额交易客户'],
  '活动周期': ['1周', '2周', '1个月', '双11期间', '618期间', '年末冲刺', '持续投放', '季度活动'],
  '预算范围': ['10万以内', '10-30万', '30-50万', '50-100万', '100万以上'],
  '利益点': ['利率优惠', '费率减免', '额度提升', '专属权益', '积分翻倍', '免息期延长', '新客礼包'],
  '触达渠道': ['短信', '外呼', 'Push', '站内信', '企微', 'APP弹窗'],
};

// ===== Source badge =====
function SourceBadge({ source }: { source: string }) {
  const s = source.trim();
  if (s.includes('用户直说') || s.includes('用户确认')) {
    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-800 text-white">用户直说</span>;
  }
  if (s.includes('AI推断') || s.includes('AI推荐')) {
    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white text-slate-600 border border-slate-200">AI 推断</span>;
  }
  if (s.includes('待明确') || s.includes('待补充') || s.includes('待确认')) {
    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white text-slate-400 border border-slate-200 border-dashed">待补充</span>;
  }
  if (s.includes('默认')) {
    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-50 text-slate-400 border border-slate-150">默认</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-50 text-slate-500 border border-slate-200">{s}</span>;
}

function needsInput(val: string): boolean {
  return /未提供|待明确|待补充|待确认|需补充|请填写|待填/.test(val);
}

// ===== Text section =====
function TextBlock({ content }: { content: string }) {
  return <p className="text-sm text-slate-700 leading-relaxed my-2">{content}</p>;
}

// ===== Params table =====
function ParamsTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const sourceIdx = headers.findIndex(h => /来源|状态/.test(h));

  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden my-2.5">
      <div className="bg-white px-3.5 py-2 border-b border-slate-200">
        <div className="flex text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
          {headers.map((h, i) => (
            <div key={i} className={i === 0 ? 'flex-1' : sourceIdx === i ? 'w-24 text-center' : 'w-36'}>{h}</div>
          ))}
        </div>
      </div>
      {rows.map((row, ri) => {
        return (
          <div key={ri} className="flex px-3.5 py-2.5 border-b border-slate-100 last:border-0 text-sm bg-white">
            {row.map((cell, ci) => (
              <div key={ci} className={ci === 0 ? 'flex-1 text-slate-800 font-medium text-[13px]' : sourceIdx === ci ? 'w-24 flex justify-center' : 'w-36 text-slate-500 text-[13px]'}>
                {ci === sourceIdx
                  ? <SourceBadge source={cell} />
                  : needsInput(cell)
                    ? <span className="text-slate-400 text-xs">—</span>
                    : cell
                }
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ===== Generic data table =====
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden my-2.5">
      <div className="bg-white px-3.5 py-2 border-b border-slate-200">
        <div className="flex text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
          {headers.map((h, i) => <div key={i} className="flex-1">{h}</div>)}
        </div>
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="flex px-3.5 py-2.5 border-b border-slate-50 last:border-0 text-sm bg-white">
          {row.map((cell, ci) => <div key={ci} className="flex-1 text-slate-700 text-[13px]">{cell}</div>)}
        </div>
      ))}
    </div>
  );
}

// ===== Sequential fill-in prompts (with tag selection) =====
interface PendingField {
  label: string;
  placeholder: string;
  tags?: string[];
}

function SequentialFillIn({ fields, onAllDone, onPendingChange }: {
  fields: PendingField[];
  onAllDone: (answers: Record<string, string>) => void;
  onPendingChange?: (hasPending: boolean) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // Notify parent about pending state
  useEffect(() => {
    if (fields.length > 0 && !done) {
      onPendingChange?.(true);
    }
  }, [fields.length, done, onPendingChange]);

  if (done || fields.length === 0) return null;
  const field = fields[activeIdx];
  const hasTags = field.tags && field.tags.length > 0;

  const handleSubmit = () => {
    const value = hasTags && selectedTags.length > 0
      ? selectedTags.join('、')
      : inputVal.trim();
    if (!value) return;

    const newAnswers = { ...answers, [field.label]: value };
    setAnswers(newAnswers);
    setInputVal('');
    setSelectedTags([]);

    if (activeIdx + 1 < fields.length) {
      setActiveIdx(activeIdx + 1);
    } else {
      setDone(true);
      onPendingChange?.(false);
      onAllDone(newAnswers);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const canSubmit = hasTags ? selectedTags.length > 0 : inputVal.trim().length > 0;

  return (
    <div className="mt-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-slate-800 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(activeIdx / fields.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-slate-400 font-medium tabular-nums">{activeIdx + 1}/{fields.length}</span>
      </div>

      {/* Completed fields */}
      {Object.entries(answers).map(([label, value], i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 mb-1.5 rounded-lg bg-white border border-slate-100">
          <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="text-xs text-slate-500 font-medium">{label}</span>
          <span className="text-sm text-slate-800">{value}</span>
        </div>
      ))}

      {/* Active prompt card */}
      {!done && (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">{activeIdx + 1}</span>
            </div>
            <span className="text-sm font-medium text-slate-800">
              请补充「{field.label}」
            </span>
          </div>

          {/* Tag selection */}
          {hasTags && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {field.tags!.map(tag => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-150
                      ${selected
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Text input + submit */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasTags ? '也可手动输入...' : field.placeholder}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-1 focus:ring-slate-200 placeholder:text-slate-400 transition-all"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Questions card =====
function QuestionsCard({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-700">需要你补充</span>
      </div>
      <div className="space-y-2 pl-7">
        {items.map((q, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-slate-400 mt-0.5 text-xs font-medium">{i + 1}.</span>
            <span>{typeof q === 'string' ? q : String(q)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Confirm card =====
function ConfirmCard({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
          <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm text-slate-700 font-medium">{message}</span>
      </div>
    </div>
  );
}

// ===== Metrics row =====
function MetricsRow({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="flex gap-2 my-2.5 flex-wrap">
      {items.map((m, i) => (
        <div key={i} className="flex-1 min-w-[100px] rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium mb-1">{m.label}</div>
          <div className="text-base font-semibold text-slate-800">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

// ===== List section =====
function ListBlock({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5 my-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
          <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
          <span>{typeof item === 'string' ? item : String(item)}</span>
        </div>
      ))}
    </div>
  );
}

// ===== Parse JSON =====
function tryParseJSON(text: string): AIResponse | null {
  try {
    const cleaned = text.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : cleaned;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ===== Extract pending fields from params tables =====
function extractPendingFields(sections: Section[]): PendingField[] {
  const fields: PendingField[] = [];
  for (const s of sections) {
    if (s.type === 'params' && s.rows && s.headers) {
      const sourceIdx = s.headers.findIndex(h => /来源|状态/.test(h));
      for (const row of s.rows) {
        if (sourceIdx >= 0 && needsInput(row[sourceIdx] || '')) {
          const label = row[0];
          fields.push({
            label,
            placeholder: `请输入${label}...`,
            tags: FIELD_TAGS[label] || undefined,
          });
        }
      }
    }
  }
  return fields;
}

// ===== Render from JSON =====
function RenderJSON({ data, onSendMessage, onPendingChange }: {
  data: AIResponse;
  onSendMessage?: (text: string) => void;
  onPendingChange?: (hasPending: boolean) => void;
}) {
  if (!data.sections) return null;
  const pendingFields = extractPendingFields(data.sections);
  const hasQuestions = data.sections.some(s => s.type === 'questions');
  const hasConfirm = data.sections.some(s => s.type === 'confirm');
  const hasPending = pendingFields.length > 0 || hasQuestions || hasConfirm;

  // Notify parent about any pending content (params + questions + confirm)
  useEffect(() => {
    onPendingChange?.(hasPending);
  }, [hasPending, onPendingChange]);

  const handleAllDone = (answers: Record<string, string>) => {
    if (onSendMessage) {
      const summary = Object.entries(answers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('，');
      onSendMessage(summary);
    }
  };

  return (
    <div className="space-y-0.5">
      {data.sections.map((section, idx) => {
        switch (section.type) {
          case 'text':
            return <TextBlock key={idx} content={section.content || ''} />;
          case 'params':
            return <ParamsTable key={idx} headers={section.headers || []} rows={section.rows || []} />;
          case 'table':
            return <DataTable key={idx} headers={section.headers || []} rows={section.rows || []} />;
          case 'questions':
            return <QuestionsCard key={idx} items={section.items || []} />;
          case 'confirm':
            return <ConfirmCard key={idx} message={section.message || ''} />;
          case 'metrics':
            return <MetricsRow key={idx} items={section.items || []} />;
          case 'list':
            return <ListBlock key={idx} items={section.items || []} />;
          default:
            return null;
        }
      })}

      {/* Sequential fill-in prompts */}
      {pendingFields.length > 0 && (
        <SequentialFillIn
          fields={pendingFields}
          onAllDone={handleAllDone}
          onPendingChange={onPendingChange}
        />
      )}
    </div>
  );
}

// ===== Main component =====
export default function SmartRenderer({ content, isStreaming, onSendMessage, onPendingChange }: SmartRendererProps) {
  if (isStreaming) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
        <span className="text-xs text-slate-400">正在生成回复...</span>
      </div>
    );
  }

  const parsed = tryParseJSON(content);
  if (parsed && parsed.sections) {
    return <RenderJSON data={parsed} onSendMessage={onSendMessage} onPendingChange={onPendingChange} />;
  }

  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  );
}
