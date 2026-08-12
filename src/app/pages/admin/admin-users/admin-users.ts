import {
  CommonModule,
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
  FormsModule,
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
  AdminUsersApiService,
} from '../../../core/api/admin/users/admin-users-api.service';
import {
  AdminUser,
  AdminUserRole,
  AdminUserRoleName,
} from '../../../core/api/admin/users/admin-users.models';
import {
  AdminUserFormDialogComponent,
  AdminUserFormSavedEvent,
} from '../../../shared/components/admin-user-form-dialog/admin-user-form-dialog';
import {
  AdminUserRoleChangeEvent,
  AdminUserRoleOption,
  AdminUserRowComponent,
} from '../../../shared/components/admin-user-row/admin-user-row';
import {
  adminUserRoleLabel,
} from '../../../shared/ui/admin-user-ui.utils';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector:
    'app-admin-users',
  standalone:
    true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    AdminUserFormDialogComponent,
    AdminUserRowComponent,
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

  readonly loadingRoles =
    signal(false);

  readonly dialogSaving =
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
    signal<AdminUserRoleName | ''>('');

  readonly selectedStatus =
    signal<'active' | 'inactive' | ''>('');

  readonly dialogVisible =
    signal(false);

  readonly editingUser =
    signal<AdminUser | null>(null);

  readonly roleOptions =
    computed<
      SelectOption<
        AdminUserRoleName | ''
      >[]
    >(
      () => [
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
              adminUserRoleLabel(
                role.name,
              ),
            value:
              role.name,
          }),
        ),
      ],
    );

  readonly formRoleOptions =
    computed<AdminUserRoleOption[]>(
      () =>
        this.roles().map(
          role => ({
            label:
              role.label ??
              adminUserRoleLabel(
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

  readonly actionsBusy =
    computed(
      () =>
        this.updatingRoleId() !==
          null ||
        this.updatingStatusId() !==
          null ||
        this.dialogSaving(),
    );

  constructor() {
    this.loadInitialData();
  }

  loadUsers(
    showRefreshState = false,
  ): void {
    if (showRefreshState) {
      this.refreshing.set(true);
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
        finalize(
          () => {
            this.loading.set(false);
            this.refreshing.set(false);
          },
        ),
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
      event.target as HTMLInputElement;

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
        event.first ?? 0,
      );

    const nextPage =
      Math.floor(
        first / rows,
      ) + 1;

    const pageSizeChanged =
      rows !== this.perPage();

    this.perPage.set(rows);
    this.currentPage.set(
      pageSizeChanged
        ? 1
        : nextPage,
    );
    this.loadUsers();
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.dialogVisible.set(true);
  }

  openEditDialog(
    user: AdminUser,
  ): void {
    this.editingUser.set(user);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(
    visible: boolean,
  ): void {
    this.dialogVisible.set(visible);

    if (!visible) {
      this.editingUser.set(null);
    }
  }

  onUserSaved(
    event: AdminUserFormSavedEvent,
  ): void {
    if (
      event.mode ===
      'updated'
    ) {
      this.replaceUser(
        event.user,
      );
      return;
    }

    this.currentPage.set(1);
    this.loadUsers();
  }

  onRoleChange(
    event: AdminUserRoleChangeEvent,
  ): void {
    this.confirmRoleChange(
      event.user,
      event.role,
    );
  }

  confirmRoleChange(
    user: AdminUser,
    role: AdminUserRoleName,
  ): void {
    if (
      role ===
      user.role.name
    ) {
      return;
    }

    const newRoleLabel =
      adminUserRoleLabel(role);

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
        finalize(
          () => {
            this.loading.set(false);
            this.loadingRoles.set(false);
          },
        ),
      )
      .subscribe({
        next:
          ({ users, roles }) => {
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
        { role },
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(
          () =>
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
            this.loadUsers(true);
          },
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
        finalize(
          () =>
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

  private applyUsersResponse(
    response: {
      data: AdminUser[];
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
      };
    },
  ): void {
    this.users.set(
      response.data ?? [],
    );
    this.totalRecords.set(
      response.meta?.total ?? 0,
    );
    this.currentPage.set(
      response.meta?.current_page ?? 1,
    );
    this.lastPage.set(
      response.meta?.last_page ?? 1,
    );
    this.perPage.set(
      response.meta?.per_page ?? 15,
    );
    this.from.set(
      response.meta?.from ?? null,
    );
    this.to.set(
      response.meta?.to ?? null,
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
