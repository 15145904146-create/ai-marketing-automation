interface WelcomeCardProps {
  onPromptClick: (prompt: string) => void;
}

const suggestedPrompts = [
  {
    title: '竞品投放分析',
    description: '帮我分析主要竞品的投放渠道和素材策略',
    icon: '🔍',
  },
  {
    title: '受众画像洞察',
    description: '为目标产品生成详细的受众画像与触达策略',
    icon: '👥',
  },
  {
    title: '投放方案生成',
    description: '根据预算和产品特点制定全渠道投放方案',
    icon: '📊',
  },
  {
    title: '素材创意建议',
    description: '为社交媒体广告生成创意文案和设计方向',
    icon: '🎨',
  },
  {
    title: '效果复盘优化',
    description: '分析投放数据并提供优化建议和ROI预测',
    icon: '📈',
  },
  {
    title: '营销日历规划',
    description: '根据年度节点制定完整的营销活动排期',
    icon: '📅',
  },
];

export default function WelcomeCard({ onPromptClick }: WelcomeCardProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
      {/* Greeting */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          早上好，运营团队 👋
        </h1>
        <p className="text-slate-500 text-sm">
          选择一个推荐话题，或直接输入你的营销需求开始对话
        </p>
      </div>

      {/* Prompt grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onPromptClick(prompt.description)}
            className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <span className="text-2xl flex-shrink-0">{prompt.icon}</span>
            <div>
              <div className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                {prompt.title}
              </div>
              <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                {prompt.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
