import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Handles 401 by attempting a single refresh-and-retry. Surfaces the API's
// error.message verbatim for everything else.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return from(auth.tryRefresh()).pipe(
          switchMap((ok) => {
            if (!ok) {
              void auth.logout();
              void router.navigateByUrl('/login');
              return throwError(() => err);
            }
            const token = auth.getAccessToken();
            const retried = req.clone({ setHeaders: token ? { Authorization: `Bearer ${token}` } : {} });
            return next(retried);
          }),
        );
      }
      const apiMessage = (err.error?.error?.message ?? err.error?.message ?? err.message) as string;
      return throwError(() => Object.assign(new Error(apiMessage), { status: err.status, raw: err }));
    }),
  );
};
