import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const toast = inject(MessageService);

  if (auth.isAuthenticated()) {
    return true;
  }

  toast.add({
    severity: 'warn',
    summary: 'Inicia sesión',
    detail: 'Necesitas iniciar sesión para continuar.',
  });

  return router.createUrlTree(['/']);
};
