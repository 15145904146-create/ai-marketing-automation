import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import CampaignProgress from './CampaignProgress';
import type { Message, PanelType, PanelContent, ActionType, Campaign } from '../../types';
import { generateAIResponse } from '../../engine/ai-response';
import { callLLMStream } from '../../engine/llm-service';
import { callSegmentStream } from '../../engine/segment-service';
import { USER_PROMPT_TEMPLATES } from '../../engine/presets';
import { createCampaign, advanceStep, addTurn, addDecision } from '../../engine/workflow';
import { useAuth, getUserDisplayName } from '../../auth/AuthContext';

type Capability = 'plan' | 'segment' | 'outbound' | 'data';

interface ChatWindowProps {
  activeSkill: string | null;
  onClearSkill: () => void;
  onPanelUpdate: (type: PanelType, content: PanelContent) => void;
  onConversationStart: (title: string) => void;
  campaign: Campaign | null;
  onCampaignChange: (campaign: Campaign) => void;
  hasHistory: boolean;
  activeCampaignCount: number;
}

const skillLabels: Record<string, string> = {
  plan: '营销方案生成',
  segment: 'AI圈人',
  outbound: '外呼投放',
  data: '营销券配置',
};

function getCurrentTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

const suggestedPrompts: Record<Capability, string[]> = {
  plan: USER_PROMPT_TEMPLATES.plan,
  segment: USER_PROMPT_TEMPLATES.segment,
  outbound: USER_PROMPT_TEMPLATES.outbound,
  data: USER_PROMPT_TEMPLATES.data,
};

export default function ChatWindow({ activeSkill, onClearSkill, onPanelUpdate, onConversationStart, campaign, onCampaignChange, hasHistory, activeCampaignCount }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const userDisplayName = getUserDisplayName(user);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (content: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: getCurrentTime(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Notify parent on first message to create conversation entry
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const title = content.length > 20 ? content.slice(0, 20) + '...' : content;
      onConversationStart(title);
    }

    // AI message ID (added to messages on first chunk, not before)
    const aiMsgId = (Date.now() + 1).toString();
    let aiMsgAdded = false;

    // Use segment service when AI圈人 skill is active, otherwise use main LLM
    const streamFn = activeSkill === 'segment' ? callSegmentStream : callLLMStream;

    try {
      const fullReply = await streamFn(content, (accumulated) => {
        if (!aiMsgAdded) {
          // First chunk: hide typing dots and add AI message
          aiMsgAdded = true;
          setIsTyping(false);
          setStreamingMsgId(aiMsgId);
          const aiMsg: Message = {
            id: aiMsgId,
            role: 'assistant',
            content: accumulated,
            timestamp: getCurrentTime(),
          };
          setMessages(prev => [...prev, aiMsg]);
        } else {
          // Subsequent chunks: update content
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m)
          );
        }
      });

      // Streaming complete — clear streaming state
      setStreamingMsgId(null);

      // Finalize message
      setMessages(prev =>
        prev.map(m => m.id === aiMsgId ? { ...m, content: fullReply, actionType: 'confirm' } : m)
      );

      // Auto-create campaign
      if (!campaign) {
        const newCampaign = createCampaign(content.length > 20 ? content.slice(0, 20) : content);
        onCampaignChange(newCampaign);
        addTurn(newCampaign.id, content, fullReply);
      } else {
        addTurn(campaign.id, content, fullReply);
      }
    } catch (err) {
      // Fallback to rule-based engine on error
      console.warn('[ChatWindow] LLM failed, using rule-based fallback:', err);
      const cap = (activeSkill as Capability) || null;
      const response = generateAIResponse({
        userInput: content,
        activeSkill: cap,
        campaign: campaign || null,
      });

      const fallbackMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: response.message,
        timestamp: getCurrentTime(),
        actionType: response.actionType ?? undefined,
      };

      if (aiMsgAdded) {
        // Message already exists, update it
        setMessages(prev => prev.map(m => m.id === aiMsgId ? fallbackMsg : m));
      } else {
        // Message was never added, add it now
        setMessages(prev => [...prev, fallbackMsg]);
      }

      let updatedCampaign = campaign || null;
      if (!updatedCampaign && response.actionType) {
        updatedCampaign = createCampaign(content.length > 20 ? content.slice(0, 20) : content);
        onCampaignChange(updatedCampaign);
      }
      if (updatedCampaign) {
        addTurn(updatedCampaign.id, content, response.message);
      }
      onPanelUpdate(response.panelType, response.panelContent);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = (_messageId: string, action: ActionType) => {
    let updatedCampaign = campaign;

    // Brief typing indicator for acknowledgment
    setIsTyping(true);

    const respond = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      setIsTyping(false);
    };

    switch (action) {
      case 'confirm': {
        // Advance campaign workflow step
        if (updatedCampaign) {
          updatedCampaign = advanceStep(updatedCampaign);
          onCampaignChange(updatedCampaign);
          addDecision(updatedCampaign.id, 'confirmed');
        }

        // Add user confirmation message
        const confirmUserMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: '确认方案，请生成完整执行方案',
          timestamp: getCurrentTime(),
        };
        setMessages(prev => [...prev, confirmUserMsg]);

        // Stream the full plan from LLM
        const planMsgId = (Date.now() + 1).toString();
        let planMsgAdded = false;
        setIsTyping(true);

        callLLMStream('确认方案，请生成完整执行方案', (accumulated) => {
          if (!planMsgAdded) {
            planMsgAdded = true;
            setIsTyping(false);
            setStreamingMsgId(planMsgId);
            const planMsg: Message = {
              id: planMsgId,
              role: 'assistant',
              content: accumulated,
              timestamp: getCurrentTime(),
            };
            setMessages(prev => [...prev, planMsg]);
          } else {
            setMessages(prev =>
              prev.map(m => m.id === planMsgId ? { ...m, content: accumulated } : m)
            );
          }
        }).then((fullReply) => {
          setStreamingMsgId(null);
          setMessages(prev =>
            prev.map(m => m.id === planMsgId ? { ...m, content: fullReply } : m)
          );
          if (updatedCampaign) {
            addTurn(updatedCampaign.id, '确认方案，请生成完整执行方案', fullReply);
          }
        }).catch(() => {
          setIsTyping(false);
          setStreamingMsgId(null);
          const fallbackMsg: Message = {
            id: planMsgId,
            role: 'assistant',
            content: '已确认方案。完整方案生成失败，请重试。',
            timestamp: getCurrentTime(),
          };
          if (planMsgAdded) {
            setMessages(prev => prev.map(m => m.id === planMsgId ? fallbackMsg : m));
          } else {
            setMessages(prev => [...prev, fallbackMsg]);
          }
        });
        break;
      }
      case 'modify': {
        const modifyMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '请告诉我需要修改哪些内容，例如：\n- "修改人群条件"\n- "调整预算分配"\n- "优化外呼话术"\n- "更改活动时间"',
          timestamp: getCurrentTime(),
        };
        setTimeout(() => respond(modifyMsg), 400);
        if (updatedCampaign) {
          addDecision(updatedCampaign.id, 'modify_requested');
        }
        break;
      }
      case 'regenerate': {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          setIsTyping(true);
          const regenMsgId = Date.now().toString();
          let regenAdded = false;
          callLLMStream(lastUserMsg.content + '（请重新生成）', (accumulated) => {
            if (!regenAdded) {
              regenAdded = true;
              setIsTyping(false);
              setStreamingMsgId(regenMsgId);
              const regenMsg: Message = {
                id: regenMsgId,
                role: 'assistant',
                content: accumulated,
                timestamp: getCurrentTime(),
              };
              setMessages(prev => [...prev, regenMsg]);
            } else {
              setMessages(prev =>
                prev.map(m => m.id === regenMsgId ? { ...m, content: accumulated } : m)
              );
            }
          }).then(() => {
            setStreamingMsgId(null);
          }).catch(() => {
            setIsTyping(false);
            setStreamingMsgId(null);
            const fallbackMsg: Message = {
              id: regenMsgId,
              role: 'assistant',
              content: '抱歉，重新生成失败，请重试。',
              timestamp: getCurrentTime(),
            };
            if (regenAdded) {
              setMessages(prev => prev.map(m => m.id === regenMsgId ? fallbackMsg : m));
            } else {
              setMessages(prev => [...prev, fallbackMsg]);
            }
          });
        }
        break;
      }
      case 'approve': {
        const approveMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '审批已通过。方案将进入执行阶段，可在右侧面板查看执行进度。',
          timestamp: getCurrentTime(),
          actionType: 'viewDetails',
        };
        setTimeout(() => respond(approveMsg), 400);
        break;
      }
      case 'reject': {
        const rejectMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '已驳回。请说明驳回原因或修改方向，我将重新调整方案。',
          timestamp: getCurrentTime(),
        };
        setTimeout(() => respond(rejectMsg), 400);
        break;
      }
      case 'pause': {
        const pauseMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '⏸ 投放已暂停。所有渠道停止消耗，数据保持当前状态。随时可以恢复投放。',
          timestamp: getCurrentTime(),
          actionType: 'resume',
        };
        setTimeout(() => respond(pauseMsg), 400);
        break;
      }
      case 'resume': {
        const resumeMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '▶ 投放已恢复。渠道重新开始消耗，数据将在下一更新周期刷新。',
          timestamp: getCurrentTime(),
          actionType: 'pause',
        };
        setTimeout(() => respond(resumeMsg), 400);
        break;
      }
      case 'export': {
        const exportMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '报告导出中... 导出完成后可在下载列表查看。',
          timestamp: getCurrentTime(),
        };
        setTimeout(() => respond(exportMsg), 600);
        break;
      }
      case 'viewDetails': {
        const detailMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '详细信息已在右侧面板展示。',
          timestamp: getCurrentTime(),
        };
        setTimeout(() => respond(detailMsg), 300);
        break;
      }
      case 'retry': {
        const retryMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '正在重试... 请稍候。',
          timestamp: getCurrentTime(),
        };
        setTimeout(() => respond(retryMsg), 400);
        break;
      }
      case 'adjust': {
        const adjustMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '请描述需要调整的内容，例如：\n- "把日预算从5000调整到8000"\n- "增加抖音渠道比例"\n- "缩小人群范围到一线城市"',
          timestamp: getCurrentTime(),
        };
        setTimeout(() => respond(adjustMsg), 400);
        break;
      }
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSend(prompt);
  };

  const isEmpty = messages.length === 0;

  const skillTag = activeSkill ? skillLabels[activeSkill] || null : null;

  // Heading and suggestions for empty state
  const heading = activeSkill
    ? skillLabels[activeSkill] || '营销方案生成'
    : null;
  const subtitle = activeSkill ? '输入需求，AI 将为你提供专业的服务' : null;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Messages area — always present, shows home/skill content when empty */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef} style={{ overflowAnchor: 'none' }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
            {/* Heading */}
            {heading ? (
              <div className="text-center mb-5">
                <h1 className="text-xl font-semibold text-slate-800 mb-1.5">{heading}</h1>
                <p className="text-slate-400 text-xs">{subtitle}</p>
              </div>
            ) : (
              <div className="text-center mb-5 max-w-md">
                <p className="text-slate-500 text-xs leading-relaxed">
                  Hi {userDisplayName}，我是你的金融运营助手。输入你的营销活动需求，我来帮你制定方案、圈选人群、执行投放。
                </p>
              </div>
            )}

            {/* Centered tall input */}
            <div className="w-full max-w-3xl mb-6">
              <ChatInput
                onSend={handleSend}
                disabled={isTyping}
                centered
                skillTag={skillTag}
                onClearSkill={onClearSkill}
              />
            </div>

            {/* Contextual suggestions */}
            {activeSkill ? (
              <div className="max-w-xl w-full">
                <div className="grid grid-cols-2 gap-1.5">
                  {(suggestedPrompts[(activeSkill || 'plan') as Capability] || suggestedPrompts.plan).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      className="px-3 py-2.5 bg-white border border-slate-200/80 rounded-lg text-left text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : hasHistory ? (
              <div className="max-w-xl w-full">
                <div className="bg-white border border-slate-200/80 rounded-lg px-4 py-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span className="text-slate-600">
                      {activeCampaignCount > 0 ? `${activeCampaignCount} 项活动进行中` : '暂无进行中的活动'}
                    </span>
                  </div>
                  {activeCampaignCount > 0 && (
                    <>
                      <span className="text-slate-200">|</span>
                      <span className="text-slate-500">左侧可查看</span>
                    </>
                  )}
                  <span className="text-slate-200">|</span>
                  <button onClick={() => {}} className="text-slate-600 hover:text-slate-800 font-medium transition-colors">
                    新建活动
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-xl w-full">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    '帮我制定一份Q4金融产品营销方案',
                    '圈选高净值目标人群并估算量级',
                    '写一段AI外呼话术脚本',
                    '查询本月投放的ROI数据',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      className="px-3 py-2.5 bg-white border border-slate-200/80 rounded-lg text-left text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Conversation messages */
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">
            {/* Campaign progress stepper */}
            {campaign && (
              <div className="mb-2">
                <CampaignProgress campaign={campaign} />
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className="group">
                <MessageBubble
                  message={msg}
                  onAction={handleAction}
                  onSendMessage={handleSend}
                  isStreaming={msg.id === streamingMsgId}
                />
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 message-enter">
                <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 text-[11px] font-semibold flex-shrink-0 mt-0.5">
                  AI
                </div>
                <div className="flex flex-col">
                  <div className="text-[11px] text-slate-400 mb-1 px-0.5">AI 助手 · 正在思考</div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-slate-200/80">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 typing-dot"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 typing-dot"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 typing-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Input — always at bottom when conversation exists */}
      {!isEmpty && (
        <ChatInput onSend={handleSend} disabled={isTyping} skillTag={skillTag} onClearSkill={onClearSkill} />
      )}
    </div>
  );
}
