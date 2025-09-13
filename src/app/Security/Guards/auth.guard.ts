import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.userState$.pipe(
    take(1),
    map((isLoggedIn) => (isLoggedIn ? true : router.createUrlTree(['/login'])))
  );
};
