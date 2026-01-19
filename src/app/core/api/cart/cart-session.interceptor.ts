// src/app/core/api/cart/cart-session.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CartSessionService } from './cart-session.service';

export const cartSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionId = inject(CartSessionService).get();
  if (!sessionId) return next(req);

  return next(
    req.clone({
      setHeaders: { 'X-Cart-Session': sessionId },
    })
  );
};
