import { useState, useRef } from 'react';
import SkillSelector from './SkillSelector';
import HistoryList from './HistoryList';
import type { Conversation, DeliveryRecord } from '../../types';
import { useAuth, getUserDisplayName, getUserAvatar, getUserStatus } from '../../auth/AuthContext';

// 侧栏宽度与技能区高度的拖拽限制
const MIN_WIDTH = 240;
const MAX_WIDTH = 520;
const MIN_SKILL_HEIGHT = 56;   // 拖到最小时仅可见一丝技能区
const MAX_SKILL_HEIGHT = 480;

interface SidebarProps {
  activeSkill: string | null;
  onSkillSelect: (skillId: string | null) => void;
  onNewChat: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  deliveryRecords: DeliveryRecord[];
  activeRecordId: string | null;
  onDeliveryRecordSelect: (id: string) => void;
  onCopyCampaign?: (title: string) => void;
  /** 侧栏宽度（px），由 App 控制以同步调整主内容 margin */
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
}

export default function Sidebar({
  activeSkill,
  onSkillSelect,
  onNewChat,
  conversations,
  activeConversationId,
  onConversationSelect,
  onConversationDelete,
  deliveryRecords,
  activeRecordId,
  onDeliveryRecordSelect,
  onCopyCampaign,
  sidebarWidth,
  onSidebarWidthChange,
}: SidebarProps) {
  const { user, logout, setShowLogin } = useAuth();

  // 技能区可见高度；null = 默认自然高度，拖动处理后转为具体数值
  const [skillMaxHeight, setSkillMaxHeight] = useState<number | null>(null);
  const skillSectionRef = useRef<HTMLDivElement>(null);
  const [draggingV, setDraggingV] = useState(false);
  const [draggingH, setDraggingH] = useState(false);

  // 右边缘拖拽：调整侧栏宽度
  const startWidthDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingH(true);
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (ev.clientX - startX)));
      onSidebarWidthChange(next);
    };
    const onUp = () => {
      setDraggingH(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 技能区与历史记录之间拖拽：向上拖可让历史覆盖一部分技能区
  const startHistoryDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingV(true);
    const startY = e.clientY;
    // 起点高度：如果从未拖动，读取当前实际高度
    const startH = skillMaxHeight ?? skillSectionRef.current?.getBoundingClientRect().height ?? 280;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(MIN_SKILL_HEIGHT, Math.min(MAX_SKILL_HEIGHT, startH + (ev.clientY - startY)));
      setSkillMaxHeight(next);
    };
    const onUp = () => {
      setDraggingV(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const displayName = getUserDisplayName(user);
  const avatarChar = getUserAvatar(user);
  const status = getUserStatus(user);
  return (
    <aside
      className="fixed top-0 left-0 h-full glass-strong border-r border-white/40 flex flex-col z-20 overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 h-14 border-b border-white/30 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </div>
          <span className="font-bold text-slate-800 text-base">金融运营助手</span>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 py-3 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-slate-500/25 hover:shadow-xl hover:shadow-slate-500/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新建对话
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-white/30" />

      {/* Skill selector — 可被历史记录上拉占用高度 */}
      <div
        ref={skillSectionRef}
        className="flex-shrink-0"
        style={
          skillMaxHeight != null
            ? { maxHeight: skillMaxHeight, overflowY: 'auto' }
            : undefined
        }
      >
        <SkillSelector activeSkill={activeSkill} onSkillSelect={onSkillSelect} />
      </div>

      {/* 横向拖拽手柄：在技能区与历史记录之间，向上拖让历史记录覆盖一部分技能 */}
      <div
        onMouseDown={startHistoryDrag}
        className={`group relative h-1.5 cursor-row-resize border-t border-white/30 flex-shrink-0 transition-colors ${
          draggingV ? 'bg-slate-300/60' : 'hover:bg-slate-200/50'
        }`}
        title="拖动调整历史记录区高度"
      >
        {/* 中间快捏 grip 提示 */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <div className={`h-0.5 w-8 rounded-full transition-colors ${
            draggingV ? 'bg-slate-500' : 'bg-slate-300/0 group-hover:bg-slate-400/60'
          }`} />
        </div>
      </div>

      {/* History list */}
      <HistoryList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={onConversationSelect}
        onDelete={onConversationDelete}
        deliveryRecords={deliveryRecords}
        activeRecordId={activeRecordId}
        onDeliveryRecordSelect={onDeliveryRecordSelect}
        onCopyCampaign={onCopyCampaign}
      />

      {/* Bottom: user info */}
      <div className="flex-shrink-0 border-t border-white/30 p-3">
        <div
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/40 transition-colors cursor-pointer group"
          onClick={() => user ? undefined : setShowLogin(true)}
          title={user ? '点击查看个人信息' : '点击登录'}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md flex-shrink-0
            ${user
              ? 'bg-gradient-to-br from-slate-600 to-slate-700'
              : 'bg-gradient-to-br from-slate-300 to-slate-400'
            }`}
          >
            {avatarChar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-700 truncate">
              {displayName}
            </div>
            <div className={`text-xs ${user ? 'text-slate-500' : 'text-slate-400'}`}>
              {user?.orgName ? `${user.orgName} · ` : ''}{status}
            </div>
          </div>
          {/* Logout / relogin button, shown on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              user ? logout() : setShowLogin(true);
            }}
            className="p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-white/60 transition-all opacity-0 group-hover:opacity-100"
            title={user ? '退出登录' : '登录'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {user
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* 右侧宽度拖拽手柄 */}
      <div
        onMouseDown={startWidthDrag}
        className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-30 transition-colors ${
          draggingH ? 'bg-slate-300/60' : 'hover:bg-slate-200/40'
        }`}
        title="拖动调整侧栏宽度"
      />
    </aside>
  );
}
