import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PHeaderComponent } from '../p-header/p-header.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Doctor } from '../../../shared/models/doctor.model';
import { DoctorService } from '../../../services/doctor.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { Clinic } from '../../../shared/models/clinic.model';
import { UserService } from '../../../services/user.service';
import { SpecializationService } from '../../../services/specialization.service';
import { ClinicService } from '../../../services/clinic.service';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { BASE_URL } from '../../../shared/constants/urls';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-filtered-doctors',
   imports: [CommonModule, RouterModule, PHeaderComponent, ReactiveFormsModule, FormsModule, SideNavbarComponent, TranslocoModule, FooterComponent],
  templateUrl: './filtered-doctors.component.html',
  styleUrl: './filtered-doctors.component.css'
})
export class FilteredDoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  patient!: LoginResponse;
  specialization: string = '';
  filteredDoctors: Doctor[] = [];
  searchTerm: string = '';
  specializationNames: { [key: number]: string } = {}; // Store specialization names
  clinics: { [id: number]: Clinic } = {}; // Store clinics by ID
  specializationId!: number;
  BASE_URL = BASE_URL;
    selectedDoctor?: Doctor;
    clinic?: Clinic;
    specializations: { id: number; name: string }[] = [];
    selectedSpecialization: string = '';
    appointments: any[] = [];
    doctor!: Doctor; 
    notes: string = '';
     

  constructor(
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private doctorService: DoctorService,
    private specializationService: SpecializationService,
    private clinicService: ClinicService,
    private cdr: ChangeDetectorRef,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {

    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }
    });

    this.activatedRoute.queryParams.subscribe(params => {
      const doctorId = Number(params['doctorId']);
  
      if (doctorId) {
        console.log("Query Params:", this.activatedRoute.snapshot.queryParams);

        this.getDoctorDetails(doctorId);
      }
    
    });



   
    this.loadSpecializationNames();

    this.activatedRoute.queryParams.subscribe(params => {
      console.log("Received filters:", params); // Debugging
      this.getFilteredDoctors(params);
    });
  }


    getClinicDetails(clinicId: number) {
      this.clinicService.getClinicById(clinicId).subscribe(
        (response: APIResponse<Clinic>) =>{
          this.clinic = response.data;
        }
      )
    }



    getDoctorDetails(doctorId: number): void {          
      this.doctorService.getDoctorsByOptionalParams({ id: doctorId }).subscribe(
        (response: APIResponse<Doctor[]>) => {
          var doctors = response.data;
          if (doctors.length > 0) {
            
            this.selectedDoctor = doctors[0];  // Set doctor data
            this.specializationService.getSpecializationById(this.selectedDoctor.specializationId).subscribe((name) => {
              this.specialization = name;
              // this.specializations.push({ id, name });
            });       
            this.getClinicDetails(this.selectedDoctor.clinicId);
  
          } else {
            console.warn("No doctor found for ID:", doctorId);
          }
        },
        (error) => {
          console.error("Error loading doctor details:", error);
        }
      );
    }
  
  
  




    loadSpecializationNames(): void {
      this.specializationService.getAllSpecializations().subscribe(response => {
        if (response.succeeded && response.data) {
          response.data.forEach(spec => {
            this.specializationNames[spec.id] = spec.name_En;
          });
        } else {
          console.error('Failed to load specializations:', response.message);
        }
      });
    }

  getSpecializationName(id: number): void {
    this.specializationService.getSpecializationById(id).subscribe(name => {
      this.specialization = name;
    });
  }

  getFilteredDoctors(filters: any): void {
    this.doctorService.getDoctorsByOptionalParams(filters).subscribe(
        (res) => {
            const response = res as { data?: Doctor[] };
            this.doctors = response.data || [];

            // Fetch clinic details for each doctor
            this.doctors.forEach((doctor) => {
                if (doctor.clinicId && !this.clinics[doctor.clinicId]) {
                    this.clinicService.getClinicById(doctor.clinicId).subscribe(
                        (response: APIResponse<Clinic>) => {
                            this.clinics[doctor.clinicId] = response.data; // Store clinic by ID
                        },
                        (error) => console.error("Error loading clinic details:", error)
                    );
                }
            });
        },
        (error) => console.error("Error fetching doctors", error)
    );
}


  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(link: string) {
    this.router.navigate([link]);
  }

  goToDoctorProfile(doctor: Doctor): void {
    this.router.navigate(
      ['/view-doctor-profile', doctor.id, doctor.specializationId],
      { queryParams: { clinicId: doctor.clinicId } }
    );
  }
  

  
  

}