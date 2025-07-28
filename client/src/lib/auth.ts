import { sessionManager } from './session';

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  session_id: string;
}

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private user: User | null = null;

  private constructor() {
    this.loadToken();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadToken(): void {
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }

  private saveToken(token: string, user: User): void {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private clearToken(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionManager.clearSession();
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // For now, we'll use session_id as token since we haven't implemented JWT yet
        const user: User = {
          id: data.user_id || 'temp-id',
          email,
          name: data.name || '',
          session_id: data.session_id,
        };
        
        this.saveToken(data.session_id, user);
        sessionManager.setSession(data.session_id, email, data.name);
        
        return { success: true, user };
      } else {
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async register(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const user: User = {
          id: data.user_id || 'temp-id',
          email,
          name,
          session_id: data.session_id,
        };
        
        this.saveToken(data.session_id, user);
        sessionManager.setSession(data.session_id, email, name);
        
        return { success: true, user };
      } else {
        return { success: false, error: data.detail || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  logout(): void {
    this.clearToken();
    window.location.href = '/';
  }

  reset(): void {
    this.clearToken();
    // Don't redirect, just clear state
  }

  async refreshToken(): Promise<boolean> {
    // For now, we'll just check if the session is still valid
    // In a real implementation, this would refresh JWT tokens
    const session = sessionManager.getSession();
    if (session) {
      this.token = session.sessionId;
      return true;
    }
    return false;
  }

  async validateSession(): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      const response = await fetch(`/api/user/status/${this.token}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.valid === true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const authService = AuthService.getInstance();