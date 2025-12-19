import { Injectable } from '@angular/core';
import { AuthUser } from './auth.models';

const TOKEN_KEY = 'cheof_auth_token';
const USER_KEY = 'cheof_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  save(token: string, user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  read(): { token: string; user: AuthUser } | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;

    try {
      const user = JSON.parse(rawUser) as AuthUser;
      return { token, user };
    } catch {
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
