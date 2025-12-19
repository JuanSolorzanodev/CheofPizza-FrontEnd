import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth.interceptor';

import { routes } from './app.routes';
import CheofPreset from './shared/ui/theme/cheof.preset'

export const appConfig: ApplicationConfig = {
  providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
