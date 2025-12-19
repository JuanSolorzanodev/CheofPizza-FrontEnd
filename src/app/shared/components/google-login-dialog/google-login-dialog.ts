import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { FirebaseAuthService, GoogleFirebaseProfile } from '../../../core/auth/firebase-auth.service';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { ApiErrorResponse, GoogleLoginResponse } from '../../../core/auth/auth.models';

@Component({
  selector: 'app-google-login-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './google-login-dialog.html',
  styleUrl: './google-login-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleLoginDialogComponent {
  private readonly firebase = inject(FirebaseAuthService);
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthStore);
  private readonly cdr = inject(ChangeDetectorRef);

  visible = false;
  loading = false;

  phoneRequired = false;
  private pendingIdToken: string | null = null;
  private pendingPhotoUrl: string | null = null; // ✅ para guardar foto en sesión

  readonly phone = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(30)],
  });

  errorMsg: string | null = null;

  open(): void {
    this.resetState();
    this.visible = true;
    this.cdr.markForCheck();
  }

  close(): void {
    this.visible = false;
    this.resetState();
    this.cdr.markForCheck();
  }

  async continueWithGoogle(): Promise<void> {
    this.errorMsg = null;
    this.loading = true;
    this.cdr.markForCheck();

    try {
      const profile: GoogleFirebaseProfile = await this.firebase.signInWithGoogle();
      this.pendingIdToken = profile.idToken;
      this.pendingPhotoUrl = profile.photoURL ?? null;

      this.api.loginWithGoogle(profile.idToken).subscribe({
        next: (res: GoogleLoginResponse) => {
          // ✅ “inyectamos” la foto para UI (sin tocar backend)
          const userWithPhoto = { ...res.user, photo_url: this.pendingPhotoUrl };
          this.auth.setSession(res.token, userWithPhoto);

          this.loading = false;
          this.close();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          const apiErr = (err.error ?? {}) as ApiErrorResponse;

          if (err.status === 422 && apiErr.code === 'PHONE_REQUIRED') {
            queueMicrotask(() => {
              this.phoneRequired = true;
              this.errorMsg = 'Para completar el registro, ingresa tu teléfono.';
              this.cdr.markForCheck();
            });
            return;
          }

          queueMicrotask(() => {
            this.errorMsg = apiErr.message || 'No se pudo iniciar sesión con Google.';
            this.cdr.markForCheck();
          });
        },
      });
    } catch {
      this.loading = false;
      queueMicrotask(() => {
        this.errorMsg = 'No se pudo abrir el popup de Google (cancelado o bloqueado).';
        this.cdr.markForCheck();
      });
    }
  }

  completeWithPhone(): void {
    this.errorMsg = null;

    const idToken = this.pendingIdToken;
    if (!idToken) {
      this.errorMsg = 'No hay token pendiente. Vuelve a intentar.';
      this.cdr.markForCheck();
      return;
    }

    if (this.phone.invalid) {
      this.phone.markAsTouched();
      this.errorMsg = 'Teléfono requerido.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    this.api.loginWithGoogle(idToken, this.phone.value.trim()).subscribe({
      next: (res: GoogleLoginResponse) => {
        const userWithPhoto = { ...res.user, photo_url: this.pendingPhotoUrl };
        this.auth.setSession(res.token, userWithPhoto);

        this.loading = false;
        this.close();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        const apiErr = (err.error ?? {}) as ApiErrorResponse;

        queueMicrotask(() => {
          this.errorMsg = apiErr.message || 'No se pudo completar el registro.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  backToGoogle(): void {
    queueMicrotask(() => {
      this.phoneRequired = false;
      this.phone.reset('');
      this.errorMsg = null;
      this.cdr.markForCheck();
    });
  }

  private resetState(): void {
    this.loading = false;
    this.phoneRequired = false;
    this.pendingIdToken = null;
    this.pendingPhotoUrl = null;
    this.phone.reset('');
    this.errorMsg = null;
  }
}
