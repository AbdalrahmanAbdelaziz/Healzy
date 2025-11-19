// new-country.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiResponse, CountryRequest } from '../../../shared/models/location.models';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-new-country',
  imports: [
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    TranslocoModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './new-country.component.html',
  styleUrl: './new-country.component.css'
})
export class NewCountryComponent implements OnInit {
  country: CountryRequest = {
    name_En: '',
    name_Ar: ''
  };
  
  loading = false;
  submitted = false;
  errors: { [key: string]: string } = {};

  constructor(
    private locationService: LocationService,
    private translocoService: TranslocoService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

onSubmit(): void {
  this.submitted = true;
  this.errors = {};

  // Validate English name
  if (!this.country.name_En) {
    this.errors['name_En'] = this.translocoService.translate('new_country.errors.name_en_required');
  } else if (!/^[A-Za-z\s]+$/.test(this.country.name_En)) {
    this.errors['name_En'] = this.translocoService.translate('new_country.errors.name_en_letters_only');
  }

  // Validate Arabic name
  if (!this.country.name_Ar) {
    this.errors['name_Ar'] = this.translocoService.translate('new_country.errors.name_ar_required');
  } else if (!/^[\u0600-\u06FF\s]+$/.test(this.country.name_Ar)) {
    this.errors['name_Ar'] = this.translocoService.translate('new_country.errors.name_ar_letters_only');
  }

  // Stop if validation failed
  if (Object.keys(this.errors).length > 0) {
    return;
  }

  this.loading = true;

  this.locationService.createCountry(this.country).subscribe({
    next: (response: ApiResponse<any>) => {
      this.loading = false;

      if (response.succeeded) {
        this.snackBar.open(
          this.translocoService.translate('new_country.messages.create_success'),
          'Close',
          {
            duration: 3000,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'bottom'
          }
        );

        setTimeout(() => {
          this.router.navigate(['/countries']);
        }, 1500);
      } else {
        this.showError(response.message || this.translocoService.translate('new_country.errors.create_failed'));
      }
    },
    error: (err) => {
      this.loading = false;
      this.showError(this.translocoService.translate('new_country.errors.create_error'));
      console.error('Error creating country:', err);
    }
  });
}


  onCancel(): void {
    this.router.navigate(['/countries']);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  // Helper method to check if a field has error
  hasError(fieldName: string): boolean {
    return this.submitted && !!this.errors[fieldName];
  }

  // Helper method to get error message
  getError(fieldName: string): string {
    return this.errors[fieldName] || '';
  }
}