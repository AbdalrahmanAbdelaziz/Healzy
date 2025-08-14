import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { ServiceOfDoctor } from '../../../services/doctorService.service';
import { Specialization, SpecializationService } from '../../../services/specialization.service';
import { finalize } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-specializations',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminHeaderComponent, LoadingSpinnerComponent, TranslocoModule],
  templateUrl: './specializations.component.html',
  styleUrls: ['./specializations.component.css']
})
export class SpecializationsComponent implements OnInit {
  specializations: Specialization[] = [];
  filteredSpecializations: Specialization[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  searchQuery = '';
  currentLanguage: string = 'en';

  constructor(
    private speializationService: SpecializationService, 
    public translocoService: TranslocoService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.loadSpecializations();
  }

  getTranslatedName(spec: Specialization): string {
    return this.currentLanguage === 'ar' ? spec.name_Ar : spec.name_En;
  }

  private loadSpecializations(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.speializationService.getAllSpecializationsAdmin()
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data) {
            this.specializations = response.data;
            this.filteredSpecializations = [...this.specializations];
          } else {
            this.errorMessage = response.message || 
              this.translocoService.translate('errors.failed_load_specializations');
          }
        },
        error: (err) => {
          this.errorMessage = this.translocoService.translate('errors.load_specializations_error');
          console.error('Error loading specializations:', err);
        }
      });
  }

  filterSpecializations(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value.toLowerCase();
    
    if (!this.searchQuery) {
      this.filteredSpecializations = [...this.specializations];
      return;
    }

    this.filteredSpecializations = this.specializations.filter(spec => 
      spec.name_En.toLowerCase().includes(this.searchQuery) || 
      spec.name_Ar.toLowerCase().includes(this.searchQuery)
    );
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredSpecializations = [...this.specializations];
  }

  refreshSpecializations(): void {
    this.clearSearch();
    this.loadSpecializations();
  }
}