import type {
  AIResponseResult,
  Campaign,
} from '../types';
import { parsePrimaryIntent, requiresClarification } from './intent-parser';
import { composeSystemPrompt, USER_PROMPT_TEMPLATES } from './presets';

export { USER_PROMPT_TEMPLATES };

type Capability = 'plan' | 'segment' | 'outbound' | 'data';

interface GenerateOptions {
  userInput: string;
  activeSkill: Capability | null;
  campaign: Campaign | null;
}

// ===== Helper: get current capability =====
function resolveCapability(input: string, activeSkill: Capability | null): Capability {
  if (activeSkill) return activeSkill;

  const lower = input.toLowerCase();
  if (lower.includes('方案') || lower.includes('投放') || lower.includes('策略') || lower.includes('渠道') || lower.includes('营销') || lower.includes('策划')) return 'plan';
  if (lower.includes('人群') || lower.includes('圈人') || lower.includes('画像') || lower.includes('dmp') || lower.includes('受众') || lower.includes('圈选')) return 'segment';
  if (lower.includes('外呼') || lower.includes('电话') || lower.includes('话术') || lower.includes('拨打')) return 'outbound';
  if (lower.includes('数据') || lower.includes('查询') || lower.includes('效果') || lower.includes('接通率') || lower.includes('转化') || lower.includes('日报') || lower.includes('roi')) return 'data';

  return 'plan'; // default
}

// ===== Business Scene Detection =====
type BusinessScene = 'recall' | 'activation' | 'acquisition' | 'retention' | 'upsell' | 'promotion' | 'generic';

function detectBusinessScene(input: string): BusinessScene {
  if (/召回|流失|挽回|回流|回归|沉默|不活跃|沉睡|沉睡|唤醒/.test(input)) return 'recall';
  if (/激活|首购|首单|新注册|引导使用|新手/.test(input)) return 'activation';
  if (/拉新|新客|获客|新用户|引流|新注册/.test(input)) return 'acquisition';
  if (/留存|活跃|日活|复购|续费|续费/.test(input)) return 'retention';
  if (/追加|升级|升档|提额|加购|升级套餐/.test(input)) return 'upsell';
  if (/促销|活动|大促|节日|双\d|618|618/.test(input)) return 'promotion';
  return 'generic';
}

// ===== Bracket-style param extraction =====
function parseBracketParams(input: string): Record<string, string> {
  const params: Record<string, string> = {};
  const map: Record<string, string> = {
    '产品': 'product', '活动目的': 'purpose', '业务背景': 'background',
    '目标人群': 'audience', '预算': 'budget', '渠道': 'channel', '投放时间': 'timing',
  };
  for (const [cn, en] of Object.entries(map)) {
    const m = input.match(new RegExp(`【${cn}】\\s*(.+?)(?:\\n|$)`));
    if (m) params[en] = m[1].trim();
  }
  const bm = input.match(/预算[】]?\s*[：:]?\s*(\d+\.?\d*)\s*万/);
  if (bm) params.budgetAmount = bm[1];
  return params;
}

// ===== Free-text parameter extraction =====
function extractFreeTextParams(input: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Budget: "预算30万" / "预算约50万" / "30万预算"
  const budgetMatch = input.match(/(?:预算[约大概为]*|约|大概)\s*(\d+\.?\d*)\s*万|(\d+\.?\d*)\s*万\s*预算/);
  if (budgetMatch) params.budgetAmount = budgetMatch[1] || budgetMatch[2];

  // Timing / duration: "30天内" / "持续30天" / "为期2周" / "活动周期1个月"
  const timingMatch = input.match(/(?:希望|计划|在|持续|为期|活动周期[约为]*)\s*(\d+)\s*(天|周|个月|月)/);
  if (timingMatch) {
    const num = timingMatch[1];
    const unit = timingMatch[2];
    params.timing = `${num}${unit}`;
    if (unit === '周') params.timing = `${Number(num) * 7}天`;
    if (unit === '个月' || unit === '月') params.timing = `${Number(num) * 30}天`;
  }

  // Channel: "外呼" / "短信" / "Push" / "千牛" etc.
  const channels: string[] = [];
  if (/外呼|电话/.test(input)) channels.push('外呼');
  if (/短信/.test(input)) channels.push('短信');
  if (/[Pp]ush|推送/.test(input)) channels.push('Push');
  if (/千牛/.test(input)) channels.push('千牛');
  if (/邮件|邮箱/.test(input)) channels.push('邮件');
  if (channels.length > 0) params.channel = channels.join('+');

  // Audience description: extract sentence around audience keywords
  const audiencePatterns = [
    /(?:针对|目标[人群是]*|面向|圈选|锁定)\s*([^，。；,]{4,40})/,
    /(?:重点[是为]*)\s*([^，。；,]{4,40})/,
    /([^，。；,]{2,20}(?:用户|商家|客户|人群|业主|会员))/,
  ];
  for (const pat of audiencePatterns) {
    const m = input.match(pat);
    if (m) {
      const val = m[1].trim();
      if (val.length >= 4 && !params.audience) {
        params.audience = val;
      }
    }
  }

  // Goal / purpose: "提升回款率" / "促进转化" / "召回流失商家"
  const goalPatterns = [
    /(?:希望|目标[是为]?|旨在|目的是?|想要|期望)\s*([^，。；,]{2,25})/,
    /(?:重点[是为]*)\s*(?:在\s*)?([^，。；,]{2,20}(?:率|量|额|数|转化|回款|GMV|ROI))/,
  ];
  for (const pat of goalPatterns) {
    const m = input.match(pat);
    if (m && !params.purpose) {
      params.purpose = m[1].trim();
    }
  }

  // Loss/churn threshold: "近30天停止使用" / "60天未回款" / "超过90天不活跃"
  const lossMatch = input.match(/(?:近|最近|超过|大于)?\s*(\d+)\s*天\s*(?:未|停止|不|没有|流失|沉默|暂停)/);
  if (lossMatch) params.lossThreshold = `${lossMatch[1]}天`;

  return params;
}

// ===== Information Completeness Check (Fix #5) =====
function _checkInfoCompleteness(params: Record<string, string>, scene: BusinessScene): string[] {
  const missing: string[] = [];
  const need = (key: string, question: string) => { if (!params[key]) missing.push(question); };
  switch (scene) {
    case 'recall':
      need('audience', '目标人群的流失定义是什么？（如：多少天未使用/未回款算需要召回？）');
      need('budget', '活动预算是多少？');
      need('channel', '计划通过什么渠道触达？（外呼/短信/Push等）');
      need('timing', '活动计划什么时候开始，持续多久？');
      missing.push('是否有历史召回活动数据可参考？（之前的ROI和转化率）');
      missing.push('可用的折扣/权益力度上限是多少？');
      break;
    case 'activation':
      need('audience', '目标激活人群的特征是什么？');
      need('budget', '活动预算是多少？');
      need('timing', '活动周期是什么？');
      missing.push('用户首次使用的核心引导动作是什么？');
      break;
    case 'acquisition':
      need('audience', '目标获客人群的画像是什么？');
      need('budget', '获客预算和CPA上限是多少？');
      need('timing', '获客活动周期？');
      break;
    default:
      need('budget', '预算范围是多少？');
      need('timing', '活动周期是什么？');
      break;
  }
  return missing;
}

function hasBracketTemplate(input: string): boolean {
  return /【.+】/.test(input);
}

// ===== Clarification Response (Steps 1-4) =====
function generateClarificationResponse(input: string): AIResponseResult {
  const bracketParams = parseBracketParams(input);
  const freeParams = extractFreeTextParams(input);
  // Merge: bracket params take priority over free-text
  const params = { ...freeParams, ...bracketParams };
  const scene = detectBusinessScene(input);
  const _lower = input.toLowerCase();

  // Scene-specific metadata
  let typeLabel: string;
  let summary: string;
  let paramRows: Array<[string, string, string]>;
  let questions: string;
  let optionalItems: string;

  if (scene === 'recall') {
    const product = params.product || inferProduct(input);
    const budget = params.budgetAmount ? `${params.budgetAmount}万` : params.budget || '待明确';
    const audience = params.audience || '待明确';
    const channel = params.channel || '待明确';
    const timing = params.timing || '待明确';
    const purpose = params.purpose || '召回流失商家，提升回款';
    const lossThreshold = params.lossThreshold || '待明确';
    
    typeLabel = '商家召回';
    summary = `你要做一次**${product || ''}商家召回**营销活动，预算约${budget}，目标是${purpose}。`;
    
    // Source attribution: "用户直说" if extracted from free-text, "AI推断" if inferred
    const src = (key: string, fallback: string) => {
      if (bracketParams[key]) return '用户直说';
      if (freeParams[key]) return '用户直说';
      if (fallback !== '待明确') return 'AI推断';
      return '待明确';
    };
    
    paramRows = [
      ['活动类型', typeLabel, '从"召回""流失"等关键词推断'],
      ['产品线', product || '待明确', src('product', product)],
      ['预算', budget, src('budgetAmount', budget)],
      ['目标人群', audience.length > 20 ? audience.slice(0, 20) + '...' : audience, src('audience', audience)],
      ['流失阈值', lossThreshold, src('lossThreshold', lossThreshold)],
      ['活动周期', timing, src('timing', timing)],
      ['核心目标', purpose, src('purpose', purpose)],
      ['触达渠道', channel, src('channel', channel)],
    ];

    questions = `**必须明确：**

1. **目标人群范围？** 极速回款目前有几类可召回商家：
   - ① 在约但使用手动版
   - ② 已退出 / 暂停使用
   - ③ 以上都包含（策略会分开设计）

2. **活动周期？** 参考历史活动一般是30天。

3. **核心目标偏好？** 三选一：
   - 召回人数优先 → 折扣力度大、覆盖广
   - 增量回款GMV优先 → 聚焦高价值商家
   - ROI优先 → 折扣保守、精准投放`;

    optionalItems = `**可选补充（有则方案更精准，没有也能出初版）：**
- 历史召回数据（上一期的分层ROI、转化率、留存率）
- 折扣/权益力度上限（最低几折、部分人群能否免费）
- 触达渠道范围（外呼、短信、千牛push；是否沿用T4以上外呼、低意愿仅短信的规则）`;

  } else if (scene === 'activation') {
    const product = params.product || inferProduct(input);
    const budget = params.budgetAmount ? `${params.budgetAmount}万` : params.budget || '待明确';
    const srcAct = (key: string, val: string) => {
      if (bracketParams[key]) return '用户直说';
      if (freeParams[key]) return '用户直说';
      if (val !== '待明确') return 'AI推断';
      return '待明确';
    };
    
    typeLabel = '用户激活';
    summary = `你要做一次**${product || ''}用户激活**营销活动，预算约${budget}，目标是促进沉默/未使用用户完成首次使用。`;
    
    paramRows = [
      ['活动类型', typeLabel, '从"激活""沉默"等关键词推断'],
      ['产品线', product || '待明确', srcAct('product', product)],
      ['预算', budget, srcAct('budgetAmount', budget)],
      ['目标人群', params.audience || '待明确', srcAct('audience', params.audience || '')],
      ['活动周期', params.timing || '待明确', srcAct('timing', params.timing || '')],
      ['核心目标', params.purpose || '待明确', srcAct('purpose', params.purpose || '')],
    ];

    questions = `**必须明确：**

1. **目标人群？** 需要激活的是哪类用户：
   - ① 注册后从未使用
   - ② 使用过但已沉默超过30天
   - ③ 都包含

2. **活动周期？** 参考一般激活活动为14-30天。

3. **核心目标？** 偏激活人数还是偏后续留存？`;

    optionalItems = `**可选补充：**
- 新手权益/激励力度上限
- 用户首次使用的核心引导动作`;

  } else {
    const product = params.product || inferProduct(input);
    const budget = params.budgetAmount ? `${params.budgetAmount}万` : params.budget || '待明确';
    const purpose = params.purpose || '提升营销效果';
    const srcGen = (key: string, val: string) => {
      if (bracketParams[key]) return '用户直说';
      if (freeParams[key]) return '用户直说';
      if (val !== '待明确' && val !== '提升营销效果') return 'AI推断';
      return '待明确';
    };

    typeLabel = '营销活动';
    summary = `你要做一次**${product || ''}营销**活动，预算约${budget}，目标是${purpose}。`;

    paramRows = [
      ['活动类型', typeLabel, 'AI推断'],
      ['产品线', product || '待明确', srcGen('product', product)],
      ['预算', budget, srcGen('budgetAmount', budget)],
      ['目标人群', params.audience || '待明确', srcGen('audience', params.audience || '')],
      ['活动周期', params.timing || '待明确', srcGen('timing', params.timing || '')],
      ['核心目标', purpose, srcGen('purpose', purpose)],
      ['触达渠道', params.channel || '待明确', srcGen('channel', params.channel || '')],
    ];

    questions = `**必须明确：**

1. **目标人群？** 请描述目标用户的特征或行为条件。

2. **活动周期？** 计划什么时候开始，持续多久？

3. **核心目标？** 偏覆盖人数、转化量、还是ROI？`;

    optionalItems = `**可选补充：**
- 历史活动数据
- 折扣/权益力度上限
- 触达渠道偏好`;
  }

  // Build param table
  const paramTable = `| 参数 | 值 | 来源 |\n|------|------|------|\n` +
    paramRows.map(([k, v, s]) => `| ${k} | ${v} | ${s} |`).join('\n');

  // Build confirmation card
  const confirmCard = `---\n\n确认以下信息后，我将进入策略分析：\n\n` +
    paramRows.map(([k, v]) => `- ${k}：${v}`).join('\n') +
    `\n\n[✅ 确认，开始分析]   [✏️ 我要修改]`;

  const message = `## 我的理解\n\n${summary}\n请确认是否正确。\n\n### 已识别条件\n\n${paramTable}\n\n### 需要补充的信息\n\n${questions}\n\n${optionalItems}\n\n${confirmCard}`;

  return {
    message,
    panelType: null,
    panelContent: null,
    actionType: 'confirm',
  };
}

function inferProduct(input: string): string {
  const patterns = [
    { regex: /极速回款/, val: '极速回款' },
    { regex: /回款/, val: '回款' },
    { regex: /理财/, val: '理财产品' },
    { regex: /贷款|信贷/, val: '信贷产品' },
    { regex: /保险/, val: '保险产品' },
    { regex: /基金/, val: '基金产品' },
    { regex: /信用卡/, val: '信用卡' },
  ];
  for (const p of patterns) {
    if (p.regex.test(input)) return p.val;
  }
  return '';
}

// ===== Main entry point =====
export function generateAIResponse(options: GenerateOptions): AIResponseResult {
  const { userInput, activeSkill, campaign } = options;
  const intent = parsePrimaryIntent(userInput);
  const cap = resolveCapability(userInput, activeSkill);

  // Route by intent type — system preset is composed per-request to shape responses
  void composeSystemPrompt(cap, intent.type);

  // New campaign without template → enter clarification flow (steps 1-4)
  if (intent.type === 'create_new' && !campaign && !hasBracketTemplate(userInput)) {
    return generateClarificationResponse(userInput);
  }

  // Check if clarification is needed
  if (requiresClarification(intent)) {
    return generateClarification(userInput, cap);
  }

  // Route by intent type
  switch (intent.type) {
    case 'create_new':
      return generateCreateNew(userInput, cap, campaign);
    case 'modify_existing':
      return generateModify(userInput, cap, campaign);
    case 'query_data':
      return generateDataQuery(userInput, cap, campaign);
    case 'emergency_action':
      return generateEmergency(userInput, cap, campaign);
    case 'compare':
      return generateComparison(userInput, cap, campaign);
    case 'report':
      return generateReport(userInput, cap, campaign);
    case 'adjust_campaign':
      return generateAdjust(userInput, cap, campaign);
    case 'single_skill':
      return generateSingleSkill(userInput, cap, campaign);
    case 'onboarding':
      return generateOnboarding(userInput);
    case 'explore':
    default:
      return generateByCapability(userInput, cap, campaign);
  }
}

// ===== Intent-specific generators =====

function generateCreateNew(input: string, cap: Capability, campaign: Campaign | null): AIResponseResult {
  const scene = detectBusinessScene(input);
  const params = { ...extractFreeTextParams(input), ...parseBracketParams(input) };

  // Recall scenario (Fix #1: scene-aware response)
  if (scene === 'recall') {
    return generateRecallResponse(input, params, campaign);
  }

  if (scene === 'activation') {
    return generateActivationResponse(input, params, campaign);
  }

  if (lower_includes(input, '方案') || cap === 'plan') {
    return {
      message: `## 营销策略草案

### 已识别信息
- **产品/服务：** ${params.product || '待确认'}
- **活动目的：** ${params.purpose || '待确认'}
- **目标人群：** ${params.audience || '待确认'}
- **预算：** ${params.budgetAmount ? params.budgetAmount + '万' : params.budget || '待确认'}
- **渠道：** ${params.channel || '待确认'}
- **时间：** ${params.timing || '待确认'}

### 渠道策略建议

| 渠道 | 预算占比 | 预期CPM | 预估曝光 |
|------|---------|---------|----------|
| 外呼触达 | 50% | ¥2-5/通 | ${params.budgetAmount ? Math.round(Number(params.budgetAmount) * 1000 / 3.5 / 10000) + '万通' : '待测算'} |
| 短信触达 | 30% | ¥0.03-0.05/条 | ${params.budgetAmount ? Math.round(Number(params.budgetAmount) * 1000 / 0.04 / 10000) + '万条' : '待测算'} |
| Push通知 | 20% | ¥0 | 全量推送 |

> 以上为策略草案，确认后可进入下一步圈人。`,
      panelType: 'plan',
      panelContent: buildPlanContent(),
      actionType: 'confirm',
    };
  }

  if (lower_includes(input, '人群') || lower_includes(input, '圈人') || cap === 'segment') {
    return generateAudienceResponse(input, scene, params, campaign);
  }

  if (lower_includes(input, '外呼') || cap === 'outbound') {
    return {
      message: `## 外呼投放方案\n\n### 三阶段外呼策略\n\n**第一阶段 · AI初筛（D-3~D-1）**\n- 话术：活动预热通知 + 权益到账提醒\n- 预估接通率：45%-55%\n\n**第二阶段 · 精准转化（D-Day~D+3）**\n- 话术：限时优惠 + 紧迫感引导\n- 预估转化率：8%-15%\n\n> 外呼配置已生成，确认后可提交执行。`,
      panelType: 'outbound',
      panelContent: buildOutboundContent(),
      actionType: 'confirm',
    };
  }

  return generateByCapability(input, cap, campaign);
}

function lower_includes(input: string, keyword: string): boolean {
  return input.toLowerCase().includes(keyword);
}

// ===== Scene: Completeness Ask (Fix #5) =====
function _generateCompletenessAsk(missingInfo: string[], scene: BusinessScene): AIResponseResult {
  const sceneLabel: Record<BusinessScene, string> = {
    recall: '召回', activation: '激活', acquisition: '拉新',
    retention: '留存', upsell: '追加', promotion: '促销', generic: '营销',
  };
  return {
    message: `## ${sceneLabel[scene]}活动 — 需要补充以下信息\n\n为了制定更精准的${sceneLabel[scene]}策略，还需要确认以下关键信息：\n\n${missingInfo.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\n> 可以一次性补充，也可以逐项回答，我会基于完整信息再生成方案。`,
    panelType: null,
    panelContent: null,
    actionType: null,
  };
}

// ===== Scene: Recall / 召回 =====
function generateRecallResponse(_input: string, params: Record<string, string>, _campaign: Campaign | null): AIResponseResult {
  const audience = params.audience || '流失用户';
  const budget = params.budgetAmount || '30';
  const channel = params.channel || '外呼';
  const timing = params.timing || '待确认';
  const purpose = params.purpose || '促进回款';

  // Extract loss threshold: prefer explicit lossThreshold param, then regex from audience, then default
  const lossMatch = audience.match(/(\d+)\s*天/);
  const lossDays = params.lossThreshold
    ? params.lossThreshold.replace('天', '')
    : lossMatch
      ? lossMatch[1]
      : '30';

  return {
    message: `## 召回活动策略草案

### 已识别场景：流失商家召回

| 参数 | 值 |
|------|------|
| 产品类型 | ${params.product || '回款'} |
| 召回目的 | ${purpose} |
| 流失定义 | ${lossDays}天未回款 |
| 目标人群 | ${audience} |
| 活动预算 | ${budget}万 |
| 触达渠道 | ${channel} |
| 活动周期 | ${timing} |

### 预估人群量级与成本

| 分层 | 预估人数 | 占比 | 预估触达成本 |
|------|---------|------|------------|
| 30-60天未回款（高意向） | 8,000-12,000 | 35% | ¥${(Number(budget) * 0.4).toFixed(1)}万 |
| 60-180天（中意向） | 15,000-20,000 | 45% | ¥${(Number(budget) * 0.35).toFixed(1)}万 |
| 180天+（低意向） | 5,000-8,000 | 20% | ¥${(Number(budget) * 0.25).toFixed(1)}万 |
| **合计** | **28,000-40,000** | **100%** | **¥${budget}万** |

### 预估效果

| 指标 | 预估 | 依据 |
|------|------|------|
| 接通率 | 42%-52% | 金融外呼基准 + 召回场景特征 |
| 意向率 | 18%-28% | 流失用户意向偏低 |
| 回款转化率 | 5%-10% | 历史召回活动基准 |
| 预计回款人数 | ${Math.round(Number(budget) * 10000 / 30 * 0.07)}-${Math.round(Number(budget) * 10000 / 30 * 0.12)} | 接通 × 意向 × 转化 |
| 预估ROI | 1:4 - 1:7 | 基于历史相似活动 |

### 三阶段外呼策略

**阶段一 · AI初筛（D1-D2）**
- 话术方向：确认身份 + 回款提醒 + 专属权益告知
- 目标：筛选出有回款意向的商家
- 预估接通率：48%-55%

**阶段二 · 人工精准转化（D3-D5）**
- 话术方向：个性化回款方案 + 限时优惠
- 模式：AI筛选高意向 → 转人工坐席
- 预估转化率：10%-15%

**阶段三 · 追单复购（D6-D7）**
- 话术方向：回款确认 + 后续合作引导
- 目标：巩固回款成果，引导持续合作

### 可调参数

以下参数可调整，请在输入框中直接说明：
1. **流失阈值** — 当前${lossDays}天，调整为45天或60天？
2. **权益力度** — 是否提供折扣/免息期？上限多少？
3. **渠道补充** — 是否增加短信/Push辅助触达？
4. **预算分配** — 当前按全量分配，是否按人群分层差异化？
5. **活动偏好** — 偏回款人数优先，还是偏ROI优先？

> 确认策略后可进入正式圈人阶段。`,
    panelType: 'audience',
    panelContent: buildRecallAudienceContent(audience, budget, lossDays),
    actionType: 'confirm',
  };
}

// ===== Scene: Activation / 激活 =====
function generateActivationResponse(_input: string, params: Record<string, string>, _campaign: Campaign | null): AIResponseResult {
  const budget = params.budgetAmount || '30';
  return {
    message: `## 用户激活策略草案

### 已识别场景：沉默/新用户激活

| 参数 | 值 |
|------|------|
| 产品 | ${params.product || '待确认'} |
| 激活目的 | ${params.purpose || '促进首次使用'} |
| 预算 | ${budget}万 |
| 渠道 | ${params.channel || '待确认'} |

### 激活策略建议

1. **首单激励** — 首单立减/首单返现，降低决策门槛
2. **权益引导** — 推送新手专属权益包，引导完成核心动作
3. **限时紧迫** — 权益48小时有效，制造紧迫感

### 可调参数
1. **新手权益力度** — 首单优惠幅度？
2. **引导动作** — 希望用户完成什么核心动作？
3. **触达渠道** — Push+短信 还是仅外呼？

> 确认可进入圈人阶段。`,
    panelType: 'plan',
    panelContent: buildPlanContent(),
    actionType: 'confirm',
  };
}

// ===== Rich audience response with quantitative data (Fix #2 + #4) =====
function generateAudienceResponse(input: string, scene: BusinessScene, params: Record<string, string>, _campaign: Campaign | null): AIResponseResult {
  if (scene === 'recall') {
    return generateRecallResponse(input, params, _campaign);
  }

  const audienceContent = buildAudienceContent();
  return {
    message: `## 目标人群分析

### 核心人群分层

**人群A · 高意向潜客** [优先级 · 最高]
| 维度 | 条件 |
|------|------|
| 近30天行为 | 搜索品类关键词 ≥ 3次 |
| **预估量级** | **50万-80万** |
| **预估触达成本** | **¥12-18万** |

**人群B · 相似扩展** [优先级 · 高]
| 维度 | 条件 |
|------|------|
| 种子人群 | 近90天已购用户 |
| **预估量级** | **200万-300万** |
| **预估触达成本** | **¥25-35万** |

### 预估效果

| 指标 | 人群A | 人群B |
|------|-------|-------|
| 预估接通率 | 48%-55% | 35%-45% |
| 预估转化率 | 8%-12% | 4%-8% |
| 预估CPA | ¥80-120 | ¥150-200 |

### 可调参数
1. **人群A条件** — 搜索关键词次数 ≥ 3次，是否放宽到 ≥ 2次？
2. **人群B扩展比例** — 当前Top 10%，可调整到Top 20%或Top 5%
3. **排除条件** — 是否排除近7天已转化用户？
4. **预算分配** — 人群A vs B的预算比例？

> 人群表已产出，确认后可进入下一步。`,
    panelType: 'audience',
    panelContent: audienceContent,
    actionType: 'confirm',
  };
}

function generateModify(_input: string, _cap: Capability, campaign: Campaign | null): AIResponseResult {
  const contextHint = campaign
    ? `（当前计划：${campaign.title}，状态：${campaign.status}）`
    : '';

  return {
    message: `已根据你的要求进行调整。${contextHint}

请确认修改后的方案是否符合预期。如需进一步调整，请继续说明。`,
    panelType: 'plan',
    panelContent: buildPlanContent(),
    actionType: 'confirm',
  };
}

function generateDataQuery(_input: string, _cap: Capability, _campaign: Campaign | null): AIResponseResult {
  return {
    message: `## 投放效果数据

| 指标 | 数值 | 对比上周 |
|------|------|----------|
| 拨打量 | 48,230 通 | ↑ 12% |
| 接通量 | 21,703 通 | ↑ 8% |
| 接通率 | 45.0% | ↑ 2pp |
| 意向率 | 32.1% | ↑ 3pp |
| 转化人数 | 4,215 人 | ↑ 15% |
| 平均通话时长 | 48s | - |

> 数据持续回流中，可随时查询最新效果。`,
    panelType: 'data',
    panelContent: buildDataContent(),
    actionType: null,
  };
}

function generateEmergency(input: string, _cap: Capability, _campaign: Campaign | null): AIResponseResult {
  const lower = input.toLowerCase();
  if (lower.includes('暂停')) {
    return {
      message: `⚠️ 已收到紧急暂停指令。

当前投放计划已暂停，所有渠道停止消耗。暂停前的数据：

| 指标 | 数值 |
|------|------|
| 已消耗预算 | ¥12,450 |
| 已触达用户 | 38,200 |
| 产生转化 | 1,240 |

> 暂停已生效。随时可恢复或调整计划。`,
      panelType: 'data',
      panelContent: buildDataContent(),
      actionType: 'resume',
    };
  }

  return {
    message: `⚠️ 收到紧急指令，正在进行风险排查...

当前投放计划状态正常。是否需要暂停投放或调整策略？`,
    panelType: null,
    panelContent: null,
    actionType: 'pause',
  };
}

function generateComparison(_input: string, _cap: Capability, _campaign: Campaign | null): AIResponseResult {
  return {
    message: `## 方案对比分析

### 方案A vs 方案B

| 维度 | 方案A（抖音主导） | 方案B（全渠道均衡） |
|------|-------------------|---------------------|
| 覆盖人群 | 200万 | 350万 |
| 预估成本 | ¥28万 | ¥35万 |
| 预期ROI | 1:6.5 | 1:5.8 |
| 风险等级 | 中 | 低 |

> 综合评估：方案B覆盖更广、风险更低，适合长期品牌建设；方案A ROI更高，适合短期冲量。`,
    panelType: 'comparison',
    panelContent: {
      kind: 'comparison',
      plans: [
        {
          name: '方案A · 抖音主导',
          audience: '200万（抖音核心用户）',
          cost: '¥28万',
          roi: '1:6.5',
          pros: ['ROI高', '起量快', '素材制作成本低'],
          cons: ['渠道单一', '风险集中', '长期衰减明显'],
        },
        {
          name: '方案B · 全渠道均衡',
          audience: '350万（多渠道覆盖）',
          cost: '¥35万',
          roi: '1:5.8',
          pros: ['覆盖面广', '风险分散', '品牌效应好'],
          cons: ['成本较高', '管理复杂', '素材需求多'],
        },
      ],
    },
    actionType: 'confirm',
  };
}

function generateReport(_input: string, _cap: Capability, _campaign: Campaign | null): AIResponseResult {
  return {
    message: `## 活动效果报告

### 核心指标汇总

| 指标 | 目标 | 实际 | 达成率 |
|------|------|------|--------|
| 覆盖人数 | 50万 | 52.3万 | 104.6% |
| 接通率 | 45% | 47.2% | 104.9% |
| 转化人数 | 5,000 | 5,420 | 108.4% |
| ROI | 1:5 | 1:7.7 | 154% |

### 关键发现
1. 外呼时段14:00-16:00接通率最高（52%）
2. 话术B版本（利益点前置）转化率优于A版本15%
3. 抖音渠道CPA低于预期23%

> 报告已生成，可导出完整版本。`,
    panelType: 'report',
    panelContent: {
      kind: 'report',
      summary: '本次活动超额完成目标，ROI达到1:7.7，远超预期的1:5。核心驱动因素：精准人群圈选、话术持续优化、渠道预算动态调配。',
      metrics: [
        { label: '覆盖人数', value: '52.3万', trend: 'up' },
        { label: '接通率', value: '47.2%', trend: 'up' },
        { label: '转化人数', value: '5,420', trend: 'up' },
        { label: 'ROI', value: '1:7.7', trend: 'up' },
      ],
      insights: [
        '外呼时段14:00-16:00接通率最高（52%），建议后续活动重点安排该时段',
        '话术B版本（利益点前置）转化率优于A版本15%，可在下次活动中直接采用',
        '抖音渠道CPA低于预期23%，可考虑增加预算分配',
      ],
    },
    actionType: 'export',
  };
}

function generateAdjust(_input: string, _cap: Capability, campaign: Campaign | null): AIResponseResult {
  const context = campaign ? `当前计划「${campaign.title}」已调整。` : '调整已生效。';

  return {
    message: `${context}

根据你的要求，已更新投放配置。调整后的预估效果：

| 指标 | 调整前 | 调整后 |
|------|--------|--------|
| 日预算 | ¥5,000 | ¥7,500 |
| 预估曝光 | 120万 | 180万 |
| 预估转化 | 1,200 | 1,800 |

> 调整已生效，数据将在下一周期更新。`,
    panelType: 'data',
    panelContent: buildDataContent(),
    actionType: 'viewDetails',
  };
}

function generateSingleSkill(input: string, cap: Capability, campaign: Campaign | null): AIResponseResult {
  const scene = detectBusinessScene(input);
  const params = { ...extractFreeTextParams(input), ...parseBracketParams(input) };

  if (lower_includes(input, '圈人') || lower_includes(input, '人群') || cap === 'segment') {
    if (scene === 'recall') {
      return generateRecallResponse(input, params, campaign);
    }
    const audienceContent = buildAudienceContent();
    return {
      message: `## AI圈人结果\n\n### 核心人群分层\n\n**人群A · 高意向潜客** [优先级 · 最高]\n| 维度 | 条件 | 预估量级 |\n|------|------|--------|\n| 近30天行为 | 搜索品类关键词 ≥ 3次 | 50万-80万 |\n| 竞品浏览 | 浏览竞品店铺 ≥ 3次 | |\n\n**人群B · 相似扩展** [优先级 · 高]\n| 维度 | 条件 | 预估量级 |\n|------|------|--------|\n| 种子人群 | 近90天已购用户 | 200万-300万 |\n| 扩展比例 | Top 10% 相似度 | |\n\n### 预估效果\n| 人群 | 量级 | 预估成本 | 预估转化 |\n|------|------|--------|--------|\n| 人群A | 50-80万 | ¥12-18万 | 4-9.6万 |\n| 人群B | 200-300万 | ¥25-35万 | 8-24万 |\n\n### 可调参数\n1. 人群A搜索次数阈值 — ≥ 3次 还是 ≥ 2次？\n2. 人群B扩展比例 — Top 10% 还是 Top 20%？\n3. 是否排除近7天已转化用户？\n\n> 人群表已产出，确认后可进行正式圈人。`,
      panelType: 'audience',
      panelContent: audienceContent,
      actionType: 'confirm',
    };
  }

  if (lower_includes(input, '外呼') || lower_includes(input, '话术') || cap === 'outbound') {
    return {
      message: `## 外呼话术

### 推荐话术框架
1. **开场（5s）：** 确认身份 + 活动告知
2. **痛点（10s）：** 场景共鸣 + 产品亮点
3. **方案（15s）：** 优惠力度 + 使用方式
4. **行动（5s）：** 限时紧迫感 + CTA引导`,
      panelType: 'outbound',
      panelContent: buildOutboundContent(),
      actionType: 'confirm',
    };
  }

  if (lower_includes(input, '数据') || lower_includes(input, '转化') || lower_includes(input, '效果')) {
    return {
      message: `## 数据查询结果

已获取最新投放数据，详情见右侧面板。`,
      panelType: 'data',
      panelContent: buildDataContent(),
      actionType: 'viewDetails',
    };
  }

  return generateByCapability(input, cap, campaign);
}

function generateOnboarding(input: string): AIResponseResult {
  const lower = input.toLowerCase();

  if (lower.includes('功能') || lower.includes('能做') || lower.includes('有什么')) {
    return {
      message: `## 欢迎使用金融运营助手！

我是你的AI营销运营助手，以下是我能帮你完成的核心任务：

### 🎯 四大核心能力
1. **营销方案生成** — 智能生成全渠道营销方案、ROI测算
2. **AI圈人** — 精准圈选目标人群，支持多维标签组合
3. **外呼投放** — 自动化外呼触达、话术生成
4. **数据查询** — 投放效果实时查询与分析

### 🚀 快速上手
- 在左侧点击能力模块，或直接输入需求
- 我支持多轮对话，可以持续调整方案
- 结构化内容会在右侧面板展示

> 试试输入「帮我生成一个双十一投放方案」开始吧！`,
      panelType: 'onboarding',
      panelContent: {
        kind: 'onboarding',
        steps: [
          { title: '选择能力', description: '在左侧边栏选择需要的营销能力，或直接输入需求', icon: '🎯' },
          { title: '描述需求', description: '用自然语言描述你的营销目标和约束条件', icon: '💬' },
          { title: '确认方案', description: 'AI生成方案后，你可以确认、修改或重新生成', icon: '✅' },
          { title: '执行投放', description: '方案确认后进入执行阶段，实时追踪效果数据', icon: '🚀' },
          { title: '复盘优化', description: '活动结束后查看完整复盘报告，持续优化策略', icon: '📊' },
        ],
      },
      actionType: null,
    };
  }

  return {
    message: `## 👋 欢迎！

我是金融运营助手，可以帮你完成营销方案生成、AI圈人、外呼投放、数据查询等任务。

**你希望我帮你做什么？** 直接输入你的需求即可开始。`,
    panelType: 'onboarding',
    panelContent: {
      kind: 'onboarding',
      steps: [
        { title: '选择能力', description: '在左侧边栏选择需要的营销能力，或直接输入需求', icon: '🎯' },
        { title: '描述需求', description: '用自然语言描述你的营销目标和约束条件', icon: '💬' },
        { title: '确认方案', description: 'AI生成方案后，你可以确认、修改或重新生成', icon: '✅' },
        { title: '执行投放', description: '方案确认后进入执行阶段，实时追踪效果数据', icon: '🚀' },
        { title: '复盘优化', description: '活动结束后查看完整复盘报告，持续优化策略', icon: '📊' },
      ],
    },
    actionType: null,
  };
}

function generateClarification(_input: string, cap: Capability): AIResponseResult {
  const hints: Record<Capability, string> = {
    plan: '你可以告诉我：产品类型、目标人群、预算范围、活动时间等',
    segment: '你可以告诉我：目标画像、行为条件、预估量级要求等',
    outbound: '你可以告诉我：外呼目标、话术场景、拨打时段等',
    data: '你可以告诉我：查询指标、时间范围、对比维度等',
  };

  return {
    message: `我需要更多信息来帮你处理。${hints[cap] || hints.plan}

也可以尝试更具体的描述，例如：
- "为理财产品制定Q4投放方案"
- "圈选近30天活跃但未转化的用户"
- "查询上周外呼投放的转化数据"`,
    panelType: null,
    panelContent: null,
    actionType: null,
  };
}

function generateByCapability(_input: string, cap: Capability, _campaign: Campaign | null): AIResponseResult {
  switch (cap) {
    case 'plan':
      return {
        message: `## 营销投放方案

### 策略总览
基于产品特性和市场环境，推荐以下投放策略：

| 渠道 | 预算占比 | 预期CPM | 预估曝光 |
|------|---------|---------|----------|
| 抖音信息流 | 35% | ¥15-25 | 200万+ |
| 小红书种草 | 25% | ¥20-30 | 150万+ |
| 微信朋友圈 | 20% | ¥30-50 | 100万+ |
| 搜索竞价 | 10% | ¥8-15 | 80万+ |
| 外呼触达 | 10% | ¥2-5/通 | 5万通 |

> 方案已生成，请确认或修改后进入下一步。`,
        panelType: 'plan',
        panelContent: buildPlanContent(),
        actionType: 'confirm',
      };
    case 'segment':
      return {
        message: `## 目标人群表

**人群A · 高意向潜客** [优先级 · 最高]
预估量级：50万-80万

> 人群表已产出，确认后可进行正式圈人。`,
        panelType: 'audience',
        panelContent: buildAudienceContent(),
        actionType: 'confirm',
      };
    case 'outbound':
      return {
        message: `## 外呼投放方案

- 第一阶段 · AI初筛：5,000-8,000通/天
- 第二阶段 · 精准转化：高意向转人工
- 第三阶段 · 追单复购：已购用户复购

> 外呼配置已生成，确认后可提交执行。`,
        panelType: 'outbound',
        panelContent: buildOutboundContent(),
        actionType: 'confirm',
      };
    case 'data':
      return {
        message: `## 投放效果数据

| 指标 | 数值 |
|------|------|
| 拨打量 | 48,230 通 |
| 接通率 | 45.0% |
| 意向率 | 32.1% |

> 数据持续回流中，可随时查询最新效果。`,
        panelType: 'data',
        panelContent: buildDataContent(),
        actionType: null,
      };
  }
}

// ===== Content builders =====

function buildPlanContent() {
  return {
    kind: 'plan' as const,
    background: '本次营销活动旨在促进不活跃商家回款。当前退出商家人数占比高达XX%，亟需通过精准营销手段激活存量商家，提升回款率。活动目标为在30天内实现回款转化率提升15%，覆盖目标人群50万+。',
    audienceStrategy: '目标人群分为三层：\n\n**人群A · 高意向潜客**（预估50-80万）\n- 近30天搜索品类关键词 ≥ 3次\n- 浏览竞品店铺 ≥ 3次\n- 加购未支付\n\n**人群B · 相似扩展**（预估200-300万）\n- 种子人群：近90天已购用户\n- 扩展比例：Top 10% 相似度\n\n**人群C · 兴趣标签**（预估500万+）\n- 兴趣标签：品质生活、科技数码、时尚穿搭\n- 年龄：25-40岁\n- 城市：一线+新一线',
    outboundStrategy: '采用三阶段外呼策略：\n\n**第一阶段 · AI初筛（D-3~D-1）**\n- 话术：活动预热通知 + 券到账提醒\n- 时段：10:00-12:00 / 14:00-18:00\n- 预估接通率：45%-55%\n- 日外呼量：5,000-8,000通\n\n**第二阶段 · 精准转化（D-Day~D+3）**\n- 话术：限时优惠 + 券即将过期提醒\n- 模式：AI初筛 → 高意向转人工\n- 预估转化率：8%-15%',
    callScripts: '### 推荐话术框架\n\n**1. 开场（5s）**\n确认身份 + 活动告知 + 券已到账\n\n**2. 痛点（10s）**\n场景共鸣 + 产品亮点\n\n**3. 方案（15s）**\n优惠力度 + 券使用方式\n\n**4. 行动（5s）**\n限时紧迫感 + CTA引导',
    roiCalculation: '基于历史数据测算：\n\n| 指标 | 数值 |\n|------|------|\n| 外呼覆盖人数 | 50万 |\n| 预计接通人数（45%） | 22.5万 |\n| 预计意向人数（30%） | 6.75万 |\n| 预计转化人数（8%） | 5,400 |\n| 预计收入（客单¥500） | ¥270万 |\n| 总预算（含券成本） | ¥35万 |\n| **预期ROI** | **1:7.7** |',
    expectedResults: '基于历史相似活动数据，预期效果如下：\n\n- 接通率：≥ 45%\n- 意向率：≥ 30%\n- 转化率：≥ 8%\n- 复购率（后续90天）：≥ 15%\n- 活动ROI：≥ 1:5',
  };
}

function buildAudienceContent() {
  return {
    kind: 'audience' as const,
    segments: [
      {
        name: '人群A · 高意向潜客',
        priority: '最高' as const,
        conditions: [
          { dimension: '近30天行为', condition: '搜索品类关键词 ≥ 3次' },
          { dimension: '竞品浏览', condition: '浏览竞品店铺 ≥ 3次' },
          { dimension: '购物车状态', condition: '加购未支付' },
        ],
        estimatedVolume: '50万-80万',
      },
      {
        name: '人群B · 相似扩展',
        priority: '高' as const,
        conditions: [
          { dimension: '种子人群', condition: '近90天已购用户' },
          { dimension: '扩展比例', condition: 'Top 10% 相似度' },
        ],
        estimatedVolume: '200万-300万',
      },
      {
        name: '人群C · 兴趣标签',
        priority: '中' as const,
        conditions: [
          { dimension: '兴趣标签', condition: '品质生活、科技数码、时尚穿搭' },
          { dimension: '年龄', condition: '25-40岁' },
          { dimension: '城市', condition: '一线+新一线' },
        ],
        estimatedVolume: '500万+',
      },
    ],
  };
}

function buildRecallAudienceContent(_audienceDesc: string, _budget: string, lossDays: string) {
  return {
    kind: 'audience' as const,
    segments: [
      {
        name: `人群A · ${lossDays}-60天未回款（高意向）`,
        priority: '最高' as const,
        conditions: [
          { dimension: '流失时长', condition: `${lossDays}-60天未回款` },
          { dimension: '历史回款', condition: '历史回款次数 ≥ 3次' },
          { dimension: '活跃度', condition: '近7天有登录/浏览行为' },
        ],
        estimatedVolume: '8,000-12,000',
      },
      {
        name: `人群B · 60-180天未回款（中意向）`,
        priority: '高' as const,
        conditions: [
          { dimension: '流失时长', condition: '60-180天未回款' },
          { dimension: '历史回款', condition: '历史回款次数 ≥ 1次' },
          { dimension: '商家等级', condition: '年框商家' },
        ],
        estimatedVolume: '15,000-20,000',
      },
      {
        name: `人群C · 180天+未回款（低意向）`,
        priority: '中' as const,
        conditions: [
          { dimension: '流失时长', condition: '180天以上未回款' },
          { dimension: '商家状态', condition: '年框未到期' },
        ],
        estimatedVolume: '5,000-8,000',
      },
    ],
  };
}

function buildOutboundContent() {
  return {
    kind: 'outbound' as const,
    schedule: 'D-3~D-1 AI初筛 → D-Day~D+3 精准转化 → D+4~D+7 追单复购',
    concurrency: '5,000-8,000通/天',
    channels: ['AI外呼', '人工坐席'],
  };
}

function buildDataContent() {
  return {
    kind: 'data' as const,
    metrics: [
      { label: '拨打量', value: '48,230', trend: 'up' as const },
      { label: '接通率', value: '45.0%', trend: 'up' as const },
      { label: '意向率', value: '32.1%', trend: 'up' as const },
      { label: '转化人数', value: '4,215', trend: 'up' as const },
    ],
    summary: '本周投放效果整体向好，各项核心指标均有提升。接通率稳定在45%以上，意向率突破32%，转化人数环比增长15%。',
  };
}
