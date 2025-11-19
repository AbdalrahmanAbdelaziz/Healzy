// new-district.component.ts
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
import { ApiResponse, DistrictRequest, Governorate } from '../../../shared/models/location.models';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-new-district',
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
  templateUrl: './new-district.component.html',
  styleUrl: './new-district.component.css'
})
export class NewDistrictComponent implements OnInit {
  district: DistrictRequest = {
    name_En: '',
    name_Ar: '',
    governorateID: 0
  };
  
  governorates: Governorate[] = [];
  loading = false;
  governoratesLoading = true;
  submitted = false;
  errors: { [key: string]: string } = {};

  constructor(
    private locationService: LocationService,
    private translocoService: TranslocoService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadGovernorates();
  }

  loadGovernorates(): void {
    this.governoratesLoading = true;
    this.locationService.getAllGovernorates().subscribe({
      next: (response: ApiResponse<Governorate>) => {
        if (response.succeeded) {
          this.governorates = response.data;
        } else {
          this.showError(response.message || this.translocoService.translate('new_district.errors.governorates_load_failed'));
        }
        this.governoratesLoading = false;
      },
      error: (err) => {
        this.showError(this.translocoService.translate('new_district.errors.governorates_load_error'));
        this.governoratesLoading = false;
        console.error('Error loading governorates:', err);
      }
    });
  }

 onSubmit(): void {
  this.submitted = true;
  this.errors = {};

  // Validate English name
  if (!this.district.name_En) {
    this.errors['name_En'] = this.translocoService.translate('new_district.errors.name_en_required');
  } else if (!/^[A-Za-z\s]+$/.test(this.district.name_En)) {
    this.errors['name_En'] = this.translocoService.translate('new_district.errors.name_en_letters_only');
  }

  // Validate Arabic name
  if (!this.district.name_Ar) {
    this.errors['name_Ar'] = this.translocoService.translate('new_district.errors.name_ar_required');
  } else if (!/^[\u0600-\u06FF\s]+$/.test(this.district.name_Ar)) {
    this.errors['name_Ar'] = this.translocoService.translate('new_district.errors.name_ar_letters_only');
  }

  // Validate governorate selection
  if (!this.district.governorateID || this.district.governorateID === 0) {
    this.errors['governorateID'] = this.translocoService.translate('new_district.errors.governorate_required');
  }

  // Stop if errors exist
  if (Object.keys(this.errors).length > 0) {
    return;
  }

  this.loading = true;

  this.locationService.createDistrict(this.district).subscribe({
    next: (response: ApiResponse<any>) => {
      this.loading = false;
      
      if (response.succeeded) {
        this.snackBar.open(
          this.translocoService.translate('new_district.messages.create_success'),
          'Close',
          { 
            duration: 3000, 
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'bottom'
          }
        );
        
        setTimeout(() => {
          this.router.navigate(['/districts']);
        }, 1500);
      } else {
        this.showError(response.message || this.translocoService.translate('new_district.errors.create_failed'));
      }
    },
    error: (err) => {
      this.loading = false;
      this.showError(this.translocoService.translate('new_district.errors.create_error'));
      console.error('Error creating district:', err);
    }
  });
}


  onCancel(): void {
    this.router.navigate(['/districts']);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
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