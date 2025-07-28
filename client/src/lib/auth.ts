import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  name: string;
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  name: string;
  exp: number;
  iat: number;
}

class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  private constructor() {
    this.loadTokens();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadTokens(): void {
    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (storedTokens) {
        const tokens: AuthTokens = JSON.parse(storedTokens);
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        this.user = this.decodeUserFromToken(tokens.access_token);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      this.clearTokens();
    }
  }

  private saveTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      this.user = this.decodeUserFromToken(tokens.access_token);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('auth_tokens');
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
  }

  private decodeUserFromToken(token: string): User | null {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        session_id: '', // Will be set from server response
        onboarding_completed: false,
        selected_categories: [],
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  public async register(email: string, password: string, name: string): Promise<User> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    this.saveTokens(data.tokens);
    this.user = { ...this.user, ...data.user };
    return this.user!;
  }

  public async login(email: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    this.saveTokens(data.tokens);
    this.user = { ...this.user, ...data.user };
    return this.user!;
  }

  public async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.clearTokens();
    }
  }

  public async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      this.saveTokens(data.tokens);
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      return null;
    }
  }

  public async getAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken || this.isTokenExpired(this.accessToken)) {
      const newToken = await this.refreshAccessToken();
      if (!newToken) {
        throw new Error('Authentication required');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  public isAuthenticated(): boolean {
    return this.accessToken !== null && !this.isTokenExpired(this.accessToken);
  }

  public getUser(): User | null {
    return this.user;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }
}

export const authService = AuthService.getInstance();