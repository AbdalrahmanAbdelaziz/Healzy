import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SHeaderComponent } from '../secretary/s-header/s-header.component';


@Component({
  selector: 'app-footer',
   imports: [
      RouterModule, 
      CommonModule, 
      HttpClientModule, 
      FormsModule, 
      TranslocoModule,
      SHeaderComponent
    ],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
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
