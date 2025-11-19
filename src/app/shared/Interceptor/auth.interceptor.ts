import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const userJson = localStorage.getItem('User');
  const user = userJson ? JSON.parse(userJson) : null;
  const token = user?.data?.token; // adjust according to your LoginResponse structure

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  console.log('[Interceptor] URL:', req.url);
  console.log('[Interceptor] Token:', token);
  console.log('[Interceptor] Headers after clone:', authReq.headers.keys());

  return next(authReq);
};
