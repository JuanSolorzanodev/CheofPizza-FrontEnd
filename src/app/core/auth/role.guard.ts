import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthStore } from './auth.store';
import {
  RoleName,
  isAnyRole,
} from './roles';

export function roleGuard(
  allowedRoles: readonly RoleName[],
): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    const toast = inject(MessageService);

    if (!auth.isAuthenticated()) {
      toast.add({
        severity: 'warn',
        summary: 'Inicia sesión',
        detail: 'Necesitas iniciar sesión para continuar.',
      });

      return router.createUrlTree(['/']);
    }

    const roleId = auth.user()?.role_id ?? null;

    if (isAnyRole(roleId, [...allowedRoles])) {
      return true;
    }

    toast.add({
      severity: 'error',
      summary: 'Acceso denegado',
      detail: 'No tienes permisos para acceder a esta sección.',
    });

    return router.createUrlTree(['/']);
  };
}
