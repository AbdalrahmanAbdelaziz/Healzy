// districts.component.ts
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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LocationService } from '../../../services/location.service';
import { ApiResponse, District } from '../../../shared/models/location.models';

@Component({
  selector: 'app-districts',
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
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './districts.component.html',
  styleUrl: './districts.component.css'
})
export class DistrictsComponent implements OnInit {
  districts: District[] = [];
  displayedColumns: string[] = ['id', 'name_En', 'name_Ar']; // Removed 'governorateName'
  loading = true;
  error = '';

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  constructor(
    private locationService: LocationService,
    private translocoService: TranslocoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.loading = true;
    this.locationService.getAllDistricts().subscribe({
      next: (response: ApiResponse<District>) => {
        if (response.succeeded) {
          this.districts = response.data;
          this.totalItems = response.data.length;
        } else {
          this.error = response.message || this.translocoService.translate('districts.errors.load_failed');
          this.showError(this.error);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = this.translocoService.translate('districts.errors.load_error');
        this.showError(this.error);
        this.loading = false;
        console.error('Error loading districts:', err);
      }
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get paginatedDistricts(): District[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.districts.slice(startIndex, startIndex + this.pageSize);
  }
}