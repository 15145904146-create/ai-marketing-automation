import { useState, useCallback } from 'react';
import type { Message, ActionType } from '../../types';
import ActionBar from './ActionBar';
import SmartRenderer from './SmartRenderer';

interface MessageBubbleProps {
  message: Message;
  onAction?: (messageId: string, action: ActionType) => void;
  onSendMessage?: (text: string) => void;
  isStreaming?: boolean;
  hideActions?: boolean;
}

export default function MessageBubble({ message, onAction, onSendMessage, isStreaming, hideActions }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [hasPendingFields, setHasPendingFields] = useState(false);

  const handlePendingChange = useCallback((pending: boolean) => {
    setHasPendingFields(pending);
  }, []);

  const showActionBar = !isUser && message.actionType != null && !isStreaming && !hideActions && !hasPendingFields;

  return (
    <div className={`flex gap-3 message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold mt-0.5
        ${isUser
          ? 'bg-slate-800 text-white'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
        }`}
      >
        {isUser ? 'Y' : 'AI'}
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Name + time */}
        <div className={`text-[11px] text-slate-400 mb-1 px-0.5 ${isUser ? 'text-right' : ''}`}>
          {isUser ? '运营团队' : 'AI 助手'} · {message.timestamp}
        </div>

        {/* Bubble */}
        {isUser ? (
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-md text-sm leading-relaxed bg-slate-800 text-white">
            {message.content}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl rounded-tl-md text-sm bg-white border border-slate-200/80 min-w-[280px]">
            <SmartRenderer
              content={message.content}
              isStreaming={isStreaming}
              onSendMessage={onSendMessage}
              onPendingChange={handlePendingChange}
            />
          </div>
        )}

        {/* Action buttons (hidden when pending fields exist) */}
        {showActionBar && onAction && (
          <ActionBar
            actionType={message.actionType!}
            messageId={message.id}
            onAction={onAction}
          />
        )}

        {/* Legacy support for deprecated boolean actionable */}
        {!isUser && !showActionBar && message.actionable && !hasPendingFields && !hideActions && onAction && (
          <ActionBar
            actionType="confirm"
            messageId={message.id}
            onAction={onAction}
          />
        )}

        {/* Message footer actions (copy, like, etc.) - only for completed AI messages */}
        {!isUser && !isStreaming && message.content && (
          <div className="flex items-center gap-2 mt-1.5 px-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-slate-300 hover:text-slate-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button className="text-slate-300 hover:text-slate-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
            </button>
            <button className="text-slate-300 hover:text-slate-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
