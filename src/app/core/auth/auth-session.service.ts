import { Injectable } from '@angular/core';
import { SafeStorageService } from '../state/safe-storage.service';
import { AuthUser } from './auth.models';

const TOKEN_KEY = 'cheof_auth_token';
const USER_KEY = 'cheof_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  constructor(private readonly storage: SafeStorageService) {}

  save(token: string, user: AuthUser): void {
    if (!token || !user) return;
    this.storage.setItem(TOKEN_KEY, token);
    this.storage.setItem(USER_KEY, JSON.stringify(user));
  }

  read(): { token: string; user: AuthUser } | null {
    const token = this.storage.getItem(TOKEN_KEY);
    const rawUser = this.storage.getItem(USER_KEY);
    if (!token || !rawUser) return null;

    try {
      const user = JSON.parse(rawUser) as AuthUser;
      return { token, user };
    } catch {
      return null;
    }
  }

  clear(): void {
    this.storage.removeItem(TOKEN_KEY);
    this.storage.removeItem(USER_KEY);
  }
}
