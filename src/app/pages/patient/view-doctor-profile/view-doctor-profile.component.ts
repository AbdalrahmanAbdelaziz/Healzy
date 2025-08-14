import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PHeaderComponent } from '../p-header/p-header.component';
import { Doctor } from '../../../shared/models/doctor.model';
import { DoctorService } from '../../../services/doctor.service';
import { FormsModule } from '@angular/forms';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { BASE_URL } from '../../../shared/constants/urls';
import { SpecializationService } from '../../../services/specialization.service';
import { FeedbackService } from '../../../services/feedback.service';
import { PatientService } from '../../../services/patient.service';
import { ClinicService } from '../../../services/clinic.service';
import { Clinic } from '../../../shared/models/clinic.model';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-view-doctor-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, PHeaderComponent, FormsModule, TranslocoModule, FooterComponent],
  templateUrl: './view-doctor-profile.component.html',
  styleUrl: './view-doctor-profile.component.css',
  providers: [DatePipe]
})
export class ViewDoctorProfileComponent implements OnInit {
  doctor: Doctor | null = null;
  specializationName: string = '';
  patient!: LoginResponse;
  BASE_URL = BASE_URL;
  roundedRating: number = 0;
  feedbacks: any[] = [];
  isLoading: boolean = true;
  currentTab: string = 'reviews';
  clinic: Clinic | null = null;
  clinicLoading: boolean = false;
  clinicError: string | null = null;
  galleryLightboxIndex: number = 0;
  showLightbox: boolean = false;

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private specializationService: SpecializationService,
    private feedbackService: FeedbackService,
    private patientService: PatientService,
    private clinicService: ClinicService,
    private router: Router,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }
    });

    const doctorId = Number(this.route.snapshot.paramMap.get('id'));
    const specializationId = Number(this.route.snapshot.paramMap.get('specializationId'));
    const clinicId = Number(this.route.snapshot.queryParamMap.get('clinicId'));

    if (doctorId && specializationId) {
      this.fetchDoctorData(doctorId, specializationId);
      this.fetchDoctorFeedbacks(doctorId);
    }

    if (clinicId) {
      this.fetchClinicData(clinicId);
    }
  }

  fetchClinicData(clinicId: number): void {
    this.clinicLoading = true;
    this.clinicError = null;
    this.clinicService.getClinicById(clinicId).subscribe({
      next: (response) => {
        if (response.Succeeded && response.data) {
          this.clinic = response.data;
          // Ensure clinicGallery is always an array
          this.clinic.clinicGallery = this.clinic.clinicGallery || [];
          // Process gallery images
          this.clinic.clinicGallery = this.clinic.clinicGallery.map(img => 
            this.getGalleryImagePath(img)
          );
        } else {
          this.clinicError = response.Message || 'Could not load clinic information';
        }
        this.clinicLoading = false;
      },
      error: (err) => {
        this.clinicError = 'Failed to load clinic information';
        this.clinicLoading = false;
      }
    });
  }

  openLightbox(index: number): void {
    if (!this.clinic?.clinicGallery) return;
    
    this.galleryLightboxIndex = index;
    this.showLightbox = true;
    document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
  }

  closeLightbox(): void {
    this.showLightbox = false;
    document.body.style.overflow = 'auto';
  }

  navigateLightbox(direction: number): void {
    if (!this.clinic?.clinicGallery || this.clinic.clinicGallery.length === 0) return;
    
    this.galleryLightboxIndex += direction;
    
    // Handle wrap-around
    if (this.galleryLightboxIndex < 0) {
      this.galleryLightboxIndex = this.clinic.clinicGallery.length - 1;
    } else if (this.galleryLightboxIndex >= this.clinic.clinicGallery.length) {
      this.galleryLightboxIndex = 0;
    }
  }

  changeTab(tab: string): void {
    this.currentTab = tab;
  }

  fetchDoctorData(doctorId: number, specializationId: number): void {
    this.doctorService.getDoctorsBySpecialization(specializationId).subscribe(
      (doctors: Doctor[]) => {
        this.doctor = doctors.find(doc => doc.id === doctorId) || null;
        if (this.doctor) {
          this.getSpecializationName(this.doctor.specializationId);
          this.roundedRating = Math.round((this.doctor.avgFeedbackRating || 0) * 10) / 10;
        }
      },
      (error) => {
        console.error('Error fetching doctor data:', error);
        this.isLoading = false;
      }
    );
  }

  fetchDoctorFeedbacks(doctorId: number): void {
    this.feedbackService.getFeedbacksByDoctorId(doctorId).subscribe(
      (response: any) => {
        const feedbacks = response.data || [];
        const feedbackPromises = feedbacks.map((fb: any) =>
          this.patientService.getPatientById(fb.patientId).toPromise().then(res => {
            const patient = res?.data;
            return {
              ...fb,
              patient: patient ?? null
            };
          }).catch(() => ({
            ...fb,
            patient: null
          }))
        );
        
        Promise.all(feedbackPromises).then(results => {
          this.feedbacks = results;
          this.isLoading = false;
        });
      },
      (error) => {
        console.error('Error fetching feedbacks:', error);
        this.feedbacks = [];
        this.isLoading = false;
      }
    );
  }

  getSpecializationName(specializationId: number): void {
    this.specializationService.getSpecializationById(specializationId).subscribe(
      (name: string) => {
        this.specializationName = name;
      },
      (error) => {
        console.error('Error fetching specialization name:', error);
      }
    );
  }

  goToAppointments(): void {
    if (this.doctor) {
      this.router.navigate([`/doctor-appointments/${this.doctor.id}/${this.doctor.specializationId}`]);
    }
  }

  getGalleryImagePath(imagePath: string): string {
    if (!imagePath) return '';
    // Remove the wwwroot part from the path if it exists
    return imagePath.replace('wwwroot\\', '').replace(/\\/g, '/');
  }
}