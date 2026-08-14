import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AppUserData {
  id: string;
  email: string;
  name: string;
  userType: string;
  grupo: string;
  grupos: {
    id: string;
    name: string;
    urlAgendaEntrevistas?: string | null;
    /** Categoría desplegada; de ella sale el color en el selector. */
    categoria?: { id: string; nombre: string; color: string } | null;
    /**
     * ¿Rellenó el perfil de ESTE grupo? Solo para alumnos. Decide a dónde entra
     * al autenticarse; el estado en vivo lo lleva `perfilCompleto` de abajo, que
     * es el del grupo activo y lo refresca el menú.
     */
    perfilCompleto?: boolean;
  }[];
  /** Tema elegido: 'claro' | 'oscuro' | 'auto'. Le sigue entre dispositivos. */
  preferenciaTema?: string;
  attributes: Record<string, unknown>;
  lastLogin?: string;
  perfilCompleto?: boolean;
  /** true = la contraseña la puso el sistema; hay que exigirle una propia. */
  passwordAsignada?: boolean;
  /** Último grupo que tenía abierto; con qué grupo se le reabre el panel. */
  ultimoGrupoId?: string;
}

interface AuthContextType {
  user: AppUserData | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (sessionToken: string, user: AppUserData) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (patch: Partial<AppUserData>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api';
const TOKEN_KEY = 'session_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUserData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  );
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const login = useCallback((token: string, userData: AppUserData) => {
    localStorage.setItem(TOKEN_KEY, token);
    setSessionToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'x-session-token': token },
          credentials: 'include',
        });
      } catch {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setSessionToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AppUserData>) => {
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'x-session-token': token },
        credentials: 'include',
      });

      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        setSessionToken(null);
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setSessionToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionToken) {
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isAuthenticated: !!user && !!sessionToken,
        isLoading,
        login,
        logout,
        fetchMe,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
