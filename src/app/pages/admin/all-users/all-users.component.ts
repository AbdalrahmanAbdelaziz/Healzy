import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { DoctorService } from '../../../services/doctor.service';
import { PatientService } from '../../../services/patient.service';
import { Doctor } from '../../../shared/models/doctor.model';
import { Patient } from '../../../shared/models/patient';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [
    CommonModule, 
    AdminHeaderComponent, 
    LoadingSpinnerComponent, 
    TranslocoModule,
    ReactiveFormsModule
  ],
  templateUrl: './all-users.component.html',
  styleUrls: ['./all-users.component.css']
})
export class AllUsersComponent implements OnInit {
  doctors: Doctor[] = [];
  patients: Patient[] = [];
  filteredDoctors: Doctor[] = [];
  filteredPatients: Patient[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  searchQuery = '';
  currentLanguage = 'en';
  activeTab: 'doctors' | 'patients' = 'doctors';

  constructor(
    private doctorService: DoctorService,
    private patientService: PatientService,
    private translocoService: TranslocoService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.loadData();
  }

  loadData(): void {
    if (this.activeTab === 'doctors') {
      this.loadAllDoctors();
    } else {
      this.loadAllPatients();
    }
  }

  loadAllDoctors(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.doctorService.getAllDoctors().subscribe({
      next: (response: APIResponse<Doctor[]>) => {
        if (response.succeeded && response.data) {
          this.doctors = response.data;
          this.filteredDoctors = [...this.doctors];
        } else {
          const message = response.message || 
                        this.translocoService.translate('errors.failed_load_doctors');
          this.toastr.error(message);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.errorMessage = this.translocoService.translate('errors.load_doctors_error');
        this.isLoading = false;
      }
    });
  }

  loadAllPatients(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.patientService.getAllPatients().subscribe({
      next: (response: APIResponse<Patient[]>) => {
        if (response.succeeded && response.data) {
          this.patients = response.data;
          this.filteredPatients = [...this.patients];
        } else {
          const message = response.message || 
                        this.translocoService.translate('errors.failed_load_patients');
          this.toastr.error(message);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.errorMessage = this.translocoService.translate('errors.load_patients_error');
        this.isLoading = false;
      }
    });
  }

  filterUsers(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value.toLowerCase();
  
    if (!this.searchQuery) {
      if (this.activeTab === 'doctors') {
        this.filteredDoctors = [...this.doctors];
      } else {
        this.filteredPatients = [...this.patients];
      }
      return;
    }
  
    if (this.activeTab === 'doctors') {
      this.filteredDoctors = this.doctors.filter(doctor =>
        (doctor.firstName?.toLowerCase().includes(this.searchQuery) ||
        (doctor.lastName?.toLowerCase().includes(this.searchQuery)) ||
        (doctor.email?.toLowerCase().includes(this.searchQuery)) ||
        (doctor.phoneNumber?.toLowerCase().includes(this.searchQuery)) ||
        (doctor.country_En?.toLowerCase().includes(this.searchQuery)) ||
        (doctor.governorate_En?.toLowerCase().includes(this.searchQuery)) ||
        (doctor.district_En?.toLowerCase().includes(this.searchQuery)))
      );
    } else {
      this.filteredPatients = this.patients.filter(patient =>
        (patient.firstName?.toLowerCase().includes(this.searchQuery) ||
        patient.lastName?.toLowerCase().includes(this.searchQuery) ||
        patient.email?.toLowerCase().includes(this.searchQuery) ||
        patient.phoneNumber?.toLowerCase().includes(this.searchQuery))
      );
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    if (this.activeTab === 'doctors') {
      this.filteredDoctors = [...this.doctors];
    } else {
      this.filteredPatients = [...this.patients];
    }
  }

  getTranslatedName(item: any, property: string): string {
    const arProperty = `${property}_Ar`;
    const enProperty = `${property}_En`;
    
    return this.currentLanguage === 'ar' ? 
           (item[arProperty] as string) : 
           (item[enProperty] as string);
  }

  navigateToUser(userId: number): void {
    if (this.activeTab === 'doctors') {
      this.router.navigate(['/doctor-details', userId]);
    } else {
      this.router.navigate(['/patient-details', userId]);
    }
  }

  getCurrentDirection(): string {
    const currentLang = this.translocoService.getActiveLang();
    return currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  setActiveTab(tab: 'doctors' | 'patients'): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.loadData();
  }

  isDoctor(item: any): item is Doctor {
    return item && item.applicationRole_ID === 2; // Assuming 2 is doctor role
  }

  isPatient(item: any): item is Patient {
    return item && item.applicationRole_ID === 3; // Assuming 3 is patient role
  }
}