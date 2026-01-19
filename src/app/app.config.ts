import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth.interceptor';
import { cartSessionInterceptor } from './core/api/cart/cart-session.interceptor';

import { routes } from './app.routes';
import CheofPreset from './shared/ui/theme/cheof.preset'
import { MessageService } from 'primeng/api';

export const appConfig: ApplicationConfig = {
  providers: [
      provideHttpClient(withInterceptors([authInterceptor,cartSessionInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    MessageService,
    providePrimeNG({
      theme: {
        preset: CheofPreset,
       options: {
          darkModeSelector: '.cheof-dark'
        }
      }
    })
  ]
};
