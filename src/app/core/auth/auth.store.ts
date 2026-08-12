import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { AuthSessionService } from './auth-session.service';
import { AuthUser } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);

  private readonly _initialized = signal(false);
  private readonly _initializing = signal(false);
  private readonly _loggingOut = signal(false);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();

  readonly initialized = this._initialized.asReadonly();
  readonly initializing = this._initializing.asReadonly();
  readonly loggingOut = this._loggingOut.asReadonly();

  readonly isAuthenticated = computed(() => {
    return this._initialized() && this._token() !== null && this._user() !== null;
  });

  readonly displayName = computed(() => {
    const user = this._user();

    if (!user) {
      return '';
    }

    return `${user.first_name} ${user.last_name}`.trim();
  });

  readonly photoUrl = computed(() => this._user()?.photo_url ?? null);

  constructor() {
    this.restoreLocalSession();
  }

  /**
   * Se ejecuta antes de iniciar la aplicación.
   *
   * Si existe una sesión guardada, Laravel confirma que el token
   * Sanctum continúa siendo válido.
   */
  async initialize(): Promise<void> {
    if (this._initialized() || this._initializing()) {
      return;
    }

    this._initializing.set(true);

    const token = this._token();

    if (!token) {
      this._initialized.set(true);
      this._initializing.set(false);
      return;
    }

    try {
      await firstValueFrom(
        this.api.me().pipe(
          map((response) => {
            const currentUser = this._user();

            /*
             * La fotografía proviene de Firebase y Laravel actualmente
             * no la devuelve. La conservamos al refrescar la sesión.
             */
            const verifiedUser: AuthUser = {
              ...response.data,
              photo_url: currentUser?.photo_url ?? response.data.photo_url ?? null,
            };

            this._user.set(verifiedUser);
            this.session.save(token, verifiedUser);

            return verifiedUser;
          }),
          catchError(() => {
            this.clearLocalSession();
            return of(null);
          }),
        ),
      );
    } finally {
      this._initialized.set(true);
      this._initializing.set(false);
    }
  }

  setSession(token: string, user: AuthUser): void {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      this.clearLocalSession();
      return;
    }

    this._token.set(normalizedToken);
    this._user.set(user);
    this._initialized.set(true);

    this.session.save(normalizedToken, user);
  }

  updateUser(user: AuthUser): void {
    const token = this._token();

    if (!token) {
      return;
    }

    this._user.set(user);
    this.session.save(token, user);
  }

  async logout(): Promise<void> {
    if (this._loggingOut()) {
      return;
    }

    this._loggingOut.set(true);

    try {
      if (this._token()) {
        await firstValueFrom(
          this.api.logout().pipe(
            catchError(() => {
              /*
               * Aunque Laravel no esté disponible, limpiamos la sesión
               * local para no dejar al usuario bloqueado.
               */
              return of(null);
            }),
          ),
        );
      }
    } finally {
      this.clearLocalSession();
      this._loggingOut.set(false);
    }
  }

  clearSession(): void {
    this.clearLocalSession();
  }

  private restoreLocalSession(): void {
    const savedSession = this.session.read();

    if (!savedSession) {
      return;
    }

    this._token.set(savedSession.token);
    this._user.set(savedSession.user);
  }

  private clearLocalSession(): void {
    this._token.set(null);
    this._user.set(null);
    this.session.clear();
  }
}
