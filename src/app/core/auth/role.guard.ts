import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AuthStore } from './auth.store';
import { RoleName, isAnyRole } from './roles';

export function roleGuard(allowed: RoleName[]): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    const toast = inject(MessageService);

    const roleId = auth.user()?.role_id ?? null;

    if (!auth.isAuthenticated()) {
      toast.add({ severity: 'warn', summary: 'Inicia sesión', detail: 'Acceso restringido.' });
      router.navigateByUrl('/');
      return false;
    }

    if (isAnyRole(roleId, allowed)) return true;

    toast.add({ severity: 'error', summary: 'Acceso denegado', detail: 'No tienes permisos para entrar aquí.' });
    router.navigateByUrl('/');
    return false;
  };
}
