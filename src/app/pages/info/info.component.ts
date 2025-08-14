import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DarkModeService } from '../../services/dark-mode.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, TranslocoModule],
  templateUrl: './info.component.html',
  styleUrl: './info.component.css'
})
export class InfoComponent implements OnInit {
  isDarkMode = false;
  currentLang: string = 'en';

  constructor(
    private el: ElementRef,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.showSectionsImmediately();
    this.checkScroll();
    this.currentLang = this.translocoService.getActiveLang();
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    this.checkScroll();
  }

  checkScroll() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      if (sectionTop < window.innerHeight - 100) {
        section.classList.add('show');
      }
    });
  }

  private showSectionsImmediately() {
    const sections = this.el.nativeElement.querySelectorAll('.section, .fade-in, .zoom-in');
    sections.forEach((section: HTMLElement) => {
      section.classList.add('show');
    });
  }
}