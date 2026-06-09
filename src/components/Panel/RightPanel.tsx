import { useState } from 'react';
import type { PanelType, PanelContent, PlanPanelContent, AudiencePanelContent, DataPanelContent, OutboundPanelContent, ComparisonPanelContent, ReportPanelContent, OnboardingPanelContent, ErrorPanelContent } from '../../types';

interface RightPanelProps {
  panelType: PanelType;
  panelContent: PanelContent;
  isOpen: boolean;
  onClose: () => void;
}

const panelLabels: Record<string, string> = {
  plan: '营销方案',
  audience: '人群圈选',
  data: '数据看板',
  outbound: '外呼配置',
  comparison: '方案对比',
  report: '活动报告',
  onboarding: '新手指引',
  error: '异常提示',
};

const priorityColors: Record<string, string> = {
  '最高': 'bg-red-100 text-red-700',
  '高': 'bg-amber-100 text-amber-700',
  '中': 'bg-blue-100 text-blue-700',
};

const trendIcons: Record<string, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const trendColors: Record<string, string> = {
  up: 'text-slate-700',
  down: 'text-red-500',
  stable: 'text-slate-400',
};

function EmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 px-8 text-center">
      <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm">选择能力并开始对话</p>
      <p className="text-xs mt-1">结构化内容将在此展示</p>
    </div>
  );
}

function PlanView({ content }: { content: PlanPanelContent }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    background: true,
    audienceStrategy: false,
    outboundStrategy: false,
    callScripts: false,
    roiCalculation: false,
    expectedResults: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { key: 'background', label: '活动背景与目标', content: content.background },
    { key: 'audienceStrategy', label: '目标人群策略', content: content.audienceStrategy },
    { key: 'outboundStrategy', label: '外呼策略', content: content.outboundStrategy },
    { key: 'callScripts', label: '外呼话术', content: content.callScripts },
    { key: 'roiCalculation', label: 'ROI测算', content: content.roiCalculation },
    { key: 'expectedResults', label: '预期效果', content: content.expectedResults },
  ];

  return (
    <div className="space-y-1">
      {sections.map(section => (
        <div key={section.key} className="rounded-lg border border-slate-100 bg-white/50 overflow-hidden">
          <button
            onClick={() => toggleSection(section.key)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/60 transition-colors"
          >
            <span className="text-sm font-medium text-slate-700">{section.label}</span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections[section.key] ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {openSections[section.key] && (
            <div className="px-4 pb-4">
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-slate-200">
                {section.content}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AudienceView({ content }: { content: AudiencePanelContent }) {
  return (
    <div className="space-y-3">
      {content.segments.map((seg, idx) => (
        <div key={idx} className="rounded-xl border border-slate-100 bg-white/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-800">{seg.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[seg.priority]}`}>
              {seg.priority}优先级
            </span>
          </div>
          <div className="p-4 space-y-2">
            {seg.conditions.map((cond, cIdx) => (
              <div key={cIdx} className="flex items-center gap-3 text-sm">
                <span className="text-slate-400 min-w-[80px]">{cond.dimension}</span>
                <span className="text-slate-700">{cond.condition}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-50">
              <span className="text-xs text-slate-400">预估量级：</span>
              <span className="text-sm font-semibold text-slate-800">{seg.estimatedVolume}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataView({ content }: { content: DataPanelContent }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {content.metrics.map((metric, idx) => (
          <div key={idx} className="rounded-xl border border-slate-100 bg-white/50 p-4">
            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{metric.value}</span>
              {metric.trend && (
                <span className={`text-sm ${trendColors[metric.trend]}`}>
                  {trendIcons[metric.trend]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">数据解读</div>
        <div className="text-sm text-slate-600 leading-relaxed">{content.summary}</div>
      </div>
    </div>
  );
}

function OutboundView({ content }: { content: OutboundPanelContent }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">外呼排期</div>
        <div className="text-sm text-slate-700 leading-relaxed">{content.schedule}</div>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">并发量</div>
        <div className="text-lg font-bold text-slate-800">{content.concurrency}</div>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">投放渠道</div>
        <div className="flex flex-wrap gap-2">
          {content.channels.map((ch, idx) => (
            <span key={idx} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-200">
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparisonView({ content }: { content: ComparisonPanelContent }) {
  return (
    <div className="space-y-4">
      {content.plans.map((plan, idx) => (
        <div key={idx} className="rounded-xl border border-slate-100 bg-white/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 bg-gradient-to-r from-slate-50/50 to-transparent">
            <div className="text-sm font-semibold text-slate-800">{plan.name}</div>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-400">覆盖人群</div>
                <div className="text-sm font-semibold text-slate-700">{plan.audience}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-400">预估成本</div>
                <div className="text-sm font-semibold text-slate-700">{plan.cost}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-400">预期ROI</div>
                <div className="text-sm font-semibold text-slate-800">{plan.roi}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">优势</div>
              <div className="space-y-1">
                {plan.pros.map((p, i) => (
                  <div key={i} className="text-xs text-slate-600 flex items-center gap-1">
                    <span>✓</span> {p}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">劣势</div>
              <div className="space-y-1">
                {plan.cons.map((c, i) => (
                  <div key={i} className="text-xs text-slate-500 flex items-center gap-1">
                    <span>✕</span> {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportView({ content }: { content: ReportPanelContent }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {content.metrics.map((metric, idx) => (
          <div key={idx} className="rounded-xl border border-slate-100 bg-white/50 p-4">
            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{metric.value}</span>
              {metric.trend && (
                <span className={`text-sm ${trendColors[metric.trend]}`}>
                  {trendIcons[metric.trend]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">数据解读</div>
        <div className="text-sm text-slate-600 leading-relaxed">{content.summary}</div>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">关键洞察</div>
        <div className="space-y-2">
          {content.insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-slate-500 mt-0.5">💡</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OnboardingView({ content }: { content: OnboardingPanelContent }) {
  return (
    <div className="space-y-3">
      {content.steps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-white/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg flex-shrink-0">
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-700">
              {idx + 1}. {step.title}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{step.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorView({ content }: { content: ErrorPanelContent }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-red-700">{content.title}</span>
        </div>
        <div className="text-sm text-red-600 leading-relaxed whitespace-pre-wrap">{content.message}</div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
        <div className="text-xs text-slate-400 mb-2">
          {content.recoverable ? '建议尝试以下方式恢复：' : '当前无法自动恢复：'}
        </div>
        <div className="space-y-1.5">
          {content.suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RightPanel({ panelType, panelContent, isOpen, onClose }: RightPanelProps) {
  const title = panelType ? panelLabels[panelType] || '详情' : '';

  return (
    <div
      className={`absolute right-0 top-0 h-full w-[420px] z-20 transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="glass-strong h-full flex flex-col border-l border-white/40">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/30 flex-shrink-0">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="关闭面板"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!panelType && <EmptyPlaceholder />}
          {panelType === 'plan' && panelContent?.kind === 'plan' && <PlanView content={panelContent as PlanPanelContent} />}
          {panelType === 'audience' && panelContent?.kind === 'audience' && <AudienceView content={panelContent as AudiencePanelContent} />}
          {panelType === 'data' && panelContent?.kind === 'data' && <DataView content={panelContent as DataPanelContent} />}
          {panelType === 'outbound' && panelContent?.kind === 'outbound' && <OutboundView content={panelContent as OutboundPanelContent} />}
          {panelType === 'comparison' && panelContent?.kind === 'comparison' && <ComparisonView content={panelContent as ComparisonPanelContent} />}
          {panelType === 'report' && panelContent?.kind === 'report' && <ReportView content={panelContent as ReportPanelContent} />}
          {panelType === 'onboarding' && panelContent?.kind === 'onboarding' && <OnboardingView content={panelContent as OnboardingPanelContent} />}
          {panelType === 'error' && panelContent?.kind === 'error' && <ErrorView content={panelContent as ErrorPanelContent} />}
        </div>
      </div>
    </div>
  );
}
