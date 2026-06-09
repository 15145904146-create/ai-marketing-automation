import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AuthUser, AuthState } from './types';
import { pullDingTalkLoginState, getCachedManualUser, setManualLogin, clearManualLogin, isDingTalkEnv, getInitial } from './dingtalk';

interface AuthContextValue extends AuthState {
  login: (name: string, orgName?: string) => void;
  logout: () => void;
  showLogin: boolean;
  setShowLogin: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  const [showLogin, setShowLogin] = useState(false);

  // On mount: attempt DingTalk login, fall back to cached manual login
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Try DingTalk native login
      const dtUser = await pullDingTalkLoginState();
      if (!cancelled && dtUser) {
        setState({ user: dtUser, isLoading: false, error: null });
        return;
      }

      // 2. Try cached manual login
      const cachedUser = getCachedManualUser();
      if (!cancelled && cachedUser) {
        setState({ user: cachedUser, isLoading: false, error: null });
        return;
      }

      // 3. If in DingTalk but couldn't get user, show error
      if (!cancelled && isDingTalkEnv()) {
        setState({
          user: null,
          isLoading: false,
          error: '无法获取钉钉登录态，请检查权限',
        });
        return;
      }

      // 4. Not in DingTalk: prompt manual login
      if (!cancelled) {
        setState({ user: null, isLoading: false, error: null });
        setShowLogin(true);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback((name: string, orgName?: string) => {
    const user = setManualLogin(name, orgName);
    setState({ user, isLoading: false, error: null });
    setShowLogin(false);
  }, []);

  const logout = useCallback(() => {
    clearManualLogin();
    setState({ user: null, isLoading: false, error: null });
    setShowLogin(true);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, showLogin, setShowLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

// ===== Helper: generate avatar URL or initials =====
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return '未登录';
  return user.name;
}

export function getUserAvatar(user: AuthUser | null): string {
  if (!user) return '?';
  // If avatar is a URL (starts with http), use it
  if (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
    return user.avatar;
  }
  // Otherwise return the initial letter
  return user.avatar || getInitial(user.name);
}

export function getUserStatus(user: AuthUser | null): string {
  if (!user) return '离线';
  if (user.authMethod === 'dingtalk') return '在线';
  return '在线';
}
