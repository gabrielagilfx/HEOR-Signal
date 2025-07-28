interface UserSession {
  sessionId: string;
  email?: string;
  name?: string;
  isAuthenticated: boolean;
}

class SessionManager {
  private static instance: SessionManager;
  private session: UserSession | null = null;
  private listeners: ((session: UserSession | null) => void)[] = [];

  private constructor() {
    // Try to restore session from localStorage on initialization
    this.restoreSession();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private saveSession(session: UserSession): void {
    this.session = session;
    localStorage.setItem('heor_session', JSON.stringify(session));
    this.notifyListeners();
  }

  private restoreSession(): void {
    try {
      const savedSession = localStorage.getItem('heor_session');
      if (savedSession) {
        this.session = JSON.parse(savedSession);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.clearSession();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.session));
  }

  setSession(sessionId: string, email?: string, name?: string): void {
    const session: UserSession = {
      sessionId,
      email,
      name,
      isAuthenticated: true
    };
    this.saveSession(session);
  }

  getSession(): UserSession | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    return this.session?.isAuthenticated === true;
  }

  getSessionId(): string | null {
    return this.session?.sessionId || null;
  }

  clearSession(): void {
    this.session = null;
    localStorage.removeItem('heor_session');
    this.notifyListeners();
  }

  addListener(listener: (session: UserSession | null) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

export const sessionManager = SessionManager.getInstance();
export type { UserSession };