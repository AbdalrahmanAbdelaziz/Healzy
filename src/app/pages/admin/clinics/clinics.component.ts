import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { AdminService } from '../../../services/admin.service';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environment/environment.prod';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { LocalizedFieldPipe } from '../../../services/localized-field.pipe';

@Component({
  selector: 'app-clinics',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    RouterModule,
    MatProgressSpinnerModule,
    TranslocoModule,
    LocalizedFieldPipe
  ],
  templateUrl: './clinics.component.html',
  styleUrls: ['./clinics.component.css']
})
export class ClinicsComponent implements OnInit {
  clinics: any[] = [];
  filteredClinics: any[] = [];
  isLoading = true;
  searchTerm = '';
  selectedCountry = '';
  selectedGovernorate = '';
  countries: string[] = [];
  governorates: string[] = [];

  constructor(
    private adminService: AdminService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.isLoading = true;
    this.adminService.getAllClinics().subscribe({
      next: (response: APIResponse<any[]>) => {
        this.clinics = response.data;
        this.filteredClinics = [...this.clinics];
        this.extractFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading clinics:', error);
        this.isLoading = false;
      }
    });
  }

  extractFilters(): void {
    const lang = this.translocoService.getActiveLang();
    const countryField = lang === 'ar' ? 'country_Ar' : 'country_En';
    const governorateField = lang === 'ar' ? 'governorate_Ar' : 'governorate_En';
    
    this.countries = [...new Set(this.clinics.map(c => c[countryField]))];
    this.governorates = [...new Set(this.clinics.map(c => c[governorateField]))];
  }

  filterClinics(): void {
    const lang = this.translocoService.getActiveLang();
    const countryField = lang === 'ar' ? 'country_Ar' : 'country_En';
    const governorateField = lang === 'ar' ? 'governorate_Ar' : 'governorate_En';

    this.filteredClinics = this.clinics.filter(clinic => {
      const matchesSearch = clinic.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                         clinic.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                         clinic.phone.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCountry = this.selectedCountry ? clinic[countryField] === this.selectedCountry : true;
      const matchesGovernorate = this.selectedGovernorate ? clinic[governorateField] === this.selectedGovernorate : true;
      
      return matchesSearch && matchesCountry && matchesGovernorate;
    });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    const relativePath = imagePath.replace(/^wwwroot\\/, '');
    return `${environment.apiUrl}/${relativePath.replace(/\\/g, '/')}`;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCountry = '';
    this.selectedGovernorate = '';
    this.filteredClinics = [...this.clinics];
  }

  switchLanguage(lang: string): void {
    this.translocoService.setActiveLang(lang);
    this.extractFilters(); // Refresh filters when language changes
    this.filterClinics(); // Reapply filters with new language
  }
}