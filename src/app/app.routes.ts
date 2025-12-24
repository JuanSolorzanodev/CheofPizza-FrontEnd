import { Routes } from '@angular/router';

export const routes: Routes = [
 {
    path: '',
    loadComponent: () =>
      import('./pages/public/home-page/home-page').then(m => m.HomePage),
  },
  {
    path: 'builder/:name',
    loadComponent: () =>
      import('./pages/public/pizza-builder/pizza-builder').then(m => m.PizzaBuilder),
  },
  { path: '**', redirectTo: '' },
];
