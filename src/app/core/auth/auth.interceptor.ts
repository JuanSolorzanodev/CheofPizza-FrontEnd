import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();

  let headers = req.headers.set('Accept', 'application/json');

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) && req.body != null;

  // Solo setear Content-Type si hay body y NO es FormData
  if (hasBody && !headers.has('Content-Type') && !(req.body instanceof FormData)) {
    headers = headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return next(req.clone({ headers }));
};
