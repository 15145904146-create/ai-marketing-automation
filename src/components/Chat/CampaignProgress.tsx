import type { Campaign, WorkflowStepType } from '../../types';

interface CampaignProgressProps {
  campaign: Campaign;
  onStepClick?: (stepType: WorkflowStepType) => void;
}

const stepIcons: Record<WorkflowStepType, string> = {
  audience_selection: '👥',
  plan_review: '📋',
  material_approval: '🎨',
  execution: '⚡',
  data_review: '📊',
};

const statusStyles: Record<string, string> = {
  active: 'text-slate-800 bg-slate-100 border-slate-300 font-semibold',
  completed: 'text-slate-600 bg-white border-slate-200',
  pending: 'text-slate-400 bg-white border-slate-100',
  skipped: 'text-slate-300 bg-white border-slate-100 line-through',
};

export default function CampaignProgress({ campaign, onStepClick }: CampaignProgressProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3 animate-fade-in">
      <div className="flex items-center gap-0 overflow-x-auto">
        {campaign.workflowSteps.map((step, idx) => {
          const isLast = idx === campaign.workflowSteps.length - 1;
          const isClickable = step.status === 'active' || step.status === 'completed';
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick?.(step.type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex-shrink-0
                  ${statusStyles[step.status]}
                  ${step.status === 'active' ? 'stepper-active' : ''}
                  ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
                `}
              >
                <span className="text-sm">{stepIcons[step.type]}</span>
                <span>{step.label}</span>
              </button>
              {!isLast && (
                <div className={`w-5 h-0.5 mx-0.5 rounded-full flex-shrink-0 transition-colors duration-500
                  ${step.status === 'completed' ? 'bg-slate-300' : 'bg-slate-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
