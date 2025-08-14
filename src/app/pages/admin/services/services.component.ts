import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { Service, ServiceOfDoctor } from '../../../services/doctorService.service';
import { Specialization, SpecializationService } from '../../../services/specialization.service';
import { finalize, forkJoin } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { TruncatePipe } from '../../../shared/constants/truncate.pipe';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { LocalizedFieldPipe } from '../../../services/localized-field.pipe';


@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    AdminHeaderComponent, 
    LoadingSpinnerComponent, 
    TruncatePipe,
    TranslocoModule,
    LocalizedFieldPipe
  ],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  services: Service[] = [];
  filteredServices: Service[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  specializationsMap: Map<number, {nameEn: string, nameAr: string}> = new Map();
  activeFilter: number | null = null;
  allSpecializations: Specialization[] = [];
  sortDirection: 'asc' | 'desc' = 'asc';
  currentSortField: string | null = null;

  constructor(
    private doctorService: ServiceOfDoctor,
    private specializationService: SpecializationService,
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    forkJoin({
      services: this.doctorService.getAllServices(),
      specializations: this.specializationService.getAllSpecializations()
    }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: ({services, specializations}) => {
        if (services.succeeded && specializations.succeeded) {
          this.allSpecializations = specializations.data;
          
          // Create map of specialization IDs to names
          specializations.data.forEach((spec: Specialization) => {
            this.specializationsMap.set(spec.id, {
              nameEn: spec.name_En,
              nameAr: spec.name_Ar
            });
          });
          
          // Map specialization names to services
          this.services = services.data.map(service => ({
            ...service,
            specializationName: this.getLocalizedSpecialization(service.specializationId)
          }));
          
          this.filteredServices = [...this.services];
        } else {
          this.errorMessage = services.message || specializations.message || this.translocoService.translate('services.errors.load_failed');
        }
      },
      error: (err) => {
        this.errorMessage = this.translocoService.translate('services.errors.generic');
        console.error('Error loading data:', err);
      }
    });
  }

  getLocalizedSpecialization(specializationId: number): string {
    const spec = this.specializationsMap.get(specializationId);
    if (!spec) return 'Unknown';
    return this.translocoService.getActiveLang() === 'ar' ? spec.nameAr : spec.nameEn;
  }

  refreshData(): void {
    this.activeFilter = null;
    this.loadData();
  }

  filterBySpecialization(specializationId: number | null): void {
    this.activeFilter = specializationId;
    if (specializationId === null) {
      this.filteredServices = [...this.services];
    } else {
      this.filteredServices = this.services.filter(
        service => service.specializationId === specializationId
      );
    }
  }

  getServiceCount(specializationId: number): number {
    return this.services.filter(s => s.specializationId === specializationId).length;
  }

  getTagColor(specializationId: number): string {
    const colors = [
      '#165B40', '#6c757d', '#198754', 
      '#dc3545', '#ffc107', '#0dcaf0', '#212529',
      '#6610f2', '#d63384', '#fd7e14', '#20c997'
    ];
    const index = specializationId % colors.length;
    return colors[index];
  }

  getSpecializationIcon(specializationName: string): string {
    const icons: { [key: string]: string } = {
      'Dentist': 'fas fa-tooth',
      'General Practitioner': 'fas fa-user-md',
      'Cardiologist': 'fas fa-heartbeat',
      'Psychiatrist': 'fas fa-brain',
      'Neurologist': 'fas fa-brain',
      'Dermatologist': 'fas fa-air-freshener',
      'Orthopedic': 'fas fa-bone',
      'Pediatrician': 'fas fa-baby',
      'Gynecologist': 'fas fa-venus',
      'Default': 'fas fa-stethoscope'
    };
    
    const foundKey = Object.keys(icons).find(key => 
      specializationName.toLowerCase().includes(key.toLowerCase())
    );
    
    return foundKey ? icons[foundKey] : icons['Default'];
  }

  sortServices(field: string): void {
    if (this.currentSortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredServices.sort((a, b) => {
      const valueA = a[field as keyof Service];
      const valueB = b[field as keyof Service];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      } else {
        return this.sortDirection === 'asc' 
          ? Number(valueA) - Number(valueB) 
          : Number(valueB) - Number(valueA);
      }
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  switchLanguage(lang: string): void {
    this.translocoService.setActiveLang(lang);
    // Update specialization names when language changes
    this.services = this.services.map(service => ({
      ...service,
      specializationName: this.getLocalizedSpecialization(service.specializationId)
    }));
    this.filteredServices = [...this.services];
  }
}