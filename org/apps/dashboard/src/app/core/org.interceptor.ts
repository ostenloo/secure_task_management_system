import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OrgContextService } from './org-context.service';
import { API_BASE_URL } from './constants';

export function orgInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const orgCtx = inject(OrgContextService);
  const current = orgCtx.current;

  let updated = req;
  const isApiCall = req.url.startsWith(API_BASE_URL);
  if (current?.id && isApiCall) {
    updated = req.clone({
      setHeaders: {
        'X-Org-Id': current.id,
      },
    });
  }

  return next(updated);
}
