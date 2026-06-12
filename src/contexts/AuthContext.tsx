import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants';
import type { UserItem } from '../../types';
import { readJsonResponse } from '../utils/http';

// --- Types ---
interface AuthState {
  authToken: string | null;
  user: UserItem | null;
  requiresAuth: boolean | null;
  hasBootstrap: boolean;
  isCheckingAuth: boolean;
  authError: string | null;
}

type AuthAction =
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_USER'; payload: UserItem | null }
  | { type: 'SET_REQUIRES_AUTH'; payload: boolean }
  | { type: 'SET_BOOTSTRAP'; payload: boolean }
  | { type: 'SET_CHECKING'; payload: boolean }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  bootstrap: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

// --- Reducer ---
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_TOKEN':
      return { ...state, authToken: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_REQUIRES_AUTH':
      return { ...state, requiresAuth: action.payload };
    case 'SET_BOOTSTRAP':
      return { ...state, hasBootstrap: action.payload };
    case 'SET_CHECKING':
      return { ...state, isCheckingAuth: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload };
    case 'LOGOUT':
      return { ...state, authToken: null, user: null, authError: null };
    default:
      return state;
  }
}

// --- Context ---
const AuthContext = createContext<AuthContextValue | null>(null);

// --- Provider ---
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    authToken: null,
    user: null,
    requiresAuth: null,
    hasBootstrap: false,
    isCheckingAuth: true,
    authError: null,
  });

  const checkAuth = useCallback(async () => {
    dispatch({ type: 'SET_CHECKING', payload: true });
    try {
      const res = await fetch(`${API_ENDPOINTS.AUTH}/me`);
      const data = await readJsonResponse<{ requiresAuth?: boolean; user?: UserItem | null; hasBootstrap?: boolean }>(res);
      if (!data) {
        throw new Error(`Unexpected response from auth/me: ${res.status}`);
      }
      dispatch({ type: 'SET_REQUIRES_AUTH', payload: Boolean(data.requiresAuth) });
      dispatch({ type: 'SET_BOOTSTRAP', payload: Boolean(data.hasBootstrap) });
      if (data.user) {
        dispatch({ type: 'SET_USER', payload: data.user });
        dispatch({ type: 'SET_TOKEN', payload: 'session' });
      } else {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_TOKEN', payload: null });
      }
      dispatch({ type: 'SET_AUTH_ERROR', payload: null });
    } catch (e) {
      console.error('Check auth failed:', e);
      dispatch({ type: 'SET_REQUIRES_AUTH', payload: false });
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_AUTH_ERROR', payload: e instanceof Error ? e.message : String(e) });
    } finally {
      dispatch({ type: 'SET_CHECKING', payload: false });
    }
  }, []);

  const authenticate = useCallback(async (endpoint: string, username: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_AUTH_ERROR', payload: null });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s 超时

      const res = await fetch(`${API_ENDPOINTS.AUTH}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await readJsonResponse<Record<string, unknown>>(res);
        const errorMessage = [
          `${endpoint === 'bootstrap' ? 'POST /api/auth/bootstrap' : 'POST /api/auth/login'}`,
          `HTTP ${res.status}`,
          typeof errData?.error === 'string' ? errData.error : null,
          typeof errData?.details === 'string' ? errData.details : null,
          typeof errData?.requestId === 'string' ? `requestId=${errData.requestId}` : null,
        ].filter(Boolean).join(' | ');
        console.error('Authentication failed:', res.status, errData);
        dispatch({ type: 'SET_AUTH_ERROR', payload: errorMessage || `HTTP ${res.status}` });
        return false;
      }

      const data = await readJsonResponse<{ success?: boolean; user?: UserItem }>(res);
      if (!data) {
        console.error('Authentication failed: unexpected non-JSON response');
        dispatch({ type: 'SET_AUTH_ERROR', payload: 'Unexpected non-JSON response' });
        return false;
      }
      if (data.success && data.user) {
        dispatch({ type: 'SET_USER', payload: data.user });
        dispatch({ type: 'SET_TOKEN', payload: 'session' });
        dispatch({ type: 'SET_AUTH_ERROR', payload: null });
        return true;
      }

      console.error('Authentication response missing user:', data);
      dispatch({ type: 'SET_AUTH_ERROR', payload: 'Authentication response missing user' });
      return false;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.error('Authentication timeout');
        dispatch({ type: 'SET_AUTH_ERROR', payload: 'Authentication timeout' });
        return false;
      } else {
        console.error('Authentication error:', e);
        dispatch({ type: 'SET_AUTH_ERROR', payload: e instanceof Error ? e.message : String(e) });
        return false;
      }
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    return authenticate('login', username, password);
  }, [authenticate]);

  const bootstrap = useCallback(async (username: string, password: string): Promise<boolean> => {
    return authenticate('bootstrap', username, password);
  }, [authenticate]);

  const logout = useCallback(() => {
    fetch(`${API_ENDPOINTS.AUTH}/logout`, { method: 'POST' }).catch(() => undefined);
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ ...state, login, bootstrap, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Hook ---
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
