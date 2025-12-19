import { Injectable, computed, signal } from '@angular/core';
import { AuthSessionService } from './auth-session.service';
import { AuthUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();

  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());

  readonly displayName = computed(() => {
    const u = this._user();
    if (!u) return '';
    return `${u.first_name} ${u.last_name}`.trim();
  });

  readonly photoUrl = computed(() => this._user()?.photo_url ?? null);

  constructor(private readonly session: AuthSessionService) {
    const saved = this.session.read();
    if (saved) {
      this._token.set(saved.token);
      this._user.set(saved.user);
    }
  }

  setSession(token: string, user: AuthUser): void {
    this._token.set(token);
    this._user.set(user);
    this.session.save(token, user);
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    this.session.clear();
  }
}
