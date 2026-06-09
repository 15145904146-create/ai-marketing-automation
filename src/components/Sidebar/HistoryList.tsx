import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Conversation, DeliveryRecord, JourneyStage, DeliveryStatus } from '../../types';

interface HistoryListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  deliveryRecords: DeliveryRecord[];
  activeRecordId: string | null;
  onDeliveryRecordSelect: (id: string) => void;
  onCopyCampaign?: (title: string) => void;
}

// ===== Journey Stage Configuration =====
// 全链路状态机：从对话起步到复盘结束的 11 个标签
const stageConfig: Record<JourneyStage, { label: string; colorClass: string; dotClass: string; order: number }> = {
  clarifying:       { label: '需求澄清中',   order: 1,  colorClass: 'bg-sky-50 text-sky-700 border-sky-200',           dotClass: 'bg-sky-400' },
  plan_generated:   { label: '方案已生成',   order: 2,  colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dotClass: 'bg-indigo-400' },
  plan_confirmed:   { label: '方案已确认',   order: 3,  colorClass: 'bg-violet-50 text-violet-700 border-violet-200',  dotClass: 'bg-violet-400' },
  audience_ready:   { label: '人群表已生成', order: 4,  colorClass: 'bg-purple-50 text-purple-700 border-purple-200',  dotClass: 'bg-purple-400' },
  material_ready:   { label: '话术已就绪',   order: 5,  colorClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',dotClass: 'bg-fuchsia-400' },
  config_submitted: { label: '配置已提交',   order: 6,  colorClass: 'bg-amber-50 text-amber-700 border-amber-200',     dotClass: 'bg-amber-400' },
  executing:        { label: '投放中',       order: 7,  colorClass: 'bg-orange-50 text-orange-700 border-orange-200',  dotClass: 'bg-orange-400' },
  paused:           { label: '已暂停',       order: 8,  colorClass: 'bg-red-50 text-red-600 border-red-200',           dotClass: 'bg-red-400' },
  completed:        { label: '投放已完成',   order: 9,  colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',dotClass: 'bg-emerald-400' },
  reviewed:         { label: '已复盘',       order: 10, colorClass: 'bg-teal-50 text-teal-700 border-teal-200',        dotClass: 'bg-teal-400' },
  cancelled:        { label: '已终止',       order: 11, colorClass: 'bg-slate-50 text-slate-400 border-slate-200',     dotClass: 'bg-slate-300' },
};

const channelLabel: Record<string, string> = { outbound_call: '外呼', sms: '短信' };

// 从 DeliveryStatus 推导 JourneyStage（兜底逻辑）
function deriveStage(status: DeliveryStatus): JourneyStage {
  switch (status) {
    case 'draft':     return 'plan_generated';
    case 'approving': return 'config_submitted';
    case 'executing': return 'executing';
    case 'paused':    return 'paused';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default:          return 'clarifying';
  }
}

// 统一历史项类型
type HistoryItem = {
  id: string;
  kind: 'conversation' | 'delivery';
  title: string;
  date: string;
  preview: string;
  stage: JourneyStage;
  channel?: string;
  audienceSize?: string;
  owner?: string;
  roi?: number;
  progress?: number;
  dateRange?: string;
};

type FilterStage = 'all' | JourneyStage;
type FilterChannel = 'all' | string;

export default function HistoryList({
  conversations, activeConversationId, onSelect, onDelete,
  deliveryRecords, activeRecordId, onDeliveryRecordSelect, onCopyCampaign,
}: HistoryListProps) {
  const [expanded, setExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStage, setFilterStage] = useState<FilterStage>('all');
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all');

  // 合并对话记录与投放记录为统一历史列表
  const items = useMemo<HistoryItem[]>(() => {
    const convItems: HistoryItem[] = conversations.map(c => ({
      id: c.id,
      kind: 'conversation',
      title: c.title,
      date: c.date,
      preview: c.preview,
      stage: c.stage ?? 'clarifying',
      channel: c.channel,
      audienceSize: c.audienceSize,
    }));
    const recItems: HistoryItem[] = deliveryRecords.map(r => ({
      id: r.id,
      kind: 'delivery',
      title: r.title,
      date: r.date,
      preview: r.preview,
      stage: r.stage ?? deriveStage(r.status),
      channel: r.channel,
      audienceSize: r.audienceSize,
      owner: r.owner,
      roi: r.roi,
      progress: r.progress,
      dateRange: r.dateRange,
    }));

    const all = [...convItems, ...recItems];

    // 排序：执行中优先 → 按 stage 进度倒序 → 按 date 倒序
    all.sort((a, b) => {
      if (a.stage === 'executing' && b.stage !== 'executing') return -1;
      if (b.stage === 'executing' && a.stage !== 'executing') return 1;
      const ao = stageConfig[a.stage].order;
      const bo = stageConfig[b.stage].order;
      if (ao !== bo) return bo - ao; // 进度更靠后的排前面
      return b.date.localeCompare(a.date);
    });

    return all.filter(it => {
      if (filterStage !== 'all' && it.stage !== filterStage) return false;
      if (filterChannel !== 'all' && it.channel !== filterChannel) return false;
      return true;
    });
  }, [conversations, deliveryRecords, filterStage, filterChannel]);

  const totalCount = conversations.length + deliveryRecords.length;

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    setPopoverPos({ top: rect.top - 4, left: rect.right + 6 });
    setDeleteTarget(id);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
      setPopoverPos(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
    setPopoverPos(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Unified history header */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1 flex-shrink-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span>历史记录</span>
          <span className={`text-xs text-slate-400 transition-opacity duration-200 ${totalCount > 0 ? 'opacity-100' : 'opacity-0'}`}>
            ({items.length})
          </span>
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`p-1 rounded-md transition-all text-slate-400 hover:text-slate-600 hover:bg-white/60 ${filterOpen || filterStage !== 'all' || filterChannel !== 'all' ? 'text-slate-600 bg-white/40' : ''}`}
          title="筛选"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && expanded && (
        <div className="px-3 pb-2">
          <div className="glass rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs text-slate-400 w-8 mt-0.5">阶段</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterStage('all')}
                  className={`px-2 py-0.5 rounded text-xs transition-all ${
                    filterStage === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >全部</button>
                {(Object.keys(stageConfig) as JourneyStage[])
                  .sort((a, b) => stageConfig[a].order - stageConfig[b].order)
                  .map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStage(s)}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${
                        filterStage === s ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >{stageConfig[s].label}</button>
                  ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-8">渠道</span>
              <div className="flex gap-1">
                {(['all', 'outbound_call', 'sms'] as FilterChannel[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setFilterChannel(c)}
                    className={`px-2 py-0.5 rounded text-xs transition-all ${
                      filterChannel === c ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {c === 'all' ? '全部' : channelLabel[c] || c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {items.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6 px-2">
              {totalCount === 0 ? '暂无历史记录' : '没有匹配的记录'}
            </div>
          ) : (
            <div className="space-y-1">
              {items.map(item => {
                const sc = stageConfig[item.stage];
                const isActive = item.kind === 'conversation'
                  ? activeConversationId === item.id
                  : activeRecordId === item.id;
                const isCompleted = item.kind === 'delivery' && (item.stage === 'completed' || item.stage === 'reviewed');
                return (
                  <div key={`${item.kind}-${item.id}`} className="relative group">
                    <button
                      onClick={() => item.kind === 'conversation' ? onSelect(item.id) : onDeliveryRecordSelect(item.id)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all duration-200
                        ${isActive
                          ? 'glass bg-slate-50/60 shadow-sm ring-1 ring-slate-200'
                          : 'hover:bg-white/40 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dotClass}`} />
                        <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-slate-800' : 'text-slate-700'}`}>
                          {item.title}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border flex-shrink-0 ${sc.colorClass}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate ml-4">
                        {item.kind === 'delivery'
                          ? `${channelLabel[item.channel || ''] || ''}${item.audienceSize ? ` · ${item.audienceSize}人` : ''}${item.roi != null ? ` · ROI ${item.roi}` : item.progress != null ? ` · 进度 ${item.progress}%` : ''}`
                          : item.preview}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 ml-4">
                        <span className="text-xs text-slate-300">{item.dateRange || item.date}</span>
                        {item.owner && (
                          <>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{item.owner}</span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* 操作按钮：对话支持删除，已完成投放支持「再做一波」 */}
                    {item.kind === 'conversation' ? (
                      <button
                        onClick={(e) => handleDeleteClick(e, item.id)}
                        className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="删除对话"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : onCopyCampaign && isCompleted ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyCampaign(item.title);
                        }}
                        className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                        title="基于此活动再做一波"
                      >
                        再做一波
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation popover */}
      {deleteTarget && popoverPos && createPortal(
        <>
          <div className="fixed inset-0 z-50" onClick={handleCancelDelete} />
          <div
            className="fixed z-50 glass-strong rounded-xl shadow-2xl border border-white/40 p-5 w-72 animate-scale-in"
            style={{ top: popoverPos.top, left: popoverPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800">删除</h3>
                <p className="text-xs text-slate-500 mt-1">确定要删除这条对话记录吗？</p>
              </div>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button onClick={handleCancelDelete} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/50 rounded-lg transition-all">
                取消
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-md bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900">
                确定
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
