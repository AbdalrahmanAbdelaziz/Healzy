// countries.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiResponse, Country, CountryRequest } from '../../../shared/models/location.models';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-countries',
  imports: [
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    TranslocoModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './countries.component.html',
  styleUrl: './countries.component.css'
})
export class CountriesComponent implements OnInit {
  countries: Country[] = [];
  displayedColumns: string[] = ['id', 'name_En', 'name_Ar']; // Removed 'actions' from here
  loading = true;
  error = '';
  isAdding = false;
  isEditing = false;
  currentEditingId: number | null = null;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  // Form model
  newCountry: CountryRequest = {
    name_En: '',
    name_Ar: ''
  };

  editCountry: CountryRequest = {
    name_En: '',
    name_Ar: ''
  };

  constructor(
    private locationService: LocationService,
    private translocoService: TranslocoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.loading = true;
    this.locationService.getAllCountries().subscribe({
      next: (response: ApiResponse<Country>) => {
        if (response.succeeded) {
          this.countries = response.data;
          this.totalItems = response.data.length;
        } else {
          this.error = response.message || this.translocoService.translate('countries.errors.load_failed');
          this.showError(this.error);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = this.translocoService.translate('countries.errors.load_error');
        this.showError(this.error);
        this.loading = false;
        console.error('Error loading countries:', err);
      }
    });
  }

  onSubmit(): void {
    if (!this.newCountry.name_En || !this.newCountry.name_Ar) {
      this.showError(this.translocoService.translate('countries.errors.name_required'));
      return;
    }

    this.locationService.createCountry(this.newCountry).subscribe({
      next: (response: ApiResponse<Country>) => {
        if (response.succeeded) {
          this.snackBar.open(
            this.translocoService.translate('countries.messages.add_success'),
            'Close',
            { duration: 3000, panelClass: ['success-snackbar'] }
          );
          this.isAdding = false;
          this.newCountry = { name_En: '', name_Ar: '' };
          this.loadCountries();
        } else {
          this.showError(response.message || this.translocoService.translate('countries.errors.add_failed'));
        }
      },
      error: (err) => {
        this.showError(this.translocoService.translate('countries.errors.add_error'));
        console.error('Error adding country:', err);
      }
    });
  }

  onEditSubmit(): void {
    if (!this.currentEditingId || !this.editCountry.name_En || !this.editCountry.name_Ar) {
      return;
    }

    this.locationService.updateCountry(this.currentEditingId, this.editCountry).subscribe({
      next: (response: ApiResponse<Country>) => {
        if (response.succeeded) {
          this.snackBar.open(
            this.translocoService.translate('countries.messages.update_success'),
            'Close',
            { duration: 3000, panelClass: ['success-snackbar'] }
          );
          this.cancelEdit();
          this.loadCountries();
        } else {
          this.showError(response.message || this.translocoService.translate('countries.errors.update_failed'));
        }
      },
      error: (err) => {
        this.showError(this.translocoService.translate('countries.errors.update_error'));
        console.error('Error updating country:', err);
      }
    });
  }

  startEdit(country: Country): void {
    this.isEditing = true;
    this.currentEditingId = country.id;
    this.editCountry = {
      name_En: country.name_En,
      name_Ar: country.name_Ar
    };
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.currentEditingId = null;
    this.editCountry = { name_En: '', name_Ar: '' };
  }



  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  toggleAddForm(): void {
    this.isAdding = !this.isAdding;
    if (this.isAdding) {
      this.isEditing = false;
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get paginatedCountries(): Country[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.countries.slice(startIndex, startIndex + this.pageSize);
  }
}