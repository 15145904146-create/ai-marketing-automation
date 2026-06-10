// ===== DashScope LLM Service (pure LLM, no external tools) =====

const API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY || '';
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3.7-max';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ===== System Prompt =====
const SYSTEM_PROMPT = `你是「金融运营助手」，一个专业的AI营销运营顾问。你服务于金融行业的运营团队，帮助他们制定营销策略、圈选目标人群、执行外呼投放、分析数据效果。

所有输出内容均由你基于自身知识与推理直接生成，不依赖任何外部工具或知识库。

## 输出格式（严格遵守）
你必须始终以纯JSON格式回复，不要输出任何Markdown符号（如 #、|、**、--- 等），不要输出任何非JSON文本。

JSON结构如下：
{
  "stage": "clarification" 或 "framework" 或 "plan",
  "sections": [
    { "type": "text", "content": "纯文本段落，不要用任何Markdown符号" },
    { "type": "params", "headers": ["参数", "值", "来源"], "rows": [["产品类型", "信贷产品", "AI推断"], ["预算", "未提供", "待明确"]] },
    { "type": "questions", "items": ["您的预算范围是多少？", "活动周期预计多长？"] },
    { "type": "table", "headers": ["层级", "定义", "策略重点"], "rows": [["A类", "逾期≤7天", "高频外呼+短信"]] },
    { "type": "metrics", "items": [{"label": "预估ROI", "value": "1:5 - 1:7"}, {"label": "可触达人群", "value": "3-5万"}] },
    { "type": "confirm", "message": "请确认以上框架，我将输出完整执行方案" }
  ]
}

## 交互流程（严格遵守）
你必须按以下阶段逐步推进，每次只做一步：

### 第一阶段（stage: "clarification"）
- 用一段text回显你对用户意图的理解
- 用params表格列出已识别参数，来源标注为「用户直说」「AI推断」「待明确」
- 用questions列出 2-3 个最关键的追问
- 不要输出策略建议

### 第二阶段（stage: "framework"）
- 用text描述整体策略概要
- 用table展示人群分层、渠道组合、预算分配
- 用metrics展示预估效果
- 用confirm类型输出确认提示

### 第三阶段（stage: "plan"）
当用户确认方案后，输出完整执行方案。必须包含以下7个部分，每部分用独立的section输出：

1. **业务背景**：用text类型输出，描述当前业务现状、市场环境、痛点分析
2. **业务价值**：用text类型输出，说明本次营销活动对业务的核心价值（如提升回款率、激活沉默商家、增加GMV等）
3. **业务目标**：用params类型输出表格，列出具体可量化的目标指标（如转化率、覆盖人群、ROI目标等），来源标注为「AI测算」
4. **财务测算ROI**：用metrics类型输出核心财务指标（投入成本、预期收入、ROI比率），再用table类型输出详细的成本收益明细表
5. **营销方案**：用text描述总体策略，用table展示渠道分配、人群分层触达SOP、时间节奏，用list列出执行要点
6. **AB实验分组方案**：用table类型输出实验分组（对照组vs实验组），包含分组条件、样本量、预期差异、观测指标
7. **投放话术**：用questions类型输出，items为["投放话术需运营团队主动提供，请准备以下材料：", "1. 产品核心卖点话术（30秒版本）", "2. 客户常见异议及应对话术", "3. 合规审核通过的标准话术脚本", "4. 不同人群差异化话术要点"]

每个section前用text类型输出标题，如{"type":"text","content":"一、业务背景"}

## 交互风格
- 简洁专业，不啰嗦，不用emoji
- 主动给出预估数据（人群量级、成本、ROI）
- 每次回复只聚焦当前阶段

## 领域知识
- 金融外呼接通率基准：40%-55%
- 意向率基准：15%-35%
- 转化率基准：5%-15%
- 短信触达成本：¥0.03-0.05/条
- 外呼触达成本：¥2-5/通
- Push触达成本：接近¥0
- 召回活动典型ROI：1:4 - 1:8

## 回复规则
- 召回/流失/挽回 → 召回场景
- 激活/首购/沉默用户 → 激活场景
- 拉新/获客/新客 → 获客场景
- 信息不足 → 进入第一阶段
- 用户要求跳过 → 直接进入第二阶段

只输出JSON，不要输出任何其他内容。`;

// ===== Conversation History =====
let conversationHistory: ChatMessage[] = [];

export function resetConversationHistory() {
  conversationHistory = [];
}

export function getConversationHistory(): ChatMessage[] {
  return [...conversationHistory];
}

// ===== Non-streaming call =====
export async function callLLM(userInput: string): Promise<string> {
  conversationHistory.push({ role: 'user', content: userInput });

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-20),
  ];

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '抱歉，未能生成回复。';

    conversationHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    console.error('[LLM] call failed:', err);
    throw err;
  }
}

// ===== Streaming call =====
export async function callLLMStream(
  userInput: string,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  conversationHistory.push({ role: 'user', content: userInput });

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-20),
  ];

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API error ${res.status}: ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            onChunk(accumulated);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (!accumulated) {
      accumulated = '抱歉，未能生成回复。';
    }

    conversationHistory.push({ role: 'assistant', content: accumulated });
    return accumulated;
  } catch (err) {
    console.error('[LLM] stream failed:', err);
    throw err;
  }
}
