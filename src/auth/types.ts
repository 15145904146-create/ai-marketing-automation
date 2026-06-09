// ===== Auth Types =====

export interface AuthUser {
  userId: string;
  name: string;           // DingTalk display name
  avatar: string;         // Avatar URL or initial letter
  orgName: string;        // Organization / company name
  isAuthenticated: boolean;
  authMethod: 'dingtalk' | 'manual' | 'none';
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: AuthUser }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; user: Partial<AuthUser> };
