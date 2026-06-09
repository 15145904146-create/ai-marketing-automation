import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Conversation, DeliveryRecord, DeliveryStatus } from '../../types';

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

const statusConfig: Record<string, { label: string; colorClass: string; dotClass: string }> = {
  executing: { label: '执行中', colorClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-400' },
  completed: { label: '已完成', colorClass: 'bg-slate-50 text-slate-600 border-slate-200', dotClass: 'bg-slate-500' },
  paused: { label: '已暂停', colorClass: 'bg-red-50 text-red-600 border-red-200', dotClass: 'bg-red-400' },
  draft: { label: '方案中', colorClass: 'bg-blue-50 text-blue-600 border-blue-200', dotClass: 'bg-blue-400' },
  approving: { label: '审批中', colorClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-400' },
  cancelled: { label: '已终止', colorClass: 'bg-slate-50 text-slate-400 border-slate-200', dotClass: 'bg-slate-300' },
};

const channelLabel: Record<string, string> = { outbound_call: '外呼', sms: '短信' };

type FilterStatus = 'all' | DeliveryStatus;
type FilterChannel = 'all' | string;

export default function HistoryList({
  conversations, activeConversationId, onSelect, onDelete,
  deliveryRecords, activeRecordId, onDeliveryRecordSelect, onCopyCampaign,
}: HistoryListProps) {
  const [convExpanded, setConvExpanded] = useState(true);
  const [recExpanded, setRecExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all');

  // Sort: executing first, then by date descending
  const sortedRecords = useMemo(() => {
    const sorted = [...deliveryRecords].sort((a, b) => {
      if (a.status === 'executing' && b.status !== 'executing') return -1;
      if (b.status === 'executing' && a.status !== 'executing') return 1;
      return 0;
    });

    return sorted.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterChannel !== 'all' && r.channel !== filterChannel) return false;
      return true;
    });
  }, [deliveryRecords, filterStatus, filterChannel]);

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
      {/* Conversations section */}
      <button
        onClick={() => setConvExpanded(!convExpanded)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span>对话记录</span>
          <span className={`text-xs text-slate-400 transition-opacity duration-200 ${conversations.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
            ({conversations.length})
          </span>
        </div>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${convExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {convExpanded && (
        <div className="px-3 pb-1">
          {conversations.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-3 px-2">
              暂无对话记录
            </div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {conversations.map(item => (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => onSelect(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 pr-8
                      ${activeConversationId === item.id
                        ? 'glass bg-slate-50/60 shadow-sm ring-1 ring-slate-200'
                        : 'hover:bg-white/40 border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs flex-shrink-0 opacity-50">💬</span>
                      <span className={`text-sm font-medium truncate flex-1 ${activeConversationId === item.id ? 'text-slate-800' : 'text-slate-700'}`}>
                        {item.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 truncate ml-5">{item.preview}</div>
                    <div className="text-xs text-slate-300 mt-1.5 ml-5">{item.date}</div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, item.id)}
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    title="删除对话"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/30 mx-3" />

      {/* Delivery records section */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1 flex-shrink-0">
        <button
          onClick={() => setRecExpanded(!recExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span>投放记录</span>
          <span className={`text-xs text-slate-400 transition-opacity duration-200 ${sortedRecords.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
            ({sortedRecords.length})
          </span>
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${recExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`p-1 rounded-md transition-all text-slate-400 hover:text-slate-600 hover:bg-white/60 ${filterOpen || filterStatus !== 'all' || filterChannel !== 'all' ? 'text-slate-600 bg-white/40' : ''}`}
          title="筛选"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && recExpanded && (
        <div className="px-3 pb-2">
          <div className="glass rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-8">状态</span>
              <div className="flex flex-wrap gap-1">
                {(['all', 'completed', 'executing', 'paused'] as FilterStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2 py-0.5 rounded text-xs transition-all ${
                      filterStatus === s ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'all' ? '全部' : statusConfig[s]?.label || s}
                  </button>
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

      {recExpanded && (
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {sortedRecords.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6 px-2">
              {deliveryRecords.length === 0
                ? '暂无投放记录'
                : '没有匹配的投放记录'}
            </div>
          ) : (
            <div className="space-y-1">
              {sortedRecords.map(record => {
                const sc = statusConfig[record.status] || statusConfig.draft;
                const isActive = activeRecordId === record.id;
                return (
                  <div key={record.id} className="relative group">
                    <button
                      onClick={() => onDeliveryRecordSelect(record.id)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all duration-200
                        ${isActive
                          ? 'glass bg-slate-50/60 shadow-sm ring-1 ring-slate-200'
                          : 'hover:bg-white/40 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dotClass}`} />
                        <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-slate-800' : 'text-slate-700'}`}>
                          {record.title}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border flex-shrink-0 ${sc.colorClass}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate ml-4">
                        {channelLabel[record.channel]} · {record.audienceSize}人 · {record.roi != null ? `ROI ${record.roi}` : record.progress != null ? `进度 ${record.progress}%` : ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 ml-4">
                        <span className="text-xs text-slate-300">{record.dateRange}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{record.owner}</span>
                      </div>
                    </button>
                    {/* Quick action: 再来一次 — visible on hover */}
                    {onCopyCampaign && record.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyCampaign(record.title);
                        }}
                        className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                        title="基于此活动再做一波"
                      >
                        再做一波
                      </button>
                    )}
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
