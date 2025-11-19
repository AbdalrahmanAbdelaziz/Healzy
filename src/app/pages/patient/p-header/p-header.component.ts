import { Component, OnInit, Renderer2, OnDestroy, HostListener } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { Router, RouterModule } from '@angular/router';
import { LoginResponse } from '../../../shared/models/login-response';
import { CommonModule } from '@angular/common';
import { TranslocoService } from '@ngneat/transloco';
import { TranslocoModule } from '@ngneat/transloco';
import { BASE_URL } from '../../../shared/constants/urls';

@Component({
  selector: 'app-p-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule],
  templateUrl: './p-header.component.html',
  styleUrls: ['./p-header.component.css']
})
export class PHeaderComponent implements OnInit, OnDestroy {
 patient!: LoginResponse;
   isMenuOpen = false;
   isProfileMenuOpen = false;
   isDarkMode = false;
   currentLang: string = 'en';
   isMobileView = false;
   private darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    BASE_URL = BASE_URL; 
 
   constructor(
     private userService: UserService, 
     private router: Router, 
     private renderer: Renderer2,
     public translocoService: TranslocoService
   ) {
     this.userService.userObservable.subscribe((newUser) => {
       if (newUser) {
         this.patient = newUser;
       }
     });
     this.checkScreenSize();
   }
 
   @HostListener('window:resize', ['$event'])
   onResize() {
     this.checkScreenSize();
   }
 
   private checkScreenSize() {
     this.isMobileView = window.innerWidth < 992;
     if (!this.isMobileView) {
       this.isMenuOpen = false;
     }
   }
 
   ngOnInit(): void {
     const savedLang = localStorage.getItem('language') || 'en';
     this.currentLang = savedLang;
     this.translocoService.setActiveLang(savedLang);
     document.documentElement.lang = savedLang;
     document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
 
     const savedMode = localStorage.getItem('darkMode');
     this.isDarkMode = savedMode === 'true';
     this.applyDarkMode();
 
     if (!localStorage.getItem('darkMode')) {
       this.darkModeMediaQuery.addEventListener('change', this.systemThemeChanged);
     }
   }
 
   ngOnDestroy(): void {
     this.darkModeMediaQuery.removeEventListener('change', this.systemThemeChanged);
   }
 
   private systemThemeChanged = (e: MediaQueryListEvent) => {
     if (!localStorage.getItem('darkMode')) {
       this.isDarkMode = e.matches;
       this.applyDarkMode();
     }
   }
 
   switchLanguage(lang: string): void {
     this.currentLang = lang;
     this.translocoService.setActiveLang(lang);
     document.documentElement.lang = lang;
     document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
     localStorage.setItem('language', lang);
     this.closeAllMenus();
   }
 
   toggleDarkMode() {
     this.isDarkMode = !this.isDarkMode;
     localStorage.setItem('darkMode', this.isDarkMode.toString());
     this.applyDarkMode();
   }
 
   private applyDarkMode() {
     if (this.isDarkMode) {
       this.renderer.addClass(document.body, 'dark-mode');
     } else {
       this.renderer.removeClass(document.body, 'dark-mode');
     }
   }
 
   logout() {
     this.userService.logout();
     this.router.navigate(['/login']);
   }
 
   toggleMenu() {
     this.isMenuOpen = !this.isMenuOpen;
     if (this.isMenuOpen) {
       this.isProfileMenuOpen = false;
     }
   }
 
   toggleProfileMenu() {
     this.isProfileMenuOpen = !this.isProfileMenuOpen;
     if (this.isProfileMenuOpen) {
       this.isMenuOpen = false;
     }
   }
 
   closeAllMenus() {
     this.isMenuOpen = false;
     this.isProfileMenuOpen = false;
   }
 
   toggleLanguage(): void {
     const newLang = this.currentLang === 'en' ? 'ar' : 'en';
     this.switchLanguage(newLang);
   }
 }