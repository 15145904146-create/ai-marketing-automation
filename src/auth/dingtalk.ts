// ===== DingTalk Auth Integration =====
// Detects DingTalk environment and pulls user login state.
// Falls back to manual login when running outside DingTalk.

import type { AuthUser } from './types';

// DingTalk JSAPI type declarations (subset)
declare global {
  interface Window {
    dd?: {
      ready: (callback: () => void) => void;
      error: (callback: (err: { errorCode: number; errorMessage: string }) => void) => void;
      runtime?: {
        permission?: {
          requestAuthCode: (params: { corpId: string }, callback: (result: { code: string }) => void) => void;
        };
      };
      biz?: {
        user?: {
          get: (callback: (result: { userId: string; userName: string; avatar: string }) => void) => void;
        };
        contact?: {
          complexPicker: (params: unknown, callback: (result: unknown) => void) => void;
        };
      };
    };
  }
}

// ===== Environment Detection =====

/** Check if running inside DingTalk client */
export function isDingTalkEnv(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('dingtalk') || ua.includes('aliapp');
}

/** Check if DingTalk JSAPI is available */
export function isDingTalkSDKAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.dd !== 'undefined';
}

// ===== DingTalk Auth =====

/**
 * Attempt to pull user login state from DingTalk.
 * Returns null if not in DingTalk environment.
 */
export async function pullDingTalkLoginState(): Promise<AuthUser | null> {
  if (!isDingTalkEnv() || !isDingTalkSDKAvailable()) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      window.dd!.ready(() => {
        // Try to get user info via biz API
        window.dd!.biz?.user?.get((result) => {
          if (result?.userId) {
            resolve({
              userId: result.userId,
              name: result.userName || extractNameFromId(result.userId),
              avatar: result.avatar || getInitial(result.userName || result.userId),
              orgName: '',
              isAuthenticated: true,
              authMethod: 'dingtalk',
            });
          } else {
            resolve(null);
          }
        });
      });

      window.dd!.error(() => {
        resolve(null);
      });

      // Timeout: if neither ready nor error fires within 3s, fall back
      setTimeout(() => resolve(null), 3000);
    } catch {
      resolve(null);
    }
  });
}

// ===== Manual Login (fallback for browser) =====

let cachedManualUser: AuthUser | null = null;

export function getCachedManualUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('dt_mock_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.name && parsed?.userId) {
        cachedManualUser = { ...parsed, isAuthenticated: true, authMethod: 'manual' as const };
        return cachedManualUser;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export function setManualLogin(name: string, orgName?: string): AuthUser {
  const userId = `user_${Date.now()}`;
  const user: AuthUser = {
    userId,
    name,
    avatar: getInitial(name),
    orgName: orgName || '',
    isAuthenticated: true,
    authMethod: 'manual',
  };
  try {
    localStorage.setItem('dt_mock_user', JSON.stringify(user));
  } catch { /* ignore */ }
  cachedManualUser = user;
  return user;
}

export function clearManualLogin(): void {
  cachedManualUser = null;
  try {
    localStorage.removeItem('dt_mock_user');
  } catch { /* ignore */ }
}

// ===== Helpers =====

function extractNameFromId(userId: string): string {
  // Fallback: try to extract a readable name from userId
  return userId.length > 4 ? userId.slice(-4) : userId;
}

export function getInitial(name: string): string {
  if (!name) return '?';
  // Take first character; handle Chinese characters
  const first = name.trim().charAt(0);
  return first.toUpperCase();
}

/** Extract org short name from full org path */
export function extractOrgShortName(fullOrgPath: string): string {
  const parts = fullOrgPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || fullOrgPath;
}
