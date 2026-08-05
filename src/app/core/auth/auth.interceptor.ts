import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (
  request,
  next,
) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  const apiUrl = environment.apiUrl.replace(/\/+$/, '');
  const isBackendRequest =
    request.url === apiUrl ||
    request.url.startsWith(`${apiUrl}/`);

  /*
   * No añadimos Authorization a Firebase, PayPal, mapas,
   * imágenes ni otros servicios externos.
   */
  if (!isBackendRequest) {
    return next(request);
  }

  let headers = request.headers.set(
    'Accept',
    'application/json',
  );

  const method = request.method.toUpperCase();

  const hasBody =
    !['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) &&
    request.body !== null &&
    request.body !== undefined;

  const isFormData =
    typeof FormData !== 'undefined' &&
    request.body instanceof FormData;

  if (
    hasBody &&
    !headers.has('Content-Type') &&
    !isFormData
  ) {
    headers = headers.set(
      'Content-Type',
      'application/json',
    );
  }

  const token = auth.token();

  if (token) {
    headers = headers.set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  const authenticatedRequest = request.clone({
    headers,
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const isAuthEndpoint =
        request.url.includes('/v1/auth/firebase/google') ||
        request.url.includes('/v1/auth/logout');

      /*
       * Un token inválido o expirado no debe permanecer almacenado.
       */
      if (
        error.status === 401 &&
        token &&
        !isAuthEndpoint
      ) {
        auth.clearSession();

        void router.navigateByUrl('/');
      }

      return throwError(() => error);
    }),
  );
};
