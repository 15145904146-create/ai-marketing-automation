import type { Conversation } from '../types';
import { c1Messages, c2Messages, c3Messages, c4Messages } from './mock-history-messages';

// 演示用：处于不同阶段的历史对话（尚未推进到投放阶段）
export const mockConversations: Conversation[] = [
  {
    id: 'c1',
    title: '高净值用户夏季营销策略',
    date: '06/04',
    preview: '想针对AUM>50万的客户做一波夏季理财营销，预算50万…',
    stage: 'clarifying',
    startedAt: '2026-06-04',
    messages: c1Messages,
  },
  {
    id: 'c2',
    title: '新品分期外呼方案讨论',
    date: '06/03',
    preview: '帮我生成一个新品分期产品的外呼营销方案，目标转化800人',
    stage: 'plan_generated',
    channel: 'outbound_call',
    audienceSize: '12,000',
    startedAt: '2026-06-03',
    messages: c2Messages,
  },
  {
    id: 'c3',
    title: '复购活动人群圈选',
    date: '06/02',
    preview: '给我圈一批近30天有支付行为的老客，准备做复购活动',
    stage: 'audience_ready',
    channel: 'outbound_call',
    audienceSize: '6,400',
    startedAt: '2026-06-02',
    messages: c3Messages,
  },
  {
    id: 'c4',
    title: '618理财节话术设计',
    date: '05/30',
    preview: '618理财节外呼话术，要突出限时利率优势',
    stage: 'material_ready',
    channel: 'outbound_call',
    audienceSize: '9,800',
    startedAt: '2026-05-30',
    messages: c4Messages,
  },
];
