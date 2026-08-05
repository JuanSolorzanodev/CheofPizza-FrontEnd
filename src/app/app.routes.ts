import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  /*
  |--------------------------------------------------------------------------
  | Página pública
  |--------------------------------------------------------------------------
  */

  {
    path: '',
    title: 'CheofPizza',

    loadComponent: () =>
      import(
        './pages/public/home-page/home-page'
      ).then(
        (module) =>
          module.HomePage,
      ),
  },

  /*
  |--------------------------------------------------------------------------
  | Constructor de pizzas
  |--------------------------------------------------------------------------
  */

  {
    path: 'builder/:name',
    title: 'Arma tu pizza',

    loadComponent: () =>
      import(
        './pages/public/pizza-builder/pizza-builder'
      ).then(
        (module) =>
          module.PizzaBuilder,
      ),
  },

  /*
  |--------------------------------------------------------------------------
  | Promoción pública
  |--------------------------------------------------------------------------
  */

  {
    path: 'promociones/:slug',
    title: 'Promoción',

    loadComponent: () =>
      import(
        './pages/public/promotion-detail-page/promotion-detail-page'
      ).then(
        (module) =>
          module.PromotionDetailPage,
      ),
  },

  /*
  |--------------------------------------------------------------------------
  | Checkout
  |--------------------------------------------------------------------------
  */

  {
    path: 'checkout',
    title: 'Finalizar pedido',

    loadComponent: () =>
      import(
        './pages/public/checkout-page/checkout-page'
      ).then(
        (module) =>
          module.CheckoutPage,
      ),
  },

  /*
  |--------------------------------------------------------------------------
  | Pedidos del cliente
  |--------------------------------------------------------------------------
  */

  {
    path: 'my/orders',
    title: 'Mis pedidos',

    canActivate: [
      authGuard,
      roleGuard([
        'customer',
        'admin',
        'operator',
      ]),
    ],

    loadComponent: () =>
      import(
        './pages/customer/my-orders-page/my-orders-page'
      ).then(
        (module) =>
          module.MyOrdersPage,
      ),
  },

  {
    path: 'my/orders/:orderId',
    title: 'Detalle del pedido',

    canActivate: [
      authGuard,
      roleGuard([
        'customer',
        'admin',
        'operator',
      ]),
    ],

    loadComponent: () =>
      import(
        './pages/customer/my-order-detail-page/my-order-detail-page'
      ).then(
        (module) =>
          module.MyOrderDetailPage,
      ),
  },

  /*
  |--------------------------------------------------------------------------
  | Operador
  |--------------------------------------------------------------------------
  */

  {
    path: 'operator/orders',
    title: 'Pedidos',

    canActivate: [
      authGuard,
      roleGuard([
        'operator',
        'admin',
      ]),
    ],

    loadComponent: () =>
      import(
        './pages/operator/operator-orders-page/operator-orders-page'
      ).then(
        (module) =>
          module.OperatorOrdersPage,
      ),
  },

  {
    path: 'operator/orders/:orderId',
    title: 'Detalle del pedido',

    canActivate: [
      authGuard,
      roleGuard([
        'operator',
        'admin',
      ]),
    ],

    loadComponent: () =>
      import(
        './pages/operator/operator-order-detail-page/operator-order-detail-page'
      ).then(
        (module) =>
          module.OperatorOrderDetailPage,
      ),
  },

  /*
  |--------------------------------------------------------------------------
  | Panel administrativo
  |--------------------------------------------------------------------------
  */

  {
    path: 'admin',

    canActivate: [
      authGuard,
      roleGuard([
        'admin',
      ]),
    ],

    loadComponent: () =>
      import(
        './layouts/admin-layout/admin-layout'
      ).then(
        (module) =>
          module.AdminLayout,
      ),

    children: [
      /*
      |--------------------------------------------------------------------------
      | Redirección administrativa
      |--------------------------------------------------------------------------
      */

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },

      /*
      |--------------------------------------------------------------------------
      | Resumen administrativo
      |--------------------------------------------------------------------------
      */

      {
        path: 'dashboard',
        title: 'Resumen administrativo',

        data: {
          breadcrumb:
            'Resumen',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-dashboard/admin-dashboard'
          ).then(
            (module) =>
              module.AdminDashboard,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Pedidos administrativos
      |--------------------------------------------------------------------------
      */

      {
        path: 'orders',
        title: 'Gestión de pedidos',

        data: {
          breadcrumb:
            'Pedidos',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-orders/admin-orders'
          ).then(
            (module) =>
              module.AdminOrders,
          ),
      },

      {
        path: 'orders/:orderId',
        title: 'Detalle del pedido',

        data: {
          breadcrumb:
            'Detalle del pedido',

          backUrl:
            '/admin/orders',
        },

        loadComponent: () =>
          import(
            './pages/operator/operator-order-detail-page/operator-order-detail-page'
          ).then(
            (module) =>
              module.OperatorOrderDetailPage,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Caja administrativa
      |--------------------------------------------------------------------------
      */

      {
        path: 'cash-register',
        title: 'Caja administrativa',

        data: {
          breadcrumb:
            'Caja',

          pageTitle:
            'Caja administrativa',

          pageDescription:
            'Controla el efectivo, movimientos y cierres de jornada.',

          pageIcon:
            'pi pi-wallet',

          section:
            'Principal',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-cash-register/admin-cash-register'
          ).then(
            (module) =>
              module.AdminCashRegister,
          ),
      },

      {
        path: 'cash-register/history',
        title: 'Historial de cajas',

        data: {
          breadcrumb:
            'Historial de cajas',

          backUrl:
            '/admin/cash-register',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-cash-register-history/admin-cash-register-history'
          ).then(
            (module) =>
              module.AdminCashRegisterHistory,
          ),
      },

      {
        path: 'cash-register/:uuid',
        title: 'Detalle de caja',

        data: {
          breadcrumb:
            'Detalle de caja',

          backUrl:
            '/admin/cash-register/history',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-cash-register-detail/admin-cash-register-detail'
          ).then(
            (module) =>
              module.AdminCashRegisterDetail,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Transacciones financieras
      |--------------------------------------------------------------------------
      */

      {
        path: 'transactions',
        title: 'Transacciones financieras',

        data: {
          breadcrumb:
            'Transacciones',

          pageTitle:
            'Transacciones financieras',

          pageDescription:
            'Consulta pagos, cobros, transferencias y movimientos PayPal.',

          pageIcon:
            'pi pi-credit-card',

          section:
            'Principal',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-payment-transactions/admin-payment-transactions'
          ).then(
            (module) =>
              module.AdminPaymentTransactions,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Categorías
      |--------------------------------------------------------------------------
      */

      {
        path: 'catalog/categories',
        title: 'Categorías',

        data: {
          breadcrumb:
            'Categorías',
        },

        loadComponent: () =>
          import(
            './core/api/admin/admin-categories/admin-categories'
          ).then(
            (module) =>
              module.AdminCategories,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Precios
      |--------------------------------------------------------------------------
      */

      {
        path: 'catalog/prices',
        title: 'Precios por categoría',

        data: {
          breadcrumb:
            'Precios',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-prices/admin-prices'
          ).then(
            (module) =>
              module.AdminPrices,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Pizzas
      |--------------------------------------------------------------------------
      */

      {
        path: 'catalog/pizzas',
        title: 'Pizzas',

        data: {
          breadcrumb:
            'Pizzas',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-pizzas/admin-pizzas'
          ).then(
            (module) =>
              module.AdminPizzas,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Ingredientes
      |--------------------------------------------------------------------------
      */

      {
        path: 'catalog/ingredients',
        title: 'Ingredientes y extras',

        data: {
          breadcrumb:
            'Ingredientes',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-ingredients/admin-ingredients'
          ).then(
            (module) =>
              module.AdminIngredients,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Promociones
      |--------------------------------------------------------------------------
      */

      {
        path: 'promotions',
        title: 'Promociones',

        data: {
          breadcrumb:
            'Promociones',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-promotions/admin-promotions'
          ).then(
            (module) =>
              module.AdminPromotions,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Usuarios
      |--------------------------------------------------------------------------
      */

      {
        path: 'users',
        title: 'Usuarios',

        data: {
          breadcrumb:
            'Usuarios',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-users/admin-users'
          ).then(
            (module) =>
              module.AdminUsers,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Configuración
      |--------------------------------------------------------------------------
      */

      {
        path: 'settings',
        title: 'Configuración',

        data: {
          breadcrumb:
            'Configuración',

          pageTitle:
            'Configuración del negocio',

          pageDescription:
            'Administra pagos, datos bancarios, delivery y datos comerciales.',

          pageIcon:
            'pi pi-cog',

          section:
            'Administración',
        },

        loadComponent: () =>
          import(
            './pages/admin/admin-settings/admin-settings'
          ).then(
            (module) =>
              module.AdminSettings,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Analítica predictiva
      |--------------------------------------------------------------------------
      */

      {
        path: 'analytics',
        title: 'Analítica predictiva',

        data: {
          breadcrumb:
            'Analítica predictiva',
        },

        loadComponent: () =>
          import(
            './pages/admin/machine-learning-dashboard/machine-learning-dashboard'
          ).then(
            (module) =>
              module.MachineLearningDashboard,
          ),
      },

      /*
      |--------------------------------------------------------------------------
      | Ruta administrativa no encontrada
      |--------------------------------------------------------------------------
      */

      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | Ruta global no encontrada
  |--------------------------------------------------------------------------
  */

  {
    path: '**',
    redirectTo: '',
  },
];
