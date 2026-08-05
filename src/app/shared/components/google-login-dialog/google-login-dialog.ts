import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';

import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  Router,
} from '@angular/router';

import {
  CheckboxModule,
} from 'primeng/checkbox';

import {
  DialogModule,
} from 'primeng/dialog';

import {
  InputTextModule,
} from 'primeng/inputtext';

import {
  MessageModule,
} from 'primeng/message';

import {
  ProgressSpinnerModule,
} from 'primeng/progressspinner';

import {
  CartStore,
} from '../../../core/api/cart/cart.store';

import {
  AuthApiService,
} from '../../../core/auth/auth-api.service';

import {
  ApiErrorResponse,
  AuthSessionResponse,
  AuthUser,
} from '../../../core/auth/auth.models';

import {
  AuthStore,
} from '../../../core/auth/auth.store';

import {
  FirebaseAuthService,
  GoogleFirebaseProfile,
} from '../../../core/auth/firebase-auth.service';

import {
  ROLE_IDS,
} from '../../../core/auth/roles';

type AuthView =
  | 'login'
  | 'register'
  | 'google-profile';

type FieldName =
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'email'
  | 'password'
  | 'password_confirmation';

@Component({
  selector:
    'app-google-login-dialog',

  standalone:
    true,

  imports: [
    ReactiveFormsModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
  ],

  templateUrl:
    './google-login-dialog.html',

  styleUrl:
    './google-login-dialog.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class GoogleLoginDialogComponent {
  private readonly firebase =
    inject(FirebaseAuthService);

  private readonly api =
    inject(AuthApiService);

  private readonly auth =
    inject(AuthStore);

  private readonly cart =
    inject(CartStore);

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);

  visible =
    false;

  loading =
    false;

  view:
    AuthView =
    'login';

  errorMsg:
    string | null =
    null;

  showPassword =
    false;

  showPasswordConfirmation =
    false;

  private pendingGoogleProfile:
    GoogleFirebaseProfile | null =
    null;

  readonly loginForm =
    new FormGroup({
      email:
        new FormControl(
          '',
          {
            nonNullable:
              true,

            validators: [
              Validators.required,
              Validators.email,
              Validators.maxLength(
                255,
              ),
            ],
          },
        ),

      password:
        new FormControl(
          '',
          {
            nonNullable:
              true,

            validators: [
              Validators.required,
            ],
          },
        ),
    });

  readonly registerForm =
    new FormGroup(
      {
        first_name:
          new FormControl(
            '',
            {
              nonNullable:
                true,

              validators: [
                Validators.required,
                Validators.minLength(
                  2,
                ),
                Validators.maxLength(
                  100,
                ),
              ],
            },
          ),

        last_name:
          new FormControl(
            '',
            {
              nonNullable:
                true,

              validators: [
                Validators.required,
                Validators.minLength(
                  2,
                ),
                Validators.maxLength(
                  100,
                ),
              ],
            },
          ),

        phone:
          new FormControl(
            '',
            {
              nonNullable:
                true,

              validators: [
                Validators.required,

                /*
                 * El prefijo +593 se presenta visualmente.
                 * El usuario solo ingresa los nueve dígitos móviles.
                 */
                Validators.pattern(
                  /^9\d{8}$/,
                ),
              ],
            },
          ),

        email:
          new FormControl(
            '',
            {
              nonNullable:
                true,

              validators: [
                Validators.required,
                Validators.email,
                Validators.maxLength(
                  255,
                ),
              ],
            },
          ),

        password:
          new FormControl(
            '',
            {
              nonNullable:
                true,

              validators: [
                Validators.required,
                Validators.minLength(
                  8,
                ),

                /*
                 * Debe contener:
                 * - una minúscula;
                 * - una mayúscula;
                 * - un número.
                 */
                Validators.pattern(
                  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                ),
              ],
            },
          ),

        password_confirmation:
          new FormControl(
            '',
            {
              nonNullable:
                true,

              validators: [
                Validators.required,
              ],
            },
          ),

        terms:
          new FormControl(
            false,
            {
              nonNullable:
                true,

              validators: [
                Validators.requiredTrue,
              ],
            },
          ),
      },
      {
        validators: [
          this.passwordsMatchValidator,
        ],
      },
    );

  readonly googleProfileForm =
    new FormGroup({
      first_name:
        new FormControl(
          '',
          {
            nonNullable:
              true,

            validators: [
              Validators.required,
              Validators.minLength(
                2,
              ),
              Validators.maxLength(
                100,
              ),
            ],
          },
        ),

      last_name:
        new FormControl(
          '',
          {
            nonNullable:
              true,

            validators: [
              Validators.required,
              Validators.minLength(
                2,
              ),
              Validators.maxLength(
                100,
              ),
            ],
          },
        ),

      phone:
        new FormControl(
          '',
          {
            nonNullable:
              true,

            validators: [
              Validators.required,
              Validators.pattern(
                /^9\d{8}$/,
              ),
            ],
          },
        ),
    });

  get dialogTitle(): string {
    if (
      this.view ===
      'register'
    ) {
      return 'Crear una cuenta';
    }

    if (
      this.view ===
      'google-profile'
    ) {
      return 'Completa tu cuenta';
    }

    return 'Iniciar sesión';
  }

  get dialogDescription(): string {
    if (
      this.view ===
      'register'
    ) {
      return (
        'Regístrate para guardar tus pedidos ' +
        'y realizar compras más rápido.'
      );
    }

    if (
      this.view ===
      'google-profile'
    ) {
      return (
        'Ya obtuvimos tu correo desde Google. ' +
        'Solo necesitamos tus datos de contacto.'
      );
    }

    return (
      'Accede para gestionar tus pedidos ' +
      'y continuar con tu compra.'
    );
  }

  get googleEmail(): string {
    return (
      this.pendingGoogleProfile
        ?.email ??
      ''
    );
  }

  open(): void {
    if (this.loading) {
      return;
    }

    this.resetState();

    this.visible =
      true;

    this.cdr.markForCheck();
  }

  close(): void {
    if (this.loading) {
      return;
    }

    this.visible =
      false;

    this.resetState();

    this.cdr.markForCheck();
  }

  onVisibleChange(
    visible: boolean,
  ): void {
    if (
      !visible &&
      this.loading
    ) {
      return;
    }

    this.visible =
      visible;

    if (!visible) {
      this.resetState();
    }

    this.cdr.markForCheck();
  }

  showLogin(): void {
    if (this.loading) {
      return;
    }

    this.view =
      'login';

    this.errorMsg =
      null;

    this.clearServerErrors(
      this.loginForm,
    );

    this.cdr.markForCheck();
  }

  showRegister(): void {
    if (this.loading) {
      return;
    }

    this.view =
      'register';

    this.errorMsg =
      null;

    this.clearServerErrors(
      this.registerForm,
    );

    this.cdr.markForCheck();
  }

  submitLogin(): void {
    if (this.loading) {
      return;
    }

    this.errorMsg =
      null;

    this.clearServerErrors(
      this.loginForm,
    );

    if (
      this.loginForm.invalid
    ) {
      this.loginForm
        .markAllAsTouched();

      this.cdr.markForCheck();

      return;
    }

    const {
      email,
      password,
    } =
      this.loginForm
        .getRawValue();

    this.loading =
      true;

    this.cdr.markForCheck();

    this.api
      .login({
        email:
          email
            .trim()
            .toLowerCase(),

        password,
      })
      .subscribe({
        next:
          response => {
            this.processSuccessfulLogin(
              response,
              null,
            );
          },

        error:
          error => {
            this.processAuthError(
              error,
              this.loginForm,
            );
          },
      });
  }

  submitRegister(): void {
    if (this.loading) {
      return;
    }

    this.errorMsg =
      null;

    this.clearServerErrors(
      this.registerForm,
    );

    if (
      this.registerForm.invalid
    ) {
      this.registerForm
        .markAllAsTouched();

      this.cdr.markForCheck();

      return;
    }

    const value =
      this.registerForm
        .getRawValue();

    this.loading =
      true;

    this.cdr.markForCheck();

    this.api
      .register({
        first_name:
          value.first_name
            .trim(),

        last_name:
          value.last_name
            .trim(),

        phone:
          this.toEcuadorPhone(
            value.phone,
          ),

        email:
          value.email
            .trim()
            .toLowerCase(),

        password:
          value.password,

        password_confirmation:
          value
            .password_confirmation,
      })
      .subscribe({
        next:
          response => {
            this.processSuccessfulLogin(
              response,
              null,
            );
          },

        error:
          error => {
            this.processAuthError(
              error,
              this.registerForm,
            );
          },
      });
  }

  async continueWithGoogle():
    Promise<void> {
    if (this.loading) {
      return;
    }

    this.errorMsg =
      null;

    this.loading =
      true;

    this.cdr.markForCheck();

    try {
      const profile =
        await this.firebase
          .signInWithGoogle();

      this.pendingGoogleProfile =
        profile;

      const {
        firstName,
        lastName,
      } =
        this.splitDisplayName(
          profile.displayName ??
          '',
        );

      this.googleProfileForm
        .patchValue({
          first_name:
            firstName,

          last_name:
            lastName,
        });

      this.api
        .loginWithGoogle(
          profile.idToken,
        )
        .subscribe({
          next:
            response => {
              this.processSuccessfulLogin(
                response,
                profile.photoURL,
              );
            },

          error:
            error => {
              this.processGoogleError(
                error,
              );
            },
        });
    } catch (
      error: unknown
    ) {
      this.loading =
        false;

      this.errorMsg =
        this.resolveFirebaseError(
          error,
        );

      this.cdr.markForCheck();
    }
  }

  completeGoogleProfile(): void {
    if (this.loading) {
      return;
    }

    const profile =
      this.pendingGoogleProfile;

    if (!profile) {
      this.errorMsg =
        'La sesión de Google expiró. Vuelve a iniciar el proceso.';

      this.view =
        'login';

      this.cdr.markForCheck();

      return;
    }

    this.errorMsg =
      null;

    this.clearServerErrors(
      this.googleProfileForm,
    );

    if (
      this.googleProfileForm.invalid
    ) {
      this.googleProfileForm
        .markAllAsTouched();

      this.cdr.markForCheck();

      return;
    }

    const value =
      this.googleProfileForm
        .getRawValue();

    this.loading =
      true;

    this.cdr.markForCheck();

    this.api
      .loginWithGoogle(
        profile.idToken,
        {
          phone:
            this.toEcuadorPhone(
              value.phone,
            ),

          firstName:
            value.first_name,

          lastName:
            value.last_name,
        },
      )
      .subscribe({
        next:
          response => {
            this.processSuccessfulLogin(
              response,
              profile.photoURL,
            );
          },

        error:
          error => {
            this.processAuthError(
              error,
              this.googleProfileForm,
            );
          },
      });
  }

  backFromGoogleProfile(): void {
    if (this.loading) {
      return;
    }

    this.pendingGoogleProfile =
      null;

    this.googleProfileForm
      .reset({
        first_name:
          '',

        last_name:
          '',

        phone:
          '',
      });

    this.view =
      'login';

    this.errorMsg =
      null;

    this.cdr.markForCheck();
  }

  togglePassword(): void {
    this.showPassword =
      !this.showPassword;
  }

  togglePasswordConfirmation(): void {
    this.showPasswordConfirmation =
      !this.showPasswordConfirmation;
  }

  fieldError(
    form: FormGroup,
    field: FieldName,
  ): string | null {
    const control =
      form.get(
        field,
      );

    if (
      !control ||
      !control.touched ||
      !control.errors
    ) {
      return null;
    }

    const server =
      control.errors[
        'server'
      ];

    if (
      typeof server ===
      'string'
    ) {
      return server;
    }

    if (
      control.errors[
        'required'
      ]
    ) {
      return (
        'Este campo es obligatorio.'
      );
    }

    if (
      control.errors[
        'email'
      ]
    ) {
      return (
        'Ingresa un correo electrónico válido.'
      );
    }

    if (
      control.errors[
        'minlength'
      ]
    ) {
      return (
        'Debe contener al menos 2 caracteres.'
      );
    }

    if (
      control.errors[
        'maxlength'
      ]
    ) {
      return (
        'El valor ingresado es demasiado largo.'
      );
    }

    if (
      control.errors[
        'pattern'
      ]
    ) {
      if (
        field ===
        'phone'
      ) {
        return (
          'Ingresa los 9 dígitos después de +593.'
        );
      }

      if (
        field ===
        'password'
      ) {
        return (
          'Usa al menos 8 caracteres, una mayúscula, ' +
          'una minúscula y un número.'
        );
      }
    }

    return (
      'Revisa el valor ingresado.'
    );
  }

  passwordConfirmationError():
    string | null {
    const control =
      this.registerForm
        .controls
        .password_confirmation;

    if (!control.touched) {
      return null;
    }

    if (
      control.errors
        ?.['required']
    ) {
      return (
        'Confirma tu contraseña.'
      );
    }

    if (
      this.registerForm
        .errors
        ?.['passwordMismatch']
    ) {
      return (
        'Las contraseñas no coinciden.'
      );
    }

    return null;
  }

  private processGoogleError(
    error: HttpErrorResponse,
  ): void {
    const apiError =
      (
        error.error ??
        {}
      ) as ApiErrorResponse;

    const completionCodes = [
      'PROFILE_COMPLETION_REQUIRED',
      'PHONE_REQUIRED',
    ];

    if (
      error.status ===
        422 &&
      completionCodes.includes(
        apiError.code ??
        '',
      )
    ) {
      this.loading =
        false;

      this.view =
        'google-profile';

      this.errorMsg =
        null;

      this.cdr.markForCheck();

      return;
    }

    this.processAuthError(
      error,
      this.googleProfileForm,
    );
  }

  private processSuccessfulLogin(
    response: AuthSessionResponse,
    photoUrl: string | null,
  ): void {
    const userWithPhoto:
      AuthUser = {
      ...response.data.user,

      photo_url:
        photoUrl ??
        response.data
          .user
          .photo_url ??
        null,
    };

    this.auth.setSession(
      response.data.token,
      userWithPhoto,
    );

    this.cart.replaceCart(
      response.data.cart,
    );

    this.loading =
      false;

    this.visible =
      false;

    this.resetState();

    this.cdr.markForCheck();

    this.redirectByRole(
      userWithPhoto.role_id,
    );
  }

  private processAuthError(
    error: HttpErrorResponse,
    form: FormGroup,
  ): void {
    this.loading =
      false;

    const apiError =
      (
        error.error ??
        {}
      ) as ApiErrorResponse;

    this.applyServerErrors(
      form,
      apiError.errors,
    );

    this.errorMsg =
      this.resolveApiError(
        error,
        apiError,
      );

    this.cdr.markForCheck();
  }

  private applyServerErrors(
    form: FormGroup,
    errors?:
      Record<
        string,
        string[]
      >,
  ): void {
    if (!errors) {
      return;
    }

    for (
      const [
        field,
        messages,
      ] of Object.entries(
        errors,
      )
    ) {
      const control =
        form.get(
          field,
        );

      const message =
        messages?.[0];

      if (
        !control ||
        !message
      ) {
        continue;
      }

      control.setErrors({
        ...(
          control.errors ??
          {}
        ),

        server:
          message,
      });

      control.markAsTouched();
    }
  }

  private clearServerErrors(
    form: FormGroup,
  ): void {
    Object.values(
      form.controls,
    ).forEach(
      control => {
        if (
          !control.errors
            ?.['server']
        ) {
          return;
        }

        const {
          server:
            _server,

          ...remaining
        } =
          control.errors;

        control.setErrors(
          Object.keys(
            remaining,
          ).length
            ? remaining
            : null,
        );
      },
    );
  }

  private redirectByRole(
    roleId: number,
  ): void {
    if (
      roleId ===
      ROLE_IDS.admin
    ) {
      void this.router
        .navigateByUrl(
          '/admin/analytics',
        );

      return;
    }

    if (
      roleId ===
      ROLE_IDS.operator
    ) {
      void this.router
        .navigateByUrl(
          '/operator/orders',
        );

      return;
    }

    void this.router
      .navigateByUrl(
        '/',
      );
  }

  private resolveApiError(
    error: HttpErrorResponse,
    apiError:
      ApiErrorResponse,
  ): string {
    if (
      apiError.message
    ) {
      return apiError.message;
    }

    if (
      error.status ===
      0
    ) {
      return (
        'No fue posible conectar con el servidor.'
      );
    }

    if (
      error.status ===
      401
    ) {
      return (
        'La sesión no es válida o ha expirado.'
      );
    }

    if (
      error.status ===
      429
    ) {
      return (
        'Realizaste demasiados intentos. Espera un momento.'
      );
    }

    if (
      error.status >=
      500
    ) {
      return (
        'El servidor no pudo completar la solicitud.'
      );
    }

    return (
      'No fue posible completar la autenticación.'
    );
  }

  private resolveFirebaseError(
    error: unknown,
  ): string {
    const message =
      error instanceof Error
        ? error.message
            .toLowerCase()
        : '';

    if (
      message.includes(
        'popup-closed',
      ) ||
      message.includes(
        'cancelled',
      )
    ) {
      return (
        'El acceso con Google fue cancelado.'
      );
    }

    if (
      message.includes(
        'popup-blocked',
      )
    ) {
      return (
        'El navegador bloqueó la ventana de Google. ' +
        'Habilita las ventanas emergentes.'
      );
    }

    return (
      'No se pudo abrir el acceso con Google.'
    );
  }

  private splitDisplayName(
    fullName: string,
  ): {
    firstName: string;
    lastName: string;
  } {
    const parts =
      fullName
        .trim()
        .split(
          /\s+/,
        )
        .filter(
          Boolean,
        );

    return {
      firstName:
        parts.shift() ??
        '',

      lastName:
        parts.join(
          ' ',
        ),
    };
  }

  private toEcuadorPhone(
    localPhone: string,
  ): string {
    const digits =
      localPhone
        .replace(
          /\D/g,
          '',
        )
        .replace(
          /^0/,
          '',
        );

    return `+593${digits}`;
  }

  private passwordsMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password =
      control.get(
        'password',
      )?.value;

    const confirmation =
      control.get(
        'password_confirmation',
      )?.value;

    return (
      password &&
      confirmation &&
      password !==
        confirmation
    )
      ? {
          passwordMismatch:
            true,
        }
      : null;
  }

  private resetState(): void {
    this.loading =
      false;

    this.view =
      'login';

    this.errorMsg =
      null;

    this.showPassword =
      false;

    this.showPasswordConfirmation =
      false;

    this.pendingGoogleProfile =
      null;

    this.loginForm.reset({
      email:
        '',

      password:
        '',
    });

    this.registerForm.reset({
      first_name:
        '',

      last_name:
        '',

      phone:
        '',

      email:
        '',

      password:
        '',

      password_confirmation:
        '',

      terms:
        false,
    });

    this.googleProfileForm.reset({
      first_name:
        '',

      last_name:
        '',

      phone:
        '',
    });
  }
}
