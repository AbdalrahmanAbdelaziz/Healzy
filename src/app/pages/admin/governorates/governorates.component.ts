// governorates.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { MatSelectModule } from '@angular/material/select';
import { ApiResponse, Governorate } from '../../../shared/models/location.models';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-governorates',
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
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './governorates.component.html',
  styleUrl: './governorates.component.css'
})
export class GovernoratesComponent implements OnInit {
  governorates: Governorate[] = [];
  displayedColumns: string[] = ['id', 'name_En', 'name_Ar']; // Removed 'countryName' and 'actions'
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
    this.loadGovernorates();
  }

  loadGovernorates(): void {
    this.loading = true;
    this.locationService.getAllGovernorates().subscribe({
      next: (response: ApiResponse<Governorate>) => {
        if (response.succeeded) {
          this.governorates = response.data;
          this.totalItems = response.data.length;
        } else {
          this.error = response.message || this.translocoService.translate('governorates.errors.load_failed');
          this.showError(this.error);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = this.translocoService.translate('governorates.errors.load_error');
        this.showError(this.error);
        this.loading = false;
        console.error('Error loading governorates:', err);
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

  get paginatedGovernorates(): Governorate[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.governorates.slice(startIndex, startIndex + this.pageSize);
  }
}