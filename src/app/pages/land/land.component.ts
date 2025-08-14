// land.component.ts
import { Component, OnInit, Renderer2 } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-land',
  standalone: true,
  imports: [RouterModule, TranslocoModule],
  templateUrl: './land.component.html',
  styleUrls: ['./land.component.css']
})
export class LandComponent implements OnInit {
  currentLang: string;

  constructor(
    private translocoService: TranslocoService,
    private renderer: Renderer2
  ) {
    this.currentLang = translocoService.getActiveLang();
    this.renderer.addClass(document.body, 'landing-page');
  }

  ngOnInit() {
    const browserLang = navigator.language.substring(0, 2);
    const supportedLangs = ['en', 'ar'];
    const defaultLang = supportedLangs.includes(browserLang) ? browserLang : 'en';
    
    this.currentLang = defaultLang;
    this.translocoService.setActiveLang(defaultLang);
    document.documentElement.lang = defaultLang;
    document.documentElement.dir = defaultLang === 'ar' ? 'rtl' : 'ltr';
  }

  ngOnDestroy() {
    this.renderer.removeClass(document.body, 'landing-page');
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  toggleLanguage() {
    const newLang = this.currentLang === 'en' ? 'ar' : 'en';
    this.switchLanguage(newLang);
  }
}