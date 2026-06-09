import { useState } from 'react';
import { useAuth } from './AuthContext';

interface LoginModalProps {
  isOpen: boolean;
}

export default function LoginModal({ isOpen }: LoginModalProps) {
  const { login, setShowLogin } = useAuth();
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    login(trimmedName, orgName.trim() || undefined);
  };

  const handleSkip = () => {
    // Skip with a default display name
    login('运营用户');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLogin(false)} />

      {/* Modal */}
      <div className="relative glass-strong rounded-2xl shadow-2xl border border-white/40 p-6 w-full max-w-sm animate-scale-in">
        {/* DingTalk icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5zm0-3h-9V9h9v1.5z" />
            </svg>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800 text-center mb-1">钉钉登录</h2>
        <p className="text-sm text-slate-500 text-center mb-5">
          输入你的钉钉用户名以继续
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              钉钉用户名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：张三"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white/70 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              所属团队（选填）
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="例如：增长运营组"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white/70 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all
              ${name.trim()
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
          >
            确认登录
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-white/50 transition-colors"
          >
            跳过，以默认身份进入
          </button>
        </form>
      </div>
    </div>
  );
}
