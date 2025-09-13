import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './Security/Services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false || 'none',
          cssLayer: {
            name: 'primeng',
            order: 'app-styles, primeng',
          },
        },
      },
    }),
    MessageService,
    ConfirmationService,
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    {
      provide: 'APP_INIT_AUTH',
      useFactory: (authService: AuthService) => () => authService.initialize(),
      deps: [AuthService],
    },
  ],
};
