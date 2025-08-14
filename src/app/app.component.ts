import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from './pages/footer/footer.component';
import { App } from '@capacitor/app';
import { Platform } from '@angular/cdk/platform';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'HEALZY';

  constructor(
    private translocoService: TranslocoService,
    private router: Router,
    private platform: Platform
  ) {}

  async ngOnInit() {
    // Set up language
    const savedLang = localStorage.getItem('language') || 'en';
    this.translocoService.setActiveLang(savedLang);
    document.documentElement.lang = savedLang;
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';

    // Initialize back button handling
    this.initializeBackButton();
  }

  private initializeBackButton() {
    // Only set up back button listener on mobile platforms
    if (this.platform.ANDROID || this.platform.IOS) {
      // Capacitor back button listener
      App.addListener('backButton', ({ canGoBack }) => {
        const currentUrl = this.router.url;
        
        // Define root pages where we should exit the app
        const exitPages = ['/land'];
        
        if (exitPages.includes(currentUrl)) {
          // On root pages, exit the app
          App.exitApp();
        } else if (canGoBack) {
          // Navigate back in the app's history
          window.history.back();
        } else {
          // If can't go back but not on exit page, still exit
          App.exitApp();
        }
      });
    }
  }
}