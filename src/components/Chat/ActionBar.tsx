import { useState } from 'react';
import type { ActionType } from '../../types';

interface ActionBarProps {
  actionType: ActionType;
  messageId: string;
  onAction: (messageId: string, action: ActionType) => void;
}

const actionConfig: Record<ActionType, { label: string; icon: string; style: string }> = {
  confirm: { label: '确认方案', icon: '✓', style: 'bg-slate-800 text-white hover:bg-slate-700 border-slate-800' },
  modify: { label: '修改调整', icon: '✎', style: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
  regenerate: { label: '重新生成', icon: '↻', style: 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200' },
  approve: { label: '通过', icon: '✓', style: 'bg-slate-800 text-white hover:bg-slate-700 border-slate-800' },
  reject: { label: '驳回', icon: '✕', style: 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200' },
  pause: { label: '暂停', icon: '⏸', style: 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200' },
  resume: { label: '恢复', icon: '▶', style: 'bg-slate-800 text-white hover:bg-slate-700 border-slate-800' },
  viewDetails: { label: '查看详情', icon: '→', style: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
  export: { label: '导出', icon: '↓', style: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
  retry: { label: '重试', icon: '↻', style: 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200' },
  adjust: { label: '调整', icon: '⚙', style: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
};

export default function ActionBar({ actionType, messageId, onAction }: ActionBarProps) {
  const [hasInteracted, setHasInteracted] = useState(false);

  const config = actionConfig[actionType];
  if (!config) return null;

  // Determine which buttons to show based on actionType
  const buttons: Array<{ action: ActionType; config: typeof config }> = [];

  switch (actionType) {
    case 'confirm':
      buttons.push(
        { action: 'confirm', config: actionConfig.confirm }
      );
      break;
    case 'approve':
      buttons.push(
        { action: 'approve', config: actionConfig.approve },
        { action: 'reject', config: actionConfig.reject },
        { action: 'viewDetails', config: actionConfig.viewDetails }
      );
      break;
    case 'pause':
    case 'resume':
      buttons.push(
        { action: actionType === 'pause' ? 'pause' : 'resume', config: actionConfig[actionType] },
        { action: 'viewDetails', config: actionConfig.viewDetails }
      );
      break;
    case 'export':
      buttons.push(
        { action: 'export', config: actionConfig.export },
        { action: 'viewDetails', config: actionConfig.viewDetails }
      );
      break;
    case 'retry':
      buttons.push(
        { action: 'retry', config: actionConfig.retry },
        { action: 'modify', config: actionConfig.modify }
      );
      break;
    case 'adjust':
      buttons.push(
        { action: 'adjust', config: actionConfig.adjust },
        { action: 'confirm', config: actionConfig.confirm }
      );
      break;
    case 'modify':
      buttons.push(
        { action: 'modify', config: actionConfig.modify },
        { action: 'regenerate', config: actionConfig.regenerate },
        { action: 'confirm', config: actionConfig.confirm }
      );
      break;
    case 'viewDetails':
      buttons.push(
        { action: 'viewDetails', config: actionConfig.viewDetails },
        { action: 'export', config: actionConfig.export }
      );
      break;
    case 'regenerate':
      buttons.push(
        { action: 'regenerate', config: actionConfig.regenerate },
        { action: 'modify', config: actionConfig.modify }
      );
      break;
    default:
      buttons.push({ action: actionType, config });
  }

  const handleClick = (action: ActionType) => {
    if (hasInteracted) return;
    setHasInteracted(true);
    onAction(messageId, action);
  };

  return (
    <div className="flex gap-2 mt-2.5 flex-wrap">
      {buttons.map(({ action, config: cfg }) => (
        <button
          key={action}
          onClick={() => handleClick(action)}
          disabled={hasInteracted}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200
            ${hasInteracted ? 'opacity-30 cursor-not-allowed' : cfg.style}
          `}
        >
          <span className="mr-1">{cfg.icon}</span>
          {cfg.label}
        </button>
      ))}
    </div>
  );
}
