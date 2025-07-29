// Session management utilities for persistent authentication

export interface UserSession {
  user_id: string;
  name: string;
  email: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
  session_id?: string; // For internal use with existing APIs
}

export class SessionManager {
  private static readonly SESSION_KEY = 'heor_session_user';

  static setSession(userData: UserSession): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(userData));
  }

  static getSession(): UserSession | null {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  static isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  static updateSession(updates: Partial<UserSession>): void {
    const current = this.getSession();
    if (current) {
      this.setSession({ ...current, ...updates });
    }
  }
}

// Hook for React components to use session
export function useSession() {
  const session = SessionManager.getSession();
  
  return {
    session,
    isAuthenticated: SessionManager.isAuthenticated(),
    setSession: SessionManager.setSession,
    clearSession: SessionManager.clearSession,
    updateSession: SessionManager.updateSession
  };
}