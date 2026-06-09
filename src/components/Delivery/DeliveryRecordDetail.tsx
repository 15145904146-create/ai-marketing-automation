import { useState, useRef, useEffect } from 'react';
import type { DeliveryRecord, ConfigSection, ConfigField } from '../../types';

interface Props {
  record: DeliveryRecord;
  onBack: () => void;
  onCopyCampaign: (title: string) => void;
}

type TabKey = 'performance' | 'plan' | 'config' | 'chat';

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  draft: { label: '方案中', dotClass: 'bg-blue-400' },
  approving: { label: '审批中', dotClass: 'bg-amber-400' },
  executing: { label: '执行中', dotClass: 'bg-amber-400' },
  completed: { label: '已完成', dotClass: 'bg-slate-500' },
  paused: { label: '已暂停', dotClass: 'bg-red-400' },
  cancelled: { label: '已终止', dotClass: 'bg-slate-300' },
};

const channelLabel: Record<string, string> = { outbound_call: '外呼', sms: '短信' };

const tabs: { key: TabKey; label: string; hideFor: string[] }[] = [
  { key: 'performance', label: '效果数据', hideFor: ['draft', 'approving'] },
  { key: 'plan', label: '方案快照', hideFor: [] },
  { key: 'config', label: '投放配置', hideFor: ['draft'] },
  { key: 'chat', label: '对话记录', hideFor: [] },
];

export default function DeliveryRecordDetail({ record, onBack, onCopyCampaign }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    ['draft', 'approving'].includes(record.status) ? 'plan' : 'performance'
  );
  const [showCopyModal, setShowCopyModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sc = statusConfig[record.status] || statusConfig.draft;

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [activeTab]);

  const availableTabs = tabs.filter(t => !t.hideFor.includes(record.status));

  return (
    <div className="h-full flex flex-col bg-white/30 backdrop-blur-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200/60 px-8 py-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">{record.title}</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${sc.dotClass}`} />
            <span className="text-sm text-slate-500 font-medium">{sc.label}</span>
          </div>
        </div>
        <div className="text-sm text-slate-400 ml-7">
          {record.dateRange} · {record.owner} · {channelLabel[record.channel] || record.channel} · {record.audienceSize}人
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-slate-200/60 px-8">
        <div className="flex gap-6">
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'text-slate-800 border-slate-800'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === 'performance' && record.performance && <PerformanceTab data={record.performance} />}
        {activeTab === 'plan' && record.planSnapshot && <PlanTab data={record.planSnapshot} />}
        {activeTab === 'config' && record.config && <ConfigTab data={record.config} />}
        {activeTab === 'chat' && record.chatHistory && <ChatTab data={record.chatHistory} date={record.date} />}

        {/* Fallback if data is missing */}
        {activeTab === 'performance' && !record.performance && <EmptyTab message="暂无效果数据" />}
        {activeTab === 'plan' && !record.planSnapshot && <EmptyTab message="暂无方案快照" />}
        {activeTab === 'config' && !record.config && <EmptyTab message="暂无投放配置" />}
        {activeTab === 'chat' && !record.chatHistory && <EmptyTab message="暂无对话记录" />}
      </div>

      {/* Bottom action bar */}
      <ActionBar
        status={record.status}
        onCopyCampaign={() => setShowCopyModal(true)}
      />

      {/* Copy campaign modal */}
      {showCopyModal && (
        <CopyCampaignModal
          record={record}
          onClose={() => setShowCopyModal(false)}
          onConfirm={(mode) => {
            setShowCopyModal(false);
            onCopyCampaign(record.title);
            if (mode === 'direct') {
              // Will start generating immediately
            }
          }}
        />
      )}
    </div>
  );
}

/* ===== Sub Components ===== */

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      {message}
    </div>
  );
}

/* --- Performance Tab --- */
function PerformanceTab({ data }: { data: NonNullable<DeliveryRecord['performance']> }) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Core metrics */}
      <div className="grid grid-cols-4 gap-4">
        {data.metrics.map((m, i) => (
          <div key={i} className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{m.value}{m.unit || ''}</div>
            <div className="text-xs text-slate-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <Section title="转化漏斗">
        <div className="space-y-3">
          {data.funnel.map((step, i) => {
            const maxVal = data.funnel[0].value;
            const pct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-12 text-right flex-shrink-0">{step.label}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-slate-600 to-slate-700 rounded-md transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm text-slate-500 w-20 text-right flex-shrink-0">{step.value.toLocaleString()}</span>
                <span className="text-xs text-slate-400 w-12 text-right flex-shrink-0">{step.rate}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Expected vs Actual */}
      <Section title="预期 vs 实际">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              <th className="text-left py-2 font-medium">指标</th>
              <th className="text-right py-2 font-medium">预期</th>
              <th className="text-right py-2 font-medium">实际</th>
              <th className="text-right py-2 font-medium">达成率</th>
            </tr>
          </thead>
          <tbody>
            {data.comparison.map((row, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="py-2.5 text-slate-700">{row.metric}</td>
                <td className="py-2.5 text-right text-slate-500">{row.expected}</td>
                <td className="py-2.5 text-right text-slate-700 font-medium">{row.actual}</td>
                <td className="py-2.5 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    parseFloat(row.achievement) >= 100 ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-500'
                  }`}>{row.achievement}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Trends */}
      {data.trends.length > 0 && (
        <Section title="分天趋势">
          <div className="grid grid-cols-2 gap-6">
            {data.trends.map((trend, i) => (
              <MiniChart key={i} label={trend.label} unit={trend.unit} points={trend.points} />
            ))}
          </div>
        </Section>
      )}

      {/* AI Summary */}
      <Section title="AI分析摘要">
        <p className="text-sm text-slate-600 leading-relaxed">{data.aiSummary}</p>
      </Section>
    </div>
  );
}

function MiniChart({ label, unit, points }: { label: string; unit: string; points: { day: string; value: number }[] }) {
  const values = points.map(p => p.value);
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const range = max - min || 1;

  return (
    <div>
      <div className="text-xs text-slate-500 font-medium mb-2">{label}</div>
      <div className="h-24 flex items-end gap-2 px-1">
        {points.map((p, i) => {
          const height = ((p.value - min) / range) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">{p.value}{unit}</span>
              <div className="w-full bg-slate-200 rounded-t-sm relative" style={{ height: `${Math.max(height, 8)}%` }}>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-600" />
              </div>
              <span className="text-xs text-slate-400">{p.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Plan Snapshot Tab --- */
function PlanTab({ data }: { data: NonNullable<DeliveryRecord['planSnapshot']> }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        以下为投放时确认的最终方案版本，不可编辑。
      </div>

      <Section title="活动背景与目标">
        <p className="text-sm text-slate-600 leading-relaxed">{data.background}</p>
      </Section>

      <Section title="目标人群策略">
        <div className="glass rounded-lg p-4 space-y-2 text-sm">
          <Row label="圈选条件" value={data.audienceStrategy.conditions} />
          <Row label="最终人数" value={data.audienceStrategy.finalCount} />
          <Row label="人群来源" value={data.audienceStrategy.source} />
        </div>
      </Section>

      <Section title="外呼策略">
        <ul className="space-y-1.5">
          {data.outboundStrategy.map((s, i) => (
            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="外呼话术">
        <div className="glass rounded-lg divide-y divide-slate-100">
          {data.callScript.map((s, i) => (
            <div key={i} className="p-4">
              <div className="text-xs font-semibold text-slate-500 mb-1">{s.section}</div>
              <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{s.content}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="ROI测算">
        <div className="glass rounded-lg p-4 space-y-2">
          {data.roiCalculation.map((item, i) => (
            <Row key={i} label={item.item} value={item.value} />
          ))}
        </div>
      </Section>
    </div>
  );
}

/* --- Config Tab --- */
function ConfigTab({ data }: { data: NonNullable<DeliveryRecord['config']> }) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => {
    setCollapsed(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="max-w-4xl space-y-3">
      {data.sections.map((section, si) => (
        <CollapsibleSection
          key={si}
          section={section}
          isOpen={!collapsed[si]}
          onToggle={() => toggle(si)}
        />
      ))}
    </div>
  );
}

function CollapsibleSection({ section, isOpen, onToggle }: {
  section: ConfigSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50/80 hover:bg-slate-100/80 transition-colors border-b border-slate-100"
      >
        <span className="text-sm font-semibold text-slate-700">{section.title}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Section body */}
      {isOpen && (
        <div className="divide-y divide-slate-100">
          {section.fields.map((field, fi) => (
            <ConfigFieldRow key={fi} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigFieldRow({ field }: { field: ConfigField }) {
  return (
    <div className="px-5 py-2.5 flex items-start gap-4">
      <span className="text-sm text-slate-400 w-32 flex-shrink-0 text-right pt-0.5">{field.label}</span>
      <div className="flex-1 min-w-0">
        {field.value && (
          field.badge ? (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{field.badge}</span>
          ) : (
            <span className="text-sm text-slate-700">{field.value}</span>
          )
        )}
        {field.table && (
          <div className="mt-1 border border-slate-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {field.table.headers.map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {field.table.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-slate-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-sm text-slate-600">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Chat History Tab --- */
function ChatTab({ data, date }: { data: NonNullable<DeliveryRecord['chatHistory']>; date: string }) {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="text-xs text-slate-400 mb-2">
        2026/{date} 对话共 {data.length} 轮
      </div>
      {data.map((turn, i) => (
        <div key={i} className="flex gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5 ${
            turn.role === 'user' ? 'bg-slate-600' : 'bg-slate-400'
          }`}>
            {turn.role === 'user' ? '👤' : '🤖'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-300 mb-1">{turn.time}</div>
            <div className={`text-sm rounded-xl px-4 py-3 whitespace-pre-line leading-relaxed ${
              turn.role === 'user'
                ? 'bg-slate-700 text-white rounded-tr-sm'
                : 'glass text-slate-600 rounded-tl-sm'
            }`}>
              {turn.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- Bottom Action Bar --- */
function ActionBar({ status, onCopyCampaign }: { status: string; onCopyCampaign: () => void }) {
  if (status === 'completed') {
    return (
      <div className="flex-shrink-0 border-t border-slate-200/60 px-8 py-3 flex items-center gap-3">
        <button
          onClick={onCopyCampaign}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md transition-all"
        >
          基于此活动再做一波
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-slate-200 rounded-lg transition-all">
          导出报告
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-500 transition-all ml-auto">
          删除记录
        </button>
      </div>
    );
  }

  if (status === 'executing') {
    return (
      <div className="flex-shrink-0 border-t border-slate-200/60 px-8 py-3 flex items-center gap-3">
        <button className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md transition-all">
          暂停投放
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-slate-200 rounded-lg transition-all">
          查看实时数据
        </button>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className="flex-shrink-0 border-t border-slate-200/60 px-8 py-3 flex items-center gap-3">
        <button className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md transition-all">
          恢复投放
        </button>
        <button className="px-4 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all">
          终止投放
        </button>
        <button
          onClick={onCopyCampaign}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-slate-200 rounded-lg transition-all"
        >
          基于此活动重新发起
        </button>
      </div>
    );
  }

  if (status === 'draft') {
    return (
      <div className="flex-shrink-0 border-t border-slate-200/60 px-8 py-3 flex items-center gap-3">
        <button className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md transition-all">
          继续编辑
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-500 transition-all">
          放弃此活动
        </button>
      </div>
    );
  }

  return null;
}

/* ===== Shared Components ===== */

function CopyCampaignModal({ record, onClose, onConfirm }: {
  record: DeliveryRecord;
  onClose: () => void;
  onConfirm: (mode: 'direct' | 'modify') => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl shadow-2xl border border-white/40 p-6 w-[480px] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-slate-800 mb-1">
          基于「{record.title}」发起新活动
        </h3>
        <p className="text-xs text-slate-400 mb-4">以下参数将从原活动复制，你可以修改后确认</p>

        <div className="glass rounded-lg p-4 space-y-2.5 mb-4">
          <ParamRow label="渠道" value={channelLabel[record.channel] || record.channel} />
          <ParamRow label="活动目的" value="促进不活跃商家回款" />
          <ParamRow label="目标人群" value="30天以上未回款的年框商家" />
          <ParamRow label="人群规模" value={`${record.audienceSize}人`} />
          <ParamRow label="投放时间" value="______（请填写）" highlight />
        </div>

        <div className="glass rounded-lg p-3 mb-5 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5 flex-shrink-0">💡</span>
          <p className="text-xs text-slate-500 leading-relaxed">
            建议：上次活动中未接通的 {Math.round(parseInt(record.audienceSize.replace(/,/g, '')) * 0.49)} 人可作为本次优先触达对象，是否排除已转化商家后使用？
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onConfirm('direct')}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md transition-all"
          >
            直接使用，开始生成方案
          </button>
          <button
            onClick={() => onConfirm('modify')}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-slate-200 rounded-lg transition-all"
          >
            我修改一下再发送
          </button>
        </div>
      </div>
    </div>
  );
}

function ParamRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-400 w-16 flex-shrink-0 text-right">{label}</span>
      <span className={highlight ? 'text-amber-600 font-medium' : 'text-slate-700'}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-slate-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 w-20 flex-shrink-0 text-right">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
