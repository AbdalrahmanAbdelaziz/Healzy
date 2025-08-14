import { HttpClient } from '@angular/common/http';
import { 
  TranslocoModule, 
  TranslocoLoader, 
  TRANSLOCO_CONFIG, 
  translocoConfig, 
  TranslocoService,
  TRANSLOCO_LOADER 
} from '@ngneat/transloco';
import { Injectable, NgModule } from '@angular/core';
import { environment } from '../environment/environment';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string) {
    return this.http.get<Record<string, any>>(`/assets/i18n/${lang}.json`);
  }
}

@NgModule({
  exports: [ TranslocoModule ],
  providers: [
    {
      provide: TRANSLOCO_CONFIG,
      useValue: translocoConfig({
        availableLangs: ['en', 'ar'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: environment.production,
      })
    },
    { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader }
  ]
})
export class TranslocoRootModule {
  constructor(transloco: TranslocoService) {
    transloco.setDefaultLang('en');
    transloco.setActiveLang('en');
  }
}