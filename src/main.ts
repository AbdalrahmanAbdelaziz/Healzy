import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Transloco imports
import { TranslocoHttpLoader } from './app/services/transloco-loader';
import { 
  provideTransloco,
  TranslocoModule
} from '@ngneat/transloco';
import { provideTranslocoLocale } from '@ngneat/transloco-locale';

// Toastr imports
import { provideToastr } from 'ngx-toastr';

// Angular Material imports - استيراد الوحدات بدلاً من دوال provide
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';

// Forms imports
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// NgxCharts imports
import { NgxChartsModule } from '@swimlane/ngx-charts';

// NgbModule imports
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    
    // Toastr configuration
    provideToastr({
      positionClass: 'toast-bottom-right',
      timeOut: 3000,
    }),
    
    // استيراد وحدات Angular Material باستخدام importProvidersFrom
    importProvidersFrom(
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatDialogModule,
      MatCardModule,
      MatIconModule,
      MatGridListModule
    ),
    
    // استيراد وحدات Forms
    importProvidersFrom(FormsModule, ReactiveFormsModule),
    
    // استيراد وحدات أخرى
    importProvidersFrom(NgxChartsModule),
    importProvidersFrom(NgbModule),
    
    // Transloco providers
    provideTransloco({
      config: {
        availableLangs: ['en', 'ar'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: false,
      },
      loader: TranslocoHttpLoader
    }),
    provideTranslocoLocale({
      langToLocaleMapping: {
        en: 'en-US',
        ar: 'ar-EG'
      }
    }),
    importProvidersFrom(TranslocoModule)
  ],
}).catch((err) => console.error(err));