import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SHeaderComponent } from '../../secretary/s-header/s-header.component';
import { DHeaderComponent } from '../d-header/d-header.component';

@Component({
  selector: 'app-d-contact-us-page',
    imports: [
       RouterModule, 
       CommonModule, 
       HttpClientModule, 
       FormsModule, 
       TranslocoModule,
       DHeaderComponent
     ],
  templateUrl: './d-contact-us-page.component.html',
  styleUrl: './d-contact-us-page.component.css'
})
export class DContactUsPageComponent {

currentYear = new Date().getFullYear();
  contactForm = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  constructor(
    private translocoService: TranslocoService,
    private router: Router,
    private userService: UserService
  ) {}


   submitForm(): void {
    // Here you would typically send the form data to a backend service
    console.log('Form submitted:', this.contactForm);
    alert(this.translocoService.translate('contact.formSuccessMessage')); // Example success message

    // Reset the form (optional)
    this.contactForm = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
  }

  get currentLang(): string {
    return this.translocoService.getActiveLang();
  }

  changeLanguage(lang: string): void {
    this.translocoService.setActiveLang(lang);
  }

  navigateToHomeBasedOnRole(): void {
    const role = this.userService.getUserRole()?.toLowerCase();

    switch (role) {
      case 'patient':
        this.router.navigate(['/patient-home']);
        break;
      case 'secretary':
        this.router.navigate(['/secretary-home']);
        break;
      case 'doctor':
        this.router.navigate(['/doctor-home']);
        break;
      default:
        this.router.navigate(['/home']);
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}

