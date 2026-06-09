import SkillSelector from './SkillSelector';
import HistoryList from './HistoryList';
import type { Conversation, DeliveryRecord } from '../../types';
import { useAuth, getUserDisplayName, getUserAvatar, getUserStatus } from '../../auth/AuthContext';

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
}: SidebarProps) {
  const { user, logout, setShowLogin } = useAuth();

  const displayName = getUserDisplayName(user);
  const avatarChar = getUserAvatar(user);
  const status = getUserStatus(user);
  return (
    <aside className="fixed top-0 left-0 h-full w-[280px] glass-strong border-r border-white/40 flex flex-col z-20 overflow-hidden">
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

      {/* Skill selector */}
      <div className="flex-shrink-0">
        <SkillSelector activeSkill={activeSkill} onSkillSelect={onSkillSelect} />
      </div>

      {/* Divider */}
      <div className="border-t border-white/30" />

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
    </aside>
  );
}
