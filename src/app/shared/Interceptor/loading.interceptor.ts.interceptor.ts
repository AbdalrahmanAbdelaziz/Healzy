import { inject } from '@angular/core';
import { HttpRequest, HttpEvent, HttpHandlerFn, HttpEventType } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoaderService } from '../../services/loader.service';
import { Router } from '@angular/router';

let pendingRequests = 0;

// List of routes where loader should NOT appear
const excludeRoutes: string[] = ['/patient-home', '/secretary-home', '/doctor-home', '/my-appointment', '/d-list','d-contact-us', 'd-daily-report'
  ,'d-my-apointments', 'd-timeslot-management', 'd-profile', 'd-service-settings', 'd-patients', 'patient/:id','d-revenues', 'd-view-pp'
];

export function loaderInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const loaderService = inject(LoaderService);
  const router = inject(Router);
  const currentUrl = router.url;

  // Only show loader if route is NOT excluded
  if (!excludeRoutes.includes(currentUrl)) {
    loaderService.showLoading();
    pendingRequests++;
  }

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          handleHideLoading(currentUrl, loaderService);
        }
      },
      error: (_) => {
        handleHideLoading(currentUrl, loaderService);
      }
    })
  );
}

function handleHideLoading(currentUrl: string, loaderService: LoaderService) {
  if (!excludeRoutes.includes(currentUrl)) {
    pendingRequests--;
    if (pendingRequests <= 0) {
      loaderService.hideLoading();
      pendingRequests = 0;
    }
  }
}
