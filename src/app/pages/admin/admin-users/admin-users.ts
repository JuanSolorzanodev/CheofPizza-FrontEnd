import {
  CommonModule,
  DatePipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  ConfirmationService,
  MessageService,
} from 'primeng/api';
import {
  ButtonModule,
} from 'primeng/button';
import {
  ConfirmDialogModule,
} from 'primeng/confirmdialog';
import {
  DialogModule,
} from 'primeng/dialog';
import {
  InputTextModule,
} from 'primeng/inputtext';
import {
  PaginatorModule,
  PaginatorState,
} from 'primeng/paginator';
import {
  SelectModule,
} from 'primeng/select';
import {
  SkeletonModule,
} from 'primeng/skeleton';
import {
  TableModule,
} from 'primeng/table';
import {
  TagModule,
} from 'primeng/tag';
import {
  ToggleSwitchModule,
} from 'primeng/toggleswitch';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  AdminUsersApiService,
} from '../../../core/api/admin/users/admin-users-api.service';
import {
  AdminUser,
  AdminUserRole,
  AdminUserRoleName,
  AdminUserValidationErrorResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from '../../../core/api/admin/users/admin-users.models';

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

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
  ],
  providers: [
    ConfirmationService,
  ],
  templateUrl:
    './admin-users.html',
  styleUrl:
    './admin-users.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  private readonly api =
    inject(AdminUsersApiService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly confirmationService =
    inject(ConfirmationService);

  private readonly messageService =
    inject(MessageService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly loading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly submitting =
    signal(false);

  readonly loadingRoles =
    signal(false);

  readonly updatingRoleId =
    signal<number | null>(null);

  readonly updatingStatusId =
    signal<number | null>(null);

  readonly users =
    signal<AdminUser[]>([]);

  readonly roles =
    signal<AdminUserRole[]>([]);

  readonly totalRecords =
    signal(0);

  readonly currentPage =
    signal(1);

  readonly lastPage =
    signal(1);

  readonly perPage =
    signal(15);

  readonly from =
    signal<number | null>(null);

  readonly to =
    signal<number | null>(null);

  readonly search =
    signal('');

  readonly selectedRole =
    signal<AdminUserRoleName | ''>(
      '',
    );

  readonly selectedStatus =
    signal<
      'active' | 'inactive' | ''
    >('');

  readonly dialogVisible =
    signal(false);

  readonly editingUser =
    signal<AdminUser | null>(null);

  readonly formSubmitted =
    signal(false);

  readonly serverErrors =
    signal<
      Record<string, string[]>
    >({});

  readonly roleOptions =
    computed<
      SelectOption<
        AdminUserRoleName | ''
      >[]
    >(() => [
      {
        label:
          'Todos los roles',
        value:
          '',
      },
      ...this.roles().map(
        role => ({
          label:
            role.label ??
            this.roleLabel(
              role.name,
            ),

          value:
            role.name,
        }),
      ),
    ]);

  readonly formRoleOptions =
    computed<
      SelectOption<AdminUserRoleName>[]
    >(() =>
      this.roles().map(
        role => ({
          label:
            role.label ??
            this.roleLabel(
              role.name,
            ),

          value:
            role.name,
        }),
      ),
    );

  readonly statusOptions:
    SelectOption<
      'active' | 'inactive' | ''
    >[] = [
      {
        label:
          'Todos los estados',
        value:
          '',
      },
      {
        label:
          'Activos',
        value:
          'active',
      },
      {
        label:
          'Bloqueados',
        value:
          'inactive',
      },
    ];

  readonly pageSizeOptions = [
    10,
    15,
    25,
    50,
  ];

  readonly activeUsersCount =
    computed(
      () =>
        this.users().filter(
          user =>
            user.is_active,
        ).length,
    );

  readonly inactiveUsersCount =
    computed(
      () =>
        this.users().filter(
          user =>
            !user.is_active,
        ).length,
    );

  readonly operatorsCount =
    computed(
      () =>
        this.users().filter(
          user =>
            user.role.name ===
            'operator',
        ).length,
    );

  readonly adminsCount =
    computed(
      () =>
        this.users().filter(
          user =>
            user.role.name ===
            'admin',
        ).length,
    );

  readonly isEditing =
    computed(
      () =>
        this.editingUser() !==
        null,
    );

  readonly dialogTitle =
    computed(
      () =>
        this.isEditing()
          ? 'Editar usuario'
          : 'Crear usuario',
    );

  readonly dialogDescription =
    computed(
      () =>
        this.isEditing()
          ? 'Actualiza los datos personales del usuario.'
          : 'Registra un nuevo cliente, operador o administrador.',
    );

  readonly userForm:
    UserFormGroup =
    this.formBuilder.nonNullable.group({
      first_name: [
        '',
        [
          Validators.required,
          Validators.minLength(
            2,
          ),
          Validators.maxLength(
            100,
          ),
        ],
      ],

      last_name: [
        '',
        [
          Validators.required,
          Validators.minLength(
            2,
          ),
          Validators.maxLength(
            100,
          ),
        ],
      ],

      phone: [
        '',
        [
          Validators.required,
          Validators.minLength(
            7,
          ),
          Validators.maxLength(
            30,
          ),
          Validators.pattern(
            /^[0-9+()\-\s]+$/,
          ),
        ],
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(
            255,
          ),
        ],
      ],

      role: [
        'customer' as
          AdminUserRoleName,
        [
          Validators.required,
        ],
      ],

      is_active: [
        true,
      ],
    });

  constructor() {
    this.loadInitialData();
    this.listenFormChanges();
  }

  private loadInitialData(): void {
    this.loading.set(true);
    this.loadingRoles.set(true);

    forkJoin({
      users:
        this.api.getUsers({
          page:
            1,

          per_page:
            this.perPage(),
        }),

      roles:
        this.api.getRoles(),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.loading.set(false);
          this.loadingRoles.set(
            false,
          );
        }),
      )
      .subscribe({
        next: ({
          users,
          roles,
        }) => {
          this.roles.set(
            roles.data ?? [],
          );

          this.applyUsersResponse(
            users,
          );
        },

        error:
          error => {
            this.users.set([]);
            this.roles.set([]);

            this.messageService.add({
              severity:
                'error',

              summary:
                'No se pudieron cargar los usuarios',

              detail:
                this.extractErrorMessage(
                  error,
                ),
            });
          },
      });
  }

  loadUsers(
    showRefreshState = false,
  ): void {
    if (showRefreshState) {
      this.refreshing.set(
        true,
      );
    } else {
      this.loading.set(true);
    }

    this.api
      .getUsers({
        search:
          this.search(),

        role:
          this.selectedRole(),

        status:
          this.selectedStatus(),

        page:
          this.currentPage(),

        per_page:
          this.perPage(),
      })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(
            false,
          );
        }),
      )
      .subscribe({
        next:
          response => {
            this.applyUsersResponse(
              response,
            );
          },

        error:
          error => {
            this.messageService.add({
              severity:
                'error',

              summary:
                'No se pudo actualizar la lista',

              detail:
                this.extractErrorMessage(
                  error,
                ),
            });
          },
      });
  }

  refresh(): void {
    this.loadUsers(true);
  }

  onSearchInput(
    event: Event,
  ): void {
    const input =
      event.target as
        HTMLInputElement;

    this.search.set(
      input.value,
    );
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedRole.set('');
    this.selectedStatus.set('');
    this.currentPage.set(1);

    this.loadUsers();
  }

  onRoleFilterChange(
    value:
      | AdminUserRoleName
      | ''
      | null
      | undefined,
  ): void {
    this.selectedRole.set(
      value ?? '',
    );

    this.currentPage.set(1);
    this.loadUsers();
  }

  onStatusFilterChange(
    value:
      | 'active'
      | 'inactive'
      | ''
      | null
      | undefined,
  ): void {
    this.selectedStatus.set(
      value ?? '',
    );

    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageChange(
    event: PaginatorState,
  ): void {
    const rows =
      Number(
        event.rows ??
        this.perPage(),
      );

    const first =
      Number(
        event.first ??
        0,
      );

    const nextPage =
      Math.floor(
        first / rows,
      ) + 1;

    const pageSizeChanged =
      rows !==
      this.perPage();

    this.perPage.set(rows);

    this.currentPage.set(
      pageSizeChanged
        ? 1
        : nextPage,
    );

    this.loadUsers();
  }

  openCreateDialog(): void {
    this.editingUser.set(
      null,
    );

    this.formSubmitted.set(
      false,
    );

    this.serverErrors.set({});

    this.userForm.reset(
      {
        first_name:
          '',

        last_name:
          '',

        phone:
          '',

        email:
          '',

        role:
          'customer',

        is_active:
          true,
      },
      {
        emitEvent:
          false,
      },
    );

    this.setCreateValidators();

    this.dialogVisible.set(
      true,
    );
  }

  openEditDialog(
    user: AdminUser,
  ): void {
    this.editingUser.set(
      user,
    );

    this.formSubmitted.set(
      false,
    );

    this.serverErrors.set({});

    this.userForm.reset(
      {
        first_name:
          user.first_name,

        last_name:
          user.last_name,

        phone:
          user.phone,

        email:
          user.email,

        role:
          user.role.name,

        is_active:
          user.is_active,
      },
      {
        emitEvent:
          false,
      },
    );

    /*
     * El rol y el estado se administran mediante
     * acciones independientes para aplicar las
     * reglas de seguridad del backend.
     */
    this.userForm.controls.role
      .disable({
        emitEvent:
          false,
      });

    this.userForm.controls.is_active
      .disable({
        emitEvent:
          false,
      });

    this.dialogVisible.set(
      true,
    );
  }

  closeDialog(): void {
    if (
      this.submitting()
    ) {
      return;
    }

    this.dialogVisible.set(
      false,
    );

    this.editingUser.set(
      null,
    );

    this.formSubmitted.set(
      false,
    );

    this.serverErrors.set({});
  }

  saveUser(): void {
    this.formSubmitted.set(
      true,
    );

    this.serverErrors.set({});

    this.userForm.markAllAsTouched();

    if (
      this.userForm.invalid
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Revisa el formulario',

        detail:
          'Completa correctamente los campos obligatorios.',
      });

      return;
    }

    const editingUser =
      this.editingUser();

    const rawValue =
      this.userForm.getRawValue();

    this.submitting.set(true);

    if (editingUser) {
      const payload:
        UpdateAdminUserPayload = {
          first_name:
            rawValue
              .first_name
              .trim(),

          last_name:
            rawValue
              .last_name
              .trim(),

          phone:
            rawValue.phone.trim(),

          email:
            rawValue
              .email
              .trim()
              .toLowerCase(),
        };

      this.api
        .updateUser(
          editingUser.id,
          payload,
        )
        .pipe(
          takeUntilDestroyed(
            this.destroyRef,
          ),

          finalize(() =>
            this.submitting.set(
              false,
            ),
          ),
        )
        .subscribe({
          next:
            response => {
              this.replaceUser(
                response.data,
              );

              this.closeDialog();

              this.messageService.add({
                severity:
                  'success',

                summary:
                  'Usuario actualizado',

                detail:
                  response.message,
              });
            },

          error:
            error => {
              this.handleFormError(
                error,
              );
            },
        });

      return;
    }

    const payload:
      CreateAdminUserPayload = {
        first_name:
          rawValue
            .first_name
            .trim(),

        last_name:
          rawValue
            .last_name
            .trim(),

        phone:
          rawValue.phone.trim(),

        email:
          rawValue
            .email
            .trim()
            .toLowerCase(),

        role:
          rawValue.role,

        is_active:
          rawValue.is_active,
      };

    this.api
      .createUser(payload)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.submitting.set(
            false,
          ),
        ),
      )
      .subscribe({
        next:
          response => {
            this.closeDialog();

            this.messageService.add({
              severity:
                'success',

              summary:
                'Usuario creado',

              detail:
                response.message,
            });

            this.currentPage.set(1);
            this.loadUsers();
          },

        error:
          error => {
            this.handleFormError(
              error,
            );
          },
      });
  }

  confirmRoleChange(
    user: AdminUser,
    role:
      | AdminUserRoleName
      | null
      | undefined,
  ): void {
    if (
      !role ||
      role ===
        user.role.name
    ) {
      return;
    }

    const newRoleLabel =
      this.roleLabel(role);

    this.confirmationService.confirm({
      header:
        'Cambiar rol',

      icon:
        'pi pi-shield',

      message:
        `¿Cambiar el rol de ` +
        `"${user.full_name}" a ` +
        `"${newRoleLabel}"?`,

      acceptLabel:
        'Cambiar rol',

      rejectLabel:
        'Cancelar',

      acceptButtonStyleClass:
        'p-button-warning',

      accept:
        () =>
          this.updateRole(
            user,
            role,
          ),
    });
  }

  private updateRole(
    user: AdminUser,
    role: AdminUserRoleName,
  ): void {
    this.updatingRoleId.set(
      user.id,
    );

    this.api
      .updateRole(
        user.id,
        {
          role,
        },
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.updatingRoleId.set(
            null,
          ),
        ),
      )
      .subscribe({
        next:
          response => {
            this.replaceUser(
              response.data,
            );

            this.messageService.add({
              severity:
                'success',

              summary:
                'Rol actualizado',

              detail:
                response.message,
            });
          },

        error:
          error => {
            this.messageService.add({
              severity:
                'error',

              summary:
                'No se pudo cambiar el rol',

              detail:
                this.extractErrorMessage(
                  error,
                ),
            });

            /*
             * Recarga el registro para devolver visualmente
             * el selector al rol real del backend.
             */
            this.loadUsers(true);
          },
      });
  }

  confirmStatusChange(
    user: AdminUser,
  ): void {
    const activating =
      !user.is_active;

    this.confirmationService.confirm({
      header:
        activating
          ? 'Activar usuario'
          : 'Bloquear usuario',

      icon:
        activating
          ? 'pi pi-check-circle'
          : 'pi pi-ban',

      message:
        activating
          ? `¿Activar nuevamente la cuenta de "${user.full_name}"?`
          : `¿Bloquear la cuenta de "${user.full_name}"? Sus sesiones activas serán cerradas.`,

      acceptLabel:
        activating
          ? 'Activar'
          : 'Bloquear',

      rejectLabel:
        'Cancelar',

      acceptButtonStyleClass:
        activating
          ? 'p-button-success'
          : 'p-button-danger',

      accept:
        () =>
          this.updateStatus(
            user,
            activating,
          ),
    });
  }

  private updateStatus(
    user: AdminUser,
    isActive: boolean,
  ): void {
    this.updatingStatusId.set(
      user.id,
    );

    this.api
      .updateStatus(
        user.id,
        {
          is_active:
            isActive,
        },
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.updatingStatusId.set(
            null,
          ),
        ),
      )
      .subscribe({
        next:
          response => {
            this.replaceUser(
              response.data,
            );

            this.messageService.add({
              severity:
                'success',

              summary:
                isActive
                  ? 'Usuario activado'
                  : 'Usuario bloqueado',

              detail:
                response.message,
            });
          },

        error:
          error => {
            this.messageService.add({
              severity:
                'error',

              summary:
                isActive
                  ? 'No se pudo activar'
                  : 'No se pudo bloquear',

              detail:
                this.extractErrorMessage(
                  error,
                ),
            });
          },
      });
  }

  roleLabel(
    role: AdminUserRoleName,
  ): string {
    switch (role) {
      case 'admin':
        return 'Administrador';

      case 'operator':
        return 'Operador';

      default:
        return 'Cliente';
    }
  }

  roleSeverity(
    role: AdminUserRoleName,
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'secondary'
    | 'contrast' {
    switch (role) {
      case 'admin':
        return 'danger';

      case 'operator':
        return 'warn';

      default:
        return 'info';
    }
  }

  statusLabel(
    user: AdminUser,
  ): string {
    return user.is_active
      ? 'Activo'
      : 'Bloqueado';
  }

  statusSeverity(
    user: AdminUser,
  ):
    | 'success'
    | 'danger' {
    return user.is_active
      ? 'success'
      : 'danger';
  }

  userInitials(
    user: AdminUser,
  ): string {
    const first =
      user.first_name
        ?.trim()
        .charAt(0) ?? '';

    const last =
      user.last_name
        ?.trim()
        .charAt(0) ?? '';

    return (
      `${first}${last}`
        .toUpperCase() ||
      'U'
    );
  }

  usageTotal(
    user: AdminUser,
  ): number {
    return (
      Number(
        user.usage?.carts ??
        0,
      ) +
      Number(
        user.usage?.orders ??
        0,
      ) +
      Number(
        user.usage?.payments ??
        0,
      )
    );
  }

  isRoleUpdating(
    userId: number,
  ): boolean {
    return (
      this.updatingRoleId() ===
      userId
    );
  }

  isStatusUpdating(
    userId: number,
  ): boolean {
    return (
      this.updatingStatusId() ===
      userId
    );
  }

  controlInvalid(
    controlName:
      keyof UserFormValue,
  ): boolean {
    const control =
      this.userForm.controls[
        controlName
      ];

    return (
      control.invalid &&
      (
        control.touched ||
        this.formSubmitted()
      )
    );
  }

  fieldError(
    field:
      keyof UserFormValue,
  ): string | null {
    const serverError =
      this.serverErrors()[
        field
      ]?.[0];

    if (serverError) {
      return serverError;
    }

    const control =
      this.userForm.controls[
        field
      ];

    if (
      !this.controlInvalid(
        field,
      )
    ) {
      return null;
    }

    if (
      control.hasError(
        'required',
      )
    ) {
      return 'Este campo es obligatorio.';
    }

    if (
      control.hasError(
        'email',
      )
    ) {
      return 'Ingresa un correo válido.';
    }

    if (
      control.hasError(
        'minlength',
      )
    ) {
      const requiredLength =
        control.getError(
          'minlength',
        )?.requiredLength;

      return (
        `Debe contener al menos ` +
        `${requiredLength} caracteres.`
      );
    }

    if (
      control.hasError(
        'maxlength',
      )
    ) {
      return 'Supera la longitud permitida.';
    }

    if (
      control.hasError(
        'pattern',
      )
    ) {
      return 'El formato ingresado no es válido.';
    }

    return 'Revisa este campo.';
  }

  private applyUsersResponse(
    response: {
      data:
        AdminUser[];

      meta: {
        current_page:
          number;

        last_page:
          number;

        per_page:
          number;

        total:
          number;

        from:
          number | null;

        to:
          number | null;
      };
    },
  ): void {
    this.users.set(
      response.data ?? [],
    );

    this.totalRecords.set(
      response.meta?.total ??
      0,
    );

    this.currentPage.set(
      response.meta
        ?.current_page ??
      1,
    );

    this.lastPage.set(
      response.meta
        ?.last_page ??
      1,
    );

    this.perPage.set(
      response.meta
        ?.per_page ??
      15,
    );

    this.from.set(
      response.meta?.from ??
      null,
    );

    this.to.set(
      response.meta?.to ??
      null,
    );
  }

  private replaceUser(
    updatedUser: AdminUser,
  ): void {
    this.users.update(
      users =>
        users.map(
          user =>
            user.id ===
            updatedUser.id
              ? updatedUser
              : user,
        ),
    );
  }

  private setCreateValidators(): void {
    this.userForm.controls.role
      .enable({
        emitEvent:
          false,
      });

    this.userForm.controls.is_active
      .enable({
        emitEvent:
          false,
      });
  }

  private listenFormChanges(): void {
    this.watchControl(
      'first_name',
      this.userForm.controls.first_name,
    );

    this.watchControl(
      'last_name',
      this.userForm.controls.last_name,
    );

    this.watchControl(
      'phone',
      this.userForm.controls.phone,
    );

    this.watchControl(
      'email',
      this.userForm.controls.email,
    );

    this.watchControl(
      'role',
      this.userForm.controls.role,
    );

    this.watchControl(
      'is_active',
      this.userForm.controls.is_active,
    );
  }

  private watchControl(
    field: keyof UserFormValue,
    control: AbstractControl,
  ): void {
    control.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.removeServerError(
          field,
        );
      });
  }

  private removeServerError(
    field: string,
  ): void {
    const errors = {
      ...this.serverErrors(),
    };

    if (!errors[field]) {
      return;
    }

    delete errors[field];

    this.serverErrors.set(
      errors,
    );
  }

  private handleFormError(
    error: {
      error?:
        AdminUserValidationErrorResponse;

      message?: string;
    },
  ): void {
    const response =
      error.error;

    this.serverErrors.set(
      response?.errors ??
      {},
    );

    this.messageService.add({
      severity:
        'error',

      summary:
        'No se pudo guardar',

      detail:
        response?.message ||
        error.message ||
        'Ocurrió un error al guardar el usuario.',
    });
  }

  private extractErrorMessage(
    error: {
      error?: {
        message?: string;
      };

      message?: string;
    },
  ): string {
    return (
      error?.error?.message ||
      error?.message ||
      'Ocurrió un error inesperado.'
    );
  }
}
