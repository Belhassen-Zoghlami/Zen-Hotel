import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser;
  const expectedRoles = route.data['roles'] as string[];

  if (user && expectedRoles.includes(user.role)) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
