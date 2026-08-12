import { HttpErrorResponse } from '@angular/common/http';

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';

import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Router } from '@angular/router';

import { CheckboxModule } from 'primeng/checkbox';

import { DialogModule } from 'primeng/dialog';

import { InputTextModule } from 'primeng/inputtext';

import { MessageModule } from 'primeng/message';

import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { CartStore } from '../../../core/api/cart/cart.store';

import { AuthApiService } from '../../../core/auth/auth-api.service';

import { ApiErrorResponse, AuthSessionResponse, AuthUser } from '../../../core/auth/auth.models';

import { AuthStore } from '../../../core/auth/auth.store';

import {
  FirebaseAuthService,
  GoogleFirebaseProfile,
} from '../../../core/auth/firebase-auth.service';

import { ROLE_IDS } from '../../../core/auth/roles';

/* =========================================================
   TIPOS
   ========================================================= */

type AuthView = 'login' | 'register' | 'google-profile';

type RegisterFieldName =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'password'
  | 'passwordConfirmation';

type GoogleProfileFieldName = 'firstName' | 'lastName' | 'phone';

/* =========================================================
   COMPONENTE
   ========================================================= */

@Component({
  selector: 'app-google-login-dialog',

  standalone: true,

  imports: [
    ReactiveFormsModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
  ],

  templateUrl: './google-login-dialog.html',

  styleUrl: './google-login-dialog.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleLoginDialogComponent {
  /* =======================================================
     DEPENDENCIAS
     ======================================================= */

  private readonly firebase = inject(FirebaseAuthService);

  private readonly api = inject(AuthApiService);

  private readonly auth = inject(AuthStore);

  private readonly cart = inject(CartStore);

  private readonly router = inject(Router);

  private readonly cdr = inject(ChangeDetectorRef);

  /* =======================================================
     ESTADO DEL MODAL
     ======================================================= */

  visible = false;

  loading = false;

  view: AuthView = 'login';

  errorMessage: string | null = null;

  /*
   * Cada campo de contraseña tiene su propio estado.
   * Esto evita que mostrar una contraseña revele
   * automáticamente otra contraseña del formulario.
   */
  showLoginPassword = false;

  showRegisterPassword = false;

  showRegisterPasswordConfirmation = false;

  private pendingGoogleProfile: GoogleFirebaseProfile | null = null;

  /* =======================================================
     FORMULARIO LOGIN
     ======================================================= */

  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,

      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),

    password: new FormControl('', {
      nonNullable: true,

      validators: [Validators.required],
    }),
  });

  /* =======================================================
     FORMULARIO REGISTRO
     ======================================================= */

  readonly registerForm = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,

        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      }),

      lastName: new FormControl('', {
        nonNullable: true,

        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      }),

      phone: new FormControl('', {
        nonNullable: true,

        validators: [
          Validators.required,

          /*
           * El usuario ingresa únicamente:
           *
           * 991234567
           *
           * El +593 se muestra visualmente
           * y se añade antes de enviar al backend.
           */
          Validators.pattern(/^9\d{8}$/),
        ],
      }),

      email: new FormControl('', {
        nonNullable: true,

        validators: [Validators.required, Validators.email, Validators.maxLength(255)],
      }),

      password: new FormControl('', {
        nonNullable: true,

        validators: [
          Validators.required,

          Validators.minLength(8),

          /*
           * La contraseña debe incluir:
           *
           * - una letra minúscula;
           * - una letra mayúscula;
           * - un número.
           */
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      }),

      passwordConfirmation: new FormControl('', {
        nonNullable: true,

        validators: [Validators.required],
      }),

      acceptTerms: new FormControl(false, {
        nonNullable: true,

        validators: [Validators.requiredTrue],
      }),
    },
    {
      validators: [this.passwordsMatchValidator],
    },
  );

  /* =======================================================
     FORMULARIO PERFIL GOOGLE
     ======================================================= */

  readonly googleProfileForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,

      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),

    lastName: new FormControl('', {
      nonNullable: true,

      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),

    phone: new FormControl('', {
      nonNullable: true,

      validators: [Validators.required, Validators.pattern(/^9\d{8}$/)],
    }),
  });

  /* =======================================================
     INFORMACIÓN COMPUTADA
     ======================================================= */

  get dialogTitle(): string {
    if (this.view === 'register') {
      return 'Crear una cuenta';
    }

    if (this.view === 'google-profile') {
      return 'Completa tu cuenta';
    }

    return 'Iniciar sesión';
  }

  get dialogDescription(): string {
    if (this.view === 'register') {
      return 'Regístrate para guardar tus pedidos ' + 'y realizar compras más rápido.';
    }

    if (this.view === 'google-profile') {
      return 'Ya obtuvimos tu correo desde Google. ' + 'Solo necesitamos tus datos de contacto.';
    }

    return 'Accede para gestionar tus pedidos ' + 'y continuar con tu compra.';
  }

  get googleEmail(): string {
    return this.pendingGoogleProfile?.email ?? '';
  }

  /* =======================================================
     ABRIR / CERRAR
     ======================================================= */

  open(): void {
    if (this.loading) {
      return;
    }

    this.resetState();

    this.visible = true;

    this.cdr.markForCheck();
  }

  close(): void {
    if (this.loading) {
      return;
    }

    this.visible = false;

    this.resetState();

    this.cdr.markForCheck();
  }

  onVisibleChange(visible: boolean): void {
    if (!visible && this.loading) {
      return;
    }

    this.visible = visible;

    if (!visible) {
      this.resetState();
    }

    this.cdr.markForCheck();
  }

  /* =======================================================
     CAMBIO DE VISTA
     ======================================================= */

  showLogin(): void {
    if (this.loading) {
      return;
    }

    this.view = 'login';

    this.errorMessage = null;

    this.clearServerErrors(this.loginForm);

    this.cdr.markForCheck();
  }

  showRegister(): void {
    if (this.loading) {
      return;
    }

    this.view = 'register';

    this.errorMessage = null;

    this.clearServerErrors(this.registerForm);

    this.cdr.markForCheck();
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  login(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = null;

    this.clearServerErrors(this.loginForm);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      this.cdr.markForCheck();

      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.loading = true;

    this.cdr.markForCheck();

    this.api
      .login({
        email: email.trim().toLowerCase(),

        password,
      })
      .subscribe({
        next: (response) => {
          this.processSuccessfulLogin(response, null);
        },

        error: (error) => {
          this.processAuthError(error, this.loginForm);
        },
      });
  }

  /* =======================================================
     REGISTRO
     ======================================================= */

  register(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = null;

    this.clearServerErrors(this.registerForm);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();

      /*
       * El validador passwordMismatch pertenece
       * al FormGroup y no directamente al control.
       * Marcamos confirmación para mostrar correctamente
       * el error en la interfaz.
       */
      if (this.registerForm.errors?.['passwordMismatch']) {
        this.registerForm.controls.passwordConfirmation.markAsTouched();
      }

      this.cdr.markForCheck();

      return;
    }

    const value = this.registerForm.getRawValue();

    this.loading = true;

    this.cdr.markForCheck();

    /*
     * El frontend utiliza camelCase.
     *
     * Aquí convertimos explícitamente al contrato
     * snake_case esperado por Laravel.
     */
    this.api
      .register({
        first_name: value.firstName.trim(),

        last_name: value.lastName.trim(),

        phone: this.toEcuadorPhone(value.phone),

        email: value.email.trim().toLowerCase(),

        password: value.password,

        password_confirmation: value.passwordConfirmation,
      })
      .subscribe({
        next: (response) => {
          this.processSuccessfulLogin(response, null);
        },

        error: (error) => {
          this.processRegisterError(error);
        },
      });
  }

  /* =======================================================
     GOOGLE
     ======================================================= */

  async continueWithGoogle(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.errorMessage = null;

    this.loading = true;

    this.cdr.markForCheck();

    try {
      const profile = await this.firebase.signInWithGoogle();

      this.pendingGoogleProfile = profile;

      const { firstName, lastName } = this.splitDisplayName(profile.displayName ?? '');

      this.googleProfileForm.patchValue({
        firstName,
        lastName,
      });

      this.api.loginWithGoogle(profile.idToken).subscribe({
        next: (response) => {
          this.processSuccessfulLogin(response, profile.photoURL);
        },

        error: (error) => {
          this.processGoogleError(error);
        },
      });
    } catch (error: unknown) {
      this.loading = false;

      this.errorMessage = this.resolveFirebaseError(error);

      this.cdr.markForCheck();
    }
  }

  /* =======================================================
     COMPLETAR PERFIL GOOGLE
     ======================================================= */

  completeGoogleProfile(): void {
    if (this.loading) {
      return;
    }

    const profile = this.pendingGoogleProfile;

    if (!profile) {
      this.errorMessage = 'La sesión de Google expiró. Vuelve a iniciar el proceso.';

      this.view = 'login';

      this.cdr.markForCheck();

      return;
    }

    this.errorMessage = null;

    this.clearServerErrors(this.googleProfileForm);

    if (this.googleProfileForm.invalid) {
      this.googleProfileForm.markAllAsTouched();

      this.cdr.markForCheck();

      return;
    }

    const value = this.googleProfileForm.getRawValue();

    this.loading = true;

    this.cdr.markForCheck();

    this.api
      .loginWithGoogle(profile.idToken, {
        phone: this.toEcuadorPhone(value.phone),

        firstName: value.firstName.trim(),

        lastName: value.lastName.trim(),
      })
      .subscribe({
        next: (response) => {
          this.processSuccessfulLogin(response, profile.photoURL);
        },

        error: (error) => {
          this.processGoogleProfileError(error);
        },
      });
  }

  backFromGoogleProfile(): void {
    if (this.loading) {
      return;
    }

    this.pendingGoogleProfile = null;

    this.googleProfileForm.reset({
      firstName: '',

      lastName: '',

      phone: '',
    });

    this.view = 'login';

    this.errorMessage = null;

    this.cdr.markForCheck();
  }

  /* =======================================================
     ERRORES DEL FORMULARIO
     ======================================================= */

  registerFieldError(field: RegisterFieldName): string | null {
    const control = this.registerForm.get(field);

    if (!control || !control.touched) {
      return null;
    }

    /*
     * passwordConfirmation tiene además un error
     * perteneciente al formulario completo.
     */
    if (field === 'passwordConfirmation' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden.';
    }

    return this.resolveControlError(control, field);
  }

  googleProfileFieldError(field: GoogleProfileFieldName): string | null {
    const control = this.googleProfileForm.get(field);

    if (!control || !control.touched) {
      return null;
    }

    return this.resolveControlError(control, field);
  }

  /* =======================================================
     ERROR GOOGLE
     ======================================================= */

  private processGoogleError(error: HttpErrorResponse): void {
    const apiError = (error.error ?? {}) as ApiErrorResponse;

    const completionCodes = ['PROFILE_COMPLETION_REQUIRED', 'PHONE_REQUIRED'];

    if (error.status === 422 && completionCodes.includes(apiError.code ?? '')) {
      this.loading = false;

      this.view = 'google-profile';

      this.errorMessage = null;

      this.cdr.markForCheck();

      return;
    }

    this.processAuthError(error, this.googleProfileForm);
  }

  /* =======================================================
     LOGIN EXITOSO
     ======================================================= */

  private processSuccessfulLogin(
    response: AuthSessionResponse,

    photoUrl: string | null,
  ): void {
    const userWithPhoto: AuthUser = {
      ...response.data.user,

      photo_url: photoUrl ?? response.data.user.photo_url ?? null,
    };

    this.auth.setSession(response.data.token, userWithPhoto);

    this.cart.replaceCart(response.data.cart);

    this.loading = false;

    this.visible = false;

    this.resetState();

    this.cdr.markForCheck();

    this.redirectByRole(userWithPhoto.role_id);
  }

  /* =======================================================
     ERRORES DE AUTENTICACIÓN
     ======================================================= */

  private processAuthError(
    error: HttpErrorResponse,

    form: FormGroup,
  ): void {
    this.loading = false;

    const apiError = (error.error ?? {}) as ApiErrorResponse;

    this.applyServerErrors(form, apiError.errors);

    this.errorMessage = this.resolveApiError(error, apiError);

    this.cdr.markForCheck();
  }

  /*
   * Laravel devuelve nombres snake_case.
   *
   * El formulario visual trabaja con camelCase,
   * por lo que debemos transformar los nombres
   * de los errores antes de asignarlos.
   */
  private processRegisterError(error: HttpErrorResponse): void {
    this.loading = false;

    const apiError = (error.error ?? {}) as ApiErrorResponse;

    const mappedErrors: Record<string, string[]> = {};

    if (apiError.errors) {
      for (const [field, messages] of Object.entries(apiError.errors)) {
        mappedErrors[this.mapRegisterApiField(field)] = messages;
      }
    }

    this.applyServerErrors(this.registerForm, mappedErrors);

    this.errorMessage = this.resolveApiError(error, apiError);

    this.cdr.markForCheck();
  }

  private processGoogleProfileError(error: HttpErrorResponse): void {
    this.loading = false;

    const apiError = (error.error ?? {}) as ApiErrorResponse;

    const mappedErrors: Record<string, string[]> = {};

    if (apiError.errors) {
      for (const [field, messages] of Object.entries(apiError.errors)) {
        mappedErrors[this.mapGoogleApiField(field)] = messages;
      }
    }

    this.applyServerErrors(this.googleProfileForm, mappedErrors);

    this.errorMessage = this.resolveApiError(error, apiError);

    this.cdr.markForCheck();
  }

  /* =======================================================
     SERVER ERRORS
     ======================================================= */

  private applyServerErrors(
    form: FormGroup,

    errors?: Record<string, string[]>,
  ): void {
    if (!errors) {
      return;
    }

    for (const [field, messages] of Object.entries(errors)) {
      const control = form.get(field);

      const message = messages?.[0];

      if (!control || !message) {
        continue;
      }

      control.setErrors({
        ...(control.errors ?? {}),

        server: message,
      });

      control.markAsTouched();
    }
  }

  private clearServerErrors(form: FormGroup): void {
    Object.values(form.controls).forEach((control) => {
      if (!control.errors?.['server']) {
        return;
      }

      const remaining = {
        ...control.errors,
      };

      delete remaining['server'];

      control.setErrors(Object.keys(remaining).length ? remaining : null);
    });
  }

  /* =======================================================
     ERRORES DE CONTROLES
     ======================================================= */

  private resolveControlError(
    control: AbstractControl,

    field: string,
  ): string | null {
    if (!control.errors) {
      return null;
    }

    const server = control.errors['server'];

    if (typeof server === 'string') {
      return server;
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['email']) {
      return 'Ingresa un correo electrónico válido.';
    }

    if (control.errors['requiredTrue']) {
      return 'Debes aceptar el tratamiento de tus datos.';
    }

    if (control.errors['minlength']) {
      if (field === 'password') {
        return 'La contraseña debe contener al menos 8 caracteres.';
      }

      return 'Debe contener al menos 2 caracteres.';
    }

    if (control.errors['maxlength']) {
      return 'El valor ingresado es demasiado largo.';
    }

    if (control.errors['pattern']) {
      if (field === 'phone') {
        return 'Ingresa los 9 dígitos después de +593.';
      }

      if (field === 'password') {
        return 'Usa al menos 8 caracteres, una mayúscula, ' + 'una minúscula y un número.';
      }
    }

    return 'Revisa el valor ingresado.';
  }

  /* =======================================================
     MAPEO BACKEND → FRONTEND
     ======================================================= */

  private mapRegisterApiField(field: string): string {
    const map: Record<string, string> = {
      first_name: 'firstName',

      last_name: 'lastName',

      phone: 'phone',

      email: 'email',

      password: 'password',

      password_confirmation: 'passwordConfirmation',
    };

    return map[field] ?? field;
  }

  private mapGoogleApiField(field: string): string {
    const map: Record<string, string> = {
      first_name: 'firstName',

      firstName: 'firstName',

      last_name: 'lastName',

      lastName: 'lastName',

      phone: 'phone',
    };

    return map[field] ?? field;
  }

  /* =======================================================
     REDIRECCIÓN POR ROL
     ======================================================= */

  private redirectByRole(roleId: number): void {
    if (roleId === ROLE_IDS.admin) {
      void this.router.navigateByUrl('/admin/analytics');

      return;
    }

    if (roleId === ROLE_IDS.operator) {
      void this.router.navigateByUrl('/operator/orders');

      return;
    }

    void this.router.navigateByUrl('/');
  }

  /* =======================================================
     MENSAJES DE API
     ======================================================= */

  private resolveApiError(
    error: HttpErrorResponse,

    apiError: ApiErrorResponse,
  ): string {
    if (apiError.message) {
      return apiError.message;
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el servidor.';
    }

    if (error.status === 401) {
      return 'El correo o la contraseña no son correctos.';
    }

    if (error.status === 422) {
      return 'Revisa los datos ingresados e inténtalo nuevamente.';
    }

    if (error.status === 429) {
      return 'Realizaste demasiados intentos. Espera un momento.';
    }

    if (error.status >= 500) {
      return 'El servidor no pudo completar la solicitud.';
    }

    return 'No fue posible completar la autenticación.';
  }

  /* =======================================================
     FIREBASE ERRORS
     ======================================================= */

  private resolveFirebaseError(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('popup-closed') || message.includes('cancelled')) {
      return 'El acceso con Google fue cancelado.';
    }

    if (message.includes('popup-blocked')) {
      return (
        'El navegador bloqueó la ventana de Google. ' +
        'Habilita las ventanas emergentes e inténtalo nuevamente.'
      );
    }

    if (message.includes('network')) {
      return 'No fue posible conectar con Google. Revisa tu conexión.';
    }

    return 'No se pudo iniciar sesión con Google.';
  }

  /* =======================================================
     NOMBRE DE GOOGLE
     ======================================================= */

  private splitDisplayName(fullName: string): {
    firstName: string;

    lastName: string;
  } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    return {
      firstName: parts.shift() ?? '',

      lastName: parts.join(' '),
    };
  }

  /* =======================================================
     TELÉFONO ECUADOR
     ======================================================= */

  private toEcuadorPhone(localPhone: string): string {
    const digits = localPhone.replace(/\D/g, '').replace(/^0/, '');

    return `+593${digits}`;
  }

  /* =======================================================
     VALIDACIÓN CONTRASEÑAS
     ======================================================= */

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;

    const confirmation = control.get('passwordConfirmation')?.value;

    if (!password || !confirmation) {
      return null;
    }

    return password !== confirmation
      ? {
          passwordMismatch: true,
        }
      : null;
  }

  /* =======================================================
     RESET
     ======================================================= */

  private resetState(): void {
    this.loading = false;

    this.view = 'login';

    this.errorMessage = null;

    this.showLoginPassword = false;

    this.showRegisterPassword = false;

    this.showRegisterPasswordConfirmation = false;

    this.pendingGoogleProfile = null;

    this.loginForm.reset({
      email: '',

      password: '',
    });

    this.registerForm.reset({
      firstName: '',

      lastName: '',

      phone: '',

      email: '',

      password: '',

      passwordConfirmation: '',

      acceptTerms: false,
    });

    this.googleProfileForm.reset({
      firstName: '',

      lastName: '',

      phone: '',
    });
  }
}
