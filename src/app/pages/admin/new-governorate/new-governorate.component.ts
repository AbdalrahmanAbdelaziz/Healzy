// new-governorate.component.ts
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
import { MatSelectModule } from '@angular/material/select';
import { ApiResponse, Country, GovernorateRequest } from '../../../shared/models/location.models';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-new-governorate',
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
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './new-governorate.component.html',
  styleUrl: './new-governorate.component.css'
})
export class NewGovernorateComponent implements OnInit {
  governorate: GovernorateRequest = {
    name_En: '',
    name_Ar: '',
    countryID: 0
  };
  
  countries: Country[] = [];
  loading = false;
  countriesLoading = true;
  submitted = false;
  errors: { [key: string]: string } = {};

  constructor(
    private locationService: LocationService,
    private translocoService: TranslocoService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.countriesLoading = true;
    this.locationService.getAllCountries().subscribe({
      next: (response: ApiResponse<Country>) => {
        if (response.succeeded) {
          this.countries = response.data;
        } else {
          this.showError(response.message || this.translocoService.translate('new_governorate.errors.countries_load_failed'));
        }
        this.countriesLoading = false;
      },
      error: (err) => {
        this.showError(this.translocoService.translate('new_governorate.errors.countries_load_error'));
        this.countriesLoading = false;
        console.error('Error loading countries:', err);
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errors = {};

    // Validate form
    if (!this.governorate.name_En) {
      this.errors['name_En'] = this.translocoService.translate('new_governorate.errors.name_en_required');
    }
    if (!this.governorate.name_Ar) {
      this.errors['name_Ar'] = this.translocoService.translate('new_governorate.errors.name_ar_required');
    }
    if (!this.governorate.countryID) {
      this.errors['countryID'] = this.translocoService.translate('new_governorate.errors.country_required');
    }

    if (Object.keys(this.errors).length > 0) {
      return;
    }

    this.loading = true;

    this.locationService.createGovernorate(this.governorate).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading = false;
        
        if (response.succeeded) {
          this.snackBar.open(
            this.translocoService.translate('new_governorate.messages.create_success'),
            'Close',
            { 
              duration: 3000, 
              panelClass: ['success-snackbar'],
              horizontalPosition: 'right',
              verticalPosition: 'bottom'
            }
          );
          
          // Redirect to governorates list after success
          setTimeout(() => {
            this.router.navigate(['/governorates']);
          }, 1500);
        } else {
          this.showError(response.message || this.translocoService.translate('new_governorate.errors.create_failed'));
        }
      },
      error: (err) => {
        this.loading = false;
        this.showError(this.translocoService.translate('new_governorate.errors.create_error'));
        console.error('Error creating governorate:', err);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/governorates']);
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