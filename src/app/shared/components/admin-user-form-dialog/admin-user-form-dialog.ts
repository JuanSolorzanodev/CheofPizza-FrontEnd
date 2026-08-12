import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AdminUsersApiService } from '../../../core/api/admin/users/admin-users-api.service';
import {
  AdminUser,
  AdminUserRole,
  AdminUserRoleName,
  AdminUserValidationErrorResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from '../../../core/api/admin/users/admin-users.models';
import { adminUserRoleLabel } from '../../ui/admin-user-ui.utils';

interface SelectOption<T> {
  label: string;
  value: T;
}

interface UserFormValue {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: AdminUserRoleName;
  is_active: boolean;
}

type UserFormGroup = FormGroup<{
  first_name: FormControl<string>;
  last_name: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  role: FormControl<AdminUserRoleName>;
  is_active: FormControl<boolean>;
}>;

export interface AdminUserFormSavedEvent {
  user: AdminUser;
  mode: 'created' | 'updated';
}

@Component({
  selector: 'app-admin-user-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './admin-user-form-dialog.html',
  styleUrl: './admin-user-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserFormDialogComponent {
  private readonly api = inject(AdminUsersApiService);

  private readonly formBuilder = inject(FormBuilder);

  private readonly messageService = inject(MessageService);

  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input(false);

  readonly user = input<AdminUser | null>(null);

  readonly roles = input<AdminUserRole[]>([]);

  readonly visibleChange = output<boolean>();

  readonly saved = output<AdminUserFormSavedEvent>();

  readonly savingChange = output<boolean>();

  readonly submitting = signal(false);

  readonly formSubmitted = signal(false);

  readonly serverErrors = signal<Record<string, string[]>>({});

  readonly isEditing = computed(() => this.user() !== null);

  readonly dialogTitle = computed(() => (this.isEditing() ? 'Editar usuario' : 'Crear usuario'));

  readonly dialogDescription = computed(() =>
    this.isEditing()
      ? 'Actualiza los datos personales del usuario.'
      : 'Registra un nuevo cliente, operador o administrador.',
  );

  readonly roleOptions = computed<SelectOption<AdminUserRoleName>[]>(() =>
    this.roles().map((role) => ({
      label: role.label ?? adminUserRoleLabel(role.name),
      value: role.name,
    })),
  );

  readonly userForm: UserFormGroup = this.formBuilder.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: [
      '',
      [
        Validators.required,
        Validators.minLength(7),
        Validators.maxLength(30),
        Validators.pattern(/^[0-9+()\-\s]+$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    role: ['customer' as AdminUserRoleName, [Validators.required]],
    is_active: [true],
  });

  constructor() {
    this.listenFormChanges();

    effect(() => {
      if (!this.visible()) {
        return;
      }

      this.initializeForm(this.user());
    });
  }

  onVisibleChange(visible: boolean): void {
    if (!visible && this.submitting()) {
      return;
    }

    this.visibleChange.emit(visible);

    if (!visible) {
      this.resetState();
    }
  }

  close(): void {
    if (this.submitting()) {
      return;
    }

    this.onVisibleChange(false);
  }

  saveUser(): void {
    this.formSubmitted.set(true);
    this.serverErrors.set({});
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Revisa el formulario',
        detail: 'Completa correctamente los campos obligatorios.',
      });

      return;
    }

    const editingUser = this.user();

    const rawValue = this.userForm.getRawValue();

    this.setSubmitting(true);

    if (editingUser) {
      const payload: UpdateAdminUserPayload = {
        first_name: rawValue.first_name.trim(),
        last_name: rawValue.last_name.trim(),
        phone: rawValue.phone.trim(),
        email: rawValue.email.trim().toLowerCase(),
      };

      this.api
        .updateUser(editingUser.id, payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.setSubmitting(false)),
        )
        .subscribe({
          next: (response) => {
            this.saved.emit({
              user: response.data,
              mode: 'updated',
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Usuario actualizado',
              detail: response.message,
            });

            this.onVisibleChange(false);
          },
          error: (error) => {
            this.handleFormError(error);
          },
        });

      return;
    }

    const payload: CreateAdminUserPayload = {
      first_name: rawValue.first_name.trim(),
      last_name: rawValue.last_name.trim(),
      phone: rawValue.phone.trim(),
      email: rawValue.email.trim().toLowerCase(),
      role: rawValue.role,
      is_active: rawValue.is_active,
    };

    this.api
      .createUser(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setSubmitting(false)),
      )
      .subscribe({
        next: (response) => {
          this.saved.emit({
            user: response.data,
            mode: 'created',
          });

          this.messageService.add({
            severity: 'success',
            summary: 'Usuario creado',
            detail: response.message,
          });

          this.onVisibleChange(false);
        },
        error: (error) => {
          this.handleFormError(error);
        },
      });
  }

  controlInvalid(controlName: keyof UserFormValue): boolean {
    const control = this.userForm.controls[controlName];

    return control.invalid && (control.touched || this.formSubmitted());
  }

  fieldError(field: keyof UserFormValue): string | null {
    const serverError = this.serverErrors()[field]?.[0];

    if (serverError) {
      return serverError;
    }

    const control = this.userForm.controls[field];

    if (!this.controlInvalid(field)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (control.hasError('minlength')) {
      const requiredLength = control.getError('minlength')?.requiredLength;

      return `Debe contener al menos ` + `${requiredLength} caracteres.`;
    }

    if (control.hasError('maxlength')) {
      return 'Supera la longitud permitida.';
    }

    if (control.hasError('pattern')) {
      return 'El formato ingresado no es válido.';
    }

    return 'Revisa este campo.';
  }

  private initializeForm(user: AdminUser | null): void {
    this.resetState();

    this.userForm.controls.role.enable({
      emitEvent: false,
    });

    this.userForm.controls.is_active.enable({
      emitEvent: false,
    });

    if (!user) {
      this.userForm.reset(
        {
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          role: 'customer',
          is_active: true,
        },
        {
          emitEvent: false,
        },
      );

      return;
    }

    this.userForm.reset(
      {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        email: user.email,
        role: user.role.name,
        is_active: user.is_active,
      },
      {
        emitEvent: false,
      },
    );

    this.userForm.controls.role.disable({
      emitEvent: false,
    });

    this.userForm.controls.is_active.disable({
      emitEvent: false,
    });
  }

  private listenFormChanges(): void {
    const fields: (keyof UserFormValue)[] = [
      'first_name',
      'last_name',
      'phone',
      'email',
      'role',
      'is_active',
    ];

    for (const field of fields) {
      this.watchControl(field, this.userForm.controls[field]);
    }
  }

  private watchControl(field: keyof UserFormValue, control: AbstractControl): void {
    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.removeServerError(field));
  }

  private removeServerError(field: string): void {
    const errors = {
      ...this.serverErrors(),
    };

    if (!errors[field]) {
      return;
    }

    delete errors[field];
    this.serverErrors.set(errors);
  }

  private resetState(): void {
    this.formSubmitted.set(false);
    this.serverErrors.set({});
  }

  private setSubmitting(value: boolean): void {
    this.submitting.set(value);
    this.savingChange.emit(value);
  }

  private handleFormError(error: {
    error?: AdminUserValidationErrorResponse;
    message?: string;
  }): void {
    const response = error.error;

    this.serverErrors.set(response?.errors ?? {});

    this.messageService.add({
      severity: 'error',
      summary: 'No se pudo guardar',
      detail: response?.message || error.message || 'Ocurrió un error al guardar el usuario.',
    });
  }
}
