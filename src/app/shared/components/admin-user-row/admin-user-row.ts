import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminUser, AdminUserRoleName } from '../../../core/api/admin/users/admin-users.models';
import {
  adminUserInitials,
  adminUserRoleLabel,
  adminUserRoleSeverity,
  adminUserStatusLabel,
  adminUserStatusSeverity,
} from '../../ui/admin-user-ui.utils';

export interface AdminUserRoleOption {
  label: string;
  value: AdminUserRoleName;
}

export interface AdminUserRoleChangeEvent {
  user: AdminUser;
  role: AdminUserRoleName;
}

@Component({
  selector: 'tr[appAdminUserRow]', // eslint-disable-line @angular-eslint/component-selector -- Attribute selector preserves valid table semantics.
  standalone: true,
  imports: [DatePipe, FormsModule, ButtonModule, SelectModule, TagModule, TooltipModule],
  templateUrl: './admin-user-row.html',
  styleUrl: './admin-user-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserRowComponent {
  readonly user = input.required<AdminUser>();

  readonly roleOptions = input.required<AdminUserRoleOption[]>();

  readonly roleUpdating = input(false);

  readonly statusUpdating = input(false);

  readonly actionsDisabled = input(false);

  readonly edit = output<AdminUser>();

  readonly roleChange = output<AdminUserRoleChangeEvent>();

  readonly statusChange = output<AdminUser>();

  readonly roleLabel = adminUserRoleLabel;

  readonly roleSeverity = adminUserRoleSeverity;

  readonly statusLabel = adminUserStatusLabel;

  readonly statusSeverity = adminUserStatusSeverity;

  readonly initials = adminUserInitials;

  onRoleChange(role: AdminUserRoleName | null | undefined): void {
    if (!role || role === this.user().role.name) {
      return;
    }

    this.roleChange.emit({
      user: this.user(),
      role,
    });
  }

  onStatusChange(): void {
    this.statusChange.emit(this.user());
  }

  onEdit(): void {
    this.edit.emit(this.user());
  }
}
