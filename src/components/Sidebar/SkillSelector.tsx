import type { Skill } from '../../types';

const availableSkills: Skill[] = [
  {
    id: 'plan',
    name: '营销方案生成',
    description: '智能生成全渠道营销方案与ROI测算',
    tools: ['竞品分析', '渠道推荐', '预算分配', 'ROI测算', '话术生成'],
  },
  {
    id: 'segment',
    name: 'AI圈人',
    description: '智能圈选目标人群，支持多维标签组合',
    tools: ['人群画像', 'DMP圈选', 'Lookalike', '标签组合', '条件筛选'],
  },
  {
    id: 'outbound',
    name: '外呼投放',
    description: '自动化外呼触达、话术生成与效果追踪',
    tools: ['话术生成', '外呼排期', '接通预测', '效果追踪', '转化分析'],
  },
  {
    id: 'data',
    name: '数据查询',
    description: '投放效果数据查询与分析',
    tools: ['接通率查询', '转化漏斗', '投放日报', '渠道对比', 'ROI分析'],
  },
];

interface SkillSelectorProps {
  activeSkill: string | null;
  onSkillSelect: (skillId: string | null) => void;
}

export default function SkillSelector({ activeSkill, onSkillSelect }: SkillSelectorProps) {
  const handleSkillClick = (id: string) => {
    if (activeSkill === id) {
      onSkillSelect(null);
    } else {
      onSkillSelect(id);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 text-sm font-semibold text-slate-500">
        快捷能力
      </div>

      <div className="px-3 pb-2 space-y-1">
        {availableSkills.map(skill => {
          const isSelected = activeSkill === skill.id;
          return (
            <button
              key={skill.id}
              onClick={() => handleSkillClick(skill.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-200
                ${isSelected
                  ? 'glass bg-slate-50/60 shadow-sm ring-1 ring-slate-200'
                  : 'hover:bg-white/40 border border-transparent'
                }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isSelected ? 'text-slate-800' : 'text-slate-700'}`}>
                  {skill.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{skill.description}</div>
              </div>
              {isSelected && (
                <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
