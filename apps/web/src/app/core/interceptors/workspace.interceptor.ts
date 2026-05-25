import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Adds X-Workspace-Id to every API request so the backend can scope queries
// without the client having to thread it through every call.
export const workspaceInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const ws = auth.currentWorkspace();
  if (!ws) return next(req);
  return next(req.clone({ setHeaders: { 'X-Workspace-Id': ws.workspaceId } }));
};
