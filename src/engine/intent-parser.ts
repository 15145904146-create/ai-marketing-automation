import type { IntentType, ParsedIntent } from '../types';

interface IntentPattern {
  type: IntentType;
  keywords: string[];
  weight: number;
}

const patterns: IntentPattern[] = [
  {
    type: 'create_new',
    keywords: ['方案', '投放', '策略', '制定', '生成', '帮我', '规划', '设计', '创建', '新建', '做一份', '出一份', '写一个', '策划'],
    weight: 10,
  },
  {
    type: 'modify_existing',
    keywords: ['修改', '调整', '改', '换成', '换成', '更新', '变更', '优化', '重新', '换一个', '换一种', '改成', '不要', '不对'],
    weight: 8,
  },
  {
    type: 'query_data',
    keywords: ['查询', '数据', '效果', '统计', '报表', '日报', '周报', '月报', '复盘', '看了', '查一下', '多少', '怎么样', '情况', '表现'],
    weight: 7,
  },
  {
    type: 'emergency_action',
    keywords: ['紧急', '立刻', '马上', '暂停', '停止', '取消', '立即', '快点', '急', '尽快', '快', '速度'],
    weight: 12,
  },
  {
    type: 'explore',
    keywords: ['分析', '了解', '看看', '能做什么', '有什么', '怎么用', '介绍一下', '对比', '区别', '哪个好', '怎么做', '推荐', '建议'],
    weight: 5,
  },
  {
    type: 'single_skill',
    keywords: ['圈人', '人群', 'DMP', '外呼', '话术', '接通', '转化', 'ROI', '画像', '标签', '圈选', '拨打', '触达'],
    weight: 4,
  },
  {
    type: 'adjust_campaign',
    keywords: ['追加', '暂停中', '恢复', '继续', '增速', '降速', '扩量', '缩量', '加预算', '降预算', '调整出价', '调整预算'],
    weight: 9,
  },
  {
    type: 'compare',
    keywords: ['对比', '比较', 'A/B', '哪个', 'VS', 'pk', '差异', '相比', '比起来', '方案一', '方案二', '选择'],
    weight: 6,
  },
  {
    type: 'report',
    keywords: ['报告', '导出', '报表', 'PPT', 'PDF', '导出报表', '生成报告', '总结报告', '活动报告', '最终效果', '完整复盘'],
    weight: 7,
  },
  {
    type: 'onboarding',
    keywords: ['新手', '入门', '怎么开始', '第一次', '引导', '帮助', '教程', '演示', '不会用', '教', '功能', '能做'],
    weight: 3,
  },
];

const urgencyKeywords = ['紧急', '立刻', '马上', '暂停', '停止', '立即', '急', '尽快', '快'];

const entityPatterns: Array<{ regex: RegExp; key: string }> = [
  { regex: /(\d+)万?人/g, key: 'audienceSize' },
  { regex: /(\d+)万/g, key: 'budget' },
  { regex: /(\d+)%/g, key: 'percentage' },
  { regex: /(Q[1-4]|第[一二三四]季度)/g, key: 'quarter' },
  { regex: /(双十一|618|双十二|年货节|女神节|618|11\.11|12\.12)/g, key: 'event' },
];

export function parseIntents(input: string): ParsedIntent[] {
  const lower = input.toLowerCase();
  const results: ParsedIntent[] = [];

  for (const pattern of patterns) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (lower.includes(kw)) {
        score += kw.length >= 3 ? 2 : 1;
      }
    }
    if (score > 0) {
      const confidence = Math.min(score / (pattern.weight * 0.5), 1);
      const urgency = urgencyKeywords.some(kw => lower.includes(kw));
      const entities = extractEntities(input);
      results.push({ type: pattern.type, confidence, urgency, entities });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

export function parsePrimaryIntent(input: string): ParsedIntent {
  const intents = parseIntents(input);
  if (intents.length === 0) {
    return { type: 'explore', confidence: 0.3, urgency: false, entities: {} };
  }
  return intents[0];
}

function extractEntities(input: string): Record<string, string> {
  const entities: Record<string, string> = {};
  for (const ep of entityPatterns) {
    const match = ep.regex.exec(input);
    if (match) {
      entities[ep.key] = match[1];
    }
  }
  return entities;
}

export function requiresClarification(intent: ParsedIntent): boolean {
  return intent.confidence < 0.4 && intent.type !== 'onboarding';
}

export function getIntentDescription(type: IntentType): string {
  const map: Record<IntentType, string> = {
    create_new: '创建新方案',
    modify_existing: '修改现有方案',
    query_data: '查询数据',
    emergency_action: '紧急操作',
    explore: '探索能力',
    single_skill: '单项技能',
    adjust_campaign: '调整投放中计划',
    compare: '方案对比',
    report: '生成报告',
    onboarding: '新手引导',
  };
  return map[type] || '未知意图';
}
