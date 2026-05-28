import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  apiFetch,
  apiUrl,
} from '@/lib/api';
import { dashboardRouteForRole, decodeJwt, type JwtPayload } from '@/lib/auth';

type AuthContextValue = {
  user: JwtPayload | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearSessionForLogin: () => void;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = getAccessToken();
    if (!t) {
      setUser(null);
      setReady(true);
      return;
    }
    const payload = decodeJwt(t);
    setUser(payload);
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || 'Invalid credentials',
      );
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    setTokens(data.accessToken, data.refreshToken);
    const decoded = decodeJwt(data.accessToken);
    setUser(decoded);
    navigate(dashboardRouteForRole(decoded?.role ?? ''));
  }, [navigate]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: refresh }),
        });
      } catch {
        /* ignore */
      }
    }
    clearTokens();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const clearSessionForLogin = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, clearSessionForLogin, ready }),
    [user, login, logout, clearSessionForLogin, ready],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
