import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  {
    path: 'hotels',
    loadComponent: () => import('./pages/hotels/hotels').then((m) => m.Hotels),
  },

  {
    path: 'hotels/:id',
    loadComponent: () => import('./pages/hotel-detail/hotel-detail').then((m) => m.HotelDetail),
  },
  {
    path: 'hotels/:id/rooms',
    loadComponent: () => import('./pages/rooms/rooms').then((m) => m.Rooms),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner'] },
  },

  {
    path: 'dashboard/admin',
    loadComponent: () => import('./pages/dashboard/admin/admin').then((m) => m.Admin),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
  },

  {
    path: 'dashboard/owner',
    loadComponent: () => import('./pages/dashboard/owner/owner').then((m) => m.Owner),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner'] },
  },

  {
    path: 'dashboard/client',
    loadComponent: () => import('./pages/dashboard/client/client').then((m) => m.Client),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['client'] },
  },

  {
    path: 'verify-email',
    loadComponent: () => import('./pages/auth/verify/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'resend-verification',
    loadComponent: () =>
      import('./pages/auth/resend-verification/resend-verification').then(
        (m) => m.ResendVerification,
      ),
  },

  { path: '**', redirectTo: '' },
];
