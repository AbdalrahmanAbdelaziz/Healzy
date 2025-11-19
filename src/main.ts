import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Transloco imports
import { TranslocoHttpLoader } from './app/services/transloco-loader';
import { provideTransloco, TranslocoModule } from '@ngneat/transloco';
import { provideTranslocoLocale } from '@ngneat/transloco-locale';

// Toastr
import { provideToastr } from 'ngx-toastr';

// Angular Material modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';

// Forms
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// NgxCharts
import { NgxChartsModule } from '@swimlane/ngx-charts';

// NgbModule
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

// Interceptors
import { authInterceptor } from './app/shared/Interceptor/auth.interceptor';
import { loaderInterceptor } from './app/shared/Interceptor/loading.interceptor.ts.interceptor';

// HttpClientModule (required by TranslocoHttpLoader)
import { HttpClientModule } from '@angular/common/http';

// 🔹 Firebase + AngularFire imports
import { environment } from './app/environment/environment';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

bootstrapApplication(AppComponent, {
  providers: [
    // Router
    provideRouter(routes),

    // HttpClient with interceptors
    provideHttpClient(withInterceptors([authInterceptor, loaderInterceptor])),

    // Animations
    provideAnimations(),

    // Toastr
    provideToastr({
      positionClass: 'toast-bottom-right',
      timeOut: 3000,
    }),

    // Angular Material modules
    importProvidersFrom(
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatDialogModule,
      MatCardModule,
      MatIconModule,
      MatGridListModule
    ),

    // Forms
    importProvidersFrom(FormsModule, ReactiveFormsModule),

    // Other modules
    importProvidersFrom(NgxChartsModule),
    importProvidersFrom(NgbModule),
    importProvidersFrom(HttpClientModule), // <--- Must be imported before Transloco

    // Transloco
    provideTransloco({
      config: {
        availableLangs: ['en', 'ar'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: false,
      },
      loader: TranslocoHttpLoader,
    }),

    // Transloco locale
    provideTranslocoLocale({
      langToLocaleMapping: {
        en: 'en-US',
        ar: 'ar-EG',
      },
    }),

    importProvidersFrom(TranslocoModule),

    // ✅ Firebase setup (direct providers, not inside importProvidersFrom)
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
  ],
}).catch((err) => console.error(err));
