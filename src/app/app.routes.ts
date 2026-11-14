import { Routes } from '@angular/router';
import { accountGuard } from './features/account/account-api';

export const routes: Routes = [
  // The existing home screen lives in App's template, outside the outlet.
  // Keep an explicit root route so SSR/dev-server also serve GET /.
  { path: '', pathMatch: 'full', children: [] },
  { path: 'account', canActivate: [accountGuard], loadComponent: () => import('./features/account/account').then(m => m.Account) },
];
