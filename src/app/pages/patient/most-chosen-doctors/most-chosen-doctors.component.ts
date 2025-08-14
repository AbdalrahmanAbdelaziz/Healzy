import { Component, OnInit } from '@angular/core';
import { Doctor } from '../../../shared/models/doctor.model';
import { DoctorService } from '../../../services/doctor.service';
import { CommonModule } from '@angular/common';
import { SpecializationService } from '../../../services/specialization.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BASE_URL } from '../../../shared/constants/urls';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-most-chosen-doctors',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './most-chosen-doctors.component.html',
  styleUrls: ['./most-chosen-doctors.component.css']
})
export class MostChosenDoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  specializations: { id: number; name_En: string; name_Ar?: string }[] = [];
  selectedSpecialization: string = '';
  patient!: LoginResponse;
  BASE_URL = BASE_URL;

  constructor(
    private doctorService: DoctorService,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private specializationService: SpecializationService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.selectedSpecialization = this.translocoService.translate('mostChosenDoctors.general');
    this.loadDoctors();

    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }
    });
  }

  loadDoctors(): void {
    this.doctorService.getTopDoctors().subscribe((data) => {
      this.doctors = data;
      this.filteredDoctors = data;

      // Fetch specializations with both English and Arabic names
      const uniqueSpecializationIds = [...new Set(data.map((doctor) => doctor.specializationId))];
      
      uniqueSpecializationIds.forEach((id) => {
        this.specializationService.getSpecializationById(id).subscribe((name) => {
          this.specializationService.getSpecializationById(id, 'ar').subscribe((nameAr) => {
            this.specializations.push({ 
              id, 
              name_En: name,
              name_Ar: nameAr 
            });
          });
        });
      });
    });
  }

 // Add this new helper method
getSpecializationDisplayName(spec: { name_En: string; name_Ar?: string }): string {
  return this.translocoService.getActiveLang() === 'ar' 
    ? spec.name_Ar || spec.name_En 
    : spec.name_En;
}

// Update the filterDoctors method to be more type-safe
filterDoctors(specialization: string): void {
  this.selectedSpecialization = specialization;
  const generalText = this.translocoService.translate('mostChosenDoctors.general');

  if (specialization === generalText || specialization === 'General') {
    this.filteredDoctors = this.doctors;
  } else {
    this.filteredDoctors = this.doctors.filter(doctor => {
      const doctorSpec = this.specializations.find(s => s.id === doctor.specializationId);
      if (!doctorSpec) return false;
      return this.getSpecializationDisplayName(doctorSpec) === specialization;
    });
  }
}

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  goToDoctorProfile(doctor: Doctor): void {
    this.router.navigate(
      ['/view-doctor-profile', doctor.id, doctor.specializationId],
      { queryParams: { clinicId: doctor.clinicId } }
    );
  }

  getDoctorSpecialization(doctor: Doctor): string {
    const lang = this.translocoService.getActiveLang();
    
    // First try direct properties on doctor
    if (lang === 'ar' && doctor.specialization_Ar) {
      return doctor.specialization_Ar;
    } else if (doctor.specialization_En) {
      return doctor.specialization_En;
    }
    
    // Fallback to getting from specializations array
    const spec = this.specializations.find(s => s.id === doctor.specializationId);
    if (spec) {
      return lang === 'ar' ? spec.name_Ar || spec.name_En : spec.name_En;
    }
    
    // Final fallback
    return this.translocoService.translate('mostChosenDoctors.unknownSpecialization');
  }

  getDoctorAltText(doctor: Doctor): string {
    const doctorName = doctor.firstName + ' ' + doctor.lastName;
    const specialization = this.getDoctorSpecialization(doctor);
    
    return this.translocoService.translate('mostChosenDoctors.doctorAltText', {
      name: doctorName,
      specialization: specialization
    });
  }
}