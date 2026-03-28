import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/public/home-page/home-page').then(m => m.HomePage),
  },
  {
    path: 'builder/:name',
    loadComponent: () => import('./pages/public/pizza-builder/pizza-builder').then(m => m.PizzaBuilder),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/public/checkout-page/checkout-page').then(m => m.CheckoutPage),
  },

  // CUSTOMER
  {
    path: 'my/orders',
    canActivate: [authGuard, roleGuard(['customer', 'admin', 'operator'])], // si quieres estricto solo customer -> ['customer']
    loadComponent: () => import('./pages/customer/my-orders-page/my-orders-page').then(m => m.MyOrdersPage),
  },
  {
    path: 'my/orders/:orderId',
    canActivate: [authGuard, roleGuard(['customer', 'admin', 'operator'])],
    loadComponent: () => import('./pages/customer/my-order-detail-page/my-order-detail-page').then(m => m.MyOrderDetailPage),
  },

  // OPERATOR / ADMIN
  {
    path: 'operator/orders',
    canActivate: [authGuard, roleGuard(['operator', 'admin'])],
    loadComponent: () =>
      import('./pages/operator/operator-orders-page/operator-orders-page').then(m => m.OperatorOrdersPage),
  },
  {
    path: 'operator/orders/:orderId',
    canActivate: [authGuard, roleGuard(['operator', 'admin'])],
    loadComponent: () =>
      import('./pages/operator/operator-order-detail-page/operator-order-detail-page').then(m => m.OperatorOrderDetailPage),
  },

  { path: '**', redirectTo: '' },
];
