import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();

  const headers = req.headers
    .set('Accept', 'application/json')
    .set('Content-Type', req.headers.get('Content-Type') ?? 'application/json');

  if (!token) {
    return next(req.clone({ headers }));
  }

  return next(
    req.clone({
      headers: headers.set('Authorization', `Bearer ${token}`),
    })
  );
};
