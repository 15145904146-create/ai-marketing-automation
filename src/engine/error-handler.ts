import type { AIResponseResult, ActionType } from '../types';

export interface ErrorContext {
  scenario: string;
  userInput: string;
  attempt: number;
  campaignId?: string;
}

const MAX_RETRIES = 3;

const recoveryStrategies: Record<string, { message: string; suggestions: string[]; actionType: ActionType }> = {
  empty_audience: {
    message: '目前未圈选到符合条件的用户。建议：\n\n1. 放宽人群筛选条件（如扩大年龄范围、降低行为频次阈值）\n2. 更换种子人群，尝试不同的Lookalike扩展\n3. 检查标签组合是否过于严格（AND条件过多）\n\n请告诉我你希望如何调整，或让我帮你自动优化。',
    suggestions: ['放宽条件重试', '换种子人群', '自动优化', '查看人群建议'],
    actionType: 'adjust',
  },
  invalid_conditions: {
    message: '当前圈选条件存在冲突，导致无法产出有效人群。可能的原因：\n\n- 多个条件互斥（如同时要求"无购买记录"和"复购用户"）\n- 条件过于严苛导致人群量级过小（< 1000人）\n\n请检查并修改条件，或让我推荐合理的人群圈选方案。',
    suggestions: ['修改条件', '推荐默认人群', '查看提示', '重新输入'],
    actionType: 'modify',
  },
  channel_unavailable: {
    message: '所选投放渠道当前不可用。不可用渠道已被自动跳过。\n\n可用渠道：抖音信息流、微信朋友圈、搜索竞价\n不可用：小红书（维护中）\n\n是否使用可用渠道继续执行？',
    suggestions: ['继续执行', '调整渠道', '稍后重试', '查看详情'],
    actionType: 'adjust',
  },
  approval_rejected: {
    message: '方案审批被驳回。驳回原因需查看审批意见。\n\n你可以：\n- 根据审批意见修改方案后重新提交\n- 与审批人沟通确认修改方向\n- 创建替代方案作为备选',
    suggestions: ['查看审批意见', '修改方案', '创建替代方案', '联系审批人'],
    actionType: 'modify',
  },
  timeout: {
    message: '请求处理超时，可能是数据量较大导致。\n\n建议：\n- 缩小查询范围（如减少时间跨度、限制人群数量）\n- 稍后重试\n- 切换为异步处理模式',
    suggestions: ['缩小范围重试', '异步处理', '稍后重试', '查看帮助'],
    actionType: 'retry',
  },
  generic: {
    message: '抱歉，处理过程中遇到了问题。请尝试以下方式：\n\n- 重新描述你的需求\n- 简化输入内容\n- 切换其他能力模块',
    suggestions: ['重新输入', '换种方式', '查看帮助', '开始新对话'],
    actionType: 'retry',
  },
};

export function diagnoseError(input: string, _context: ErrorContext): string {
  const lower = input.toLowerCase();

  if (lower.includes('人群') && (lower.includes('0') || lower.includes('没有') || lower.includes('空'))) {
    return 'empty_audience';
  }
  if (lower.includes('条件') && (lower.includes('冲突') || lower.includes('无效') || lower.includes('错误'))) {
    return 'invalid_conditions';
  }
  if (lower.includes('渠道') && (lower.includes('不可用') || lower.includes('失败') || lower.includes('维护'))) {
    return 'channel_unavailable';
  }
  if (lower.includes('审批') && (lower.includes('驳回') || lower.includes('拒绝') || lower.includes('没通过'))) {
    return 'approval_rejected';
  }
  if (lower.includes('超时') || lower.includes('太久') || lower.includes('慢')) {
    return 'timeout';
  }
  return 'generic';
}

export function getRecoveryResponse(
  errorType: string,
  context: ErrorContext
): AIResponseResult {
  const strategy = recoveryStrategies[errorType] || recoveryStrategies.generic;

  if (context.attempt >= MAX_RETRIES) {
    return {
      message: `已尝试 ${MAX_RETRIES} 次仍未解决。建议联系运营支持获取帮助。`,
      panelType: 'error',
      panelContent: {
        kind: 'error',
        title: '多次重试失败',
        message: `在"${context.scenario}"场景下已重试 ${MAX_RETRIES} 次，问题仍未解决。`,
        recoverable: false,
        suggestions: ['联系运营支持', '查看帮助文档', '开始新对话'],
      },
      actionType: null,
    };
  }

  return {
    message: strategy.message,
    panelType: 'error',
    panelContent: {
      kind: 'error',
      title: getErrorTitle(errorType),
      message: strategy.message,
      recoverable: true,
      suggestions: strategy.suggestions,
    },
    actionType: strategy.actionType,
  };
}

function getErrorTitle(errorType: string): string {
  const titles: Record<string, string> = {
    empty_audience: '人群圈选为空',
    invalid_conditions: '筛选条件冲突',
    channel_unavailable: '渠道不可用',
    approval_rejected: '审批被驳回',
    timeout: '请求超时',
    generic: '处理异常',
  };
  return titles[errorType] || '处理异常';
}
