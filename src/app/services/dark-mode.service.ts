import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  private readonly themeKey = 'theme';

  constructor() {
    this.loadTheme();
  }

  toggleTheme(): void {
    const currentTheme = localStorage.getItem(this.themeKey) === 'dark' ? 'light' : 'dark';
    this.setTheme(currentTheme);
  }

  isDarkMode(): boolean {
    return localStorage.getItem(this.themeKey) === 'dark';
  }

  private setTheme(theme: string): void {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem(this.themeKey, theme);
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(this.themeKey) || 'light';
    this.setTheme(savedTheme);
  }
}