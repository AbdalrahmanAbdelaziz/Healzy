import { Component, OnInit, OnDestroy } from '@angular/core';
import { PHeaderComponent } from "../p-header/p-header.component";
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Appointment } from '../../../shared/models/appointment.model';
import { AppointmentService } from '../../../services/appointment.service';
import { CommonModule } from '@angular/common';
import { MostChosenDoctorsComponent } from '../most-chosen-doctors/most-chosen-doctors.component';
import { Clinic } from '../../../shared/models/clinic.model';
import { Doctor } from '../../../shared/models/doctor.model';
import { forkJoin, interval, map, Subscription, switchMap } from 'rxjs';
import { ClinicService } from '../../../services/clinic.service';
import { DoctorService } from '../../../services/doctor.service';
import { SpecializationService } from '../../../services/specialization.service';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { BASE_URL } from '../../../shared/constants/urls';
import { ToastrService } from 'ngx-toastr';
import { FeedbackService } from '../../../services/feedback.service';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';


@Component({  
  selector: 'app-p-home',
  standalone: true,
  imports: [
    PHeaderComponent, 
    CommonModule, 
    MostChosenDoctorsComponent, 
    RouterModule, 
    SideNavbarComponent,
    FormsModule,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './p-home.component.html',
  styleUrls: ['./p-home.component.css']
})
export class PHomeComponent implements OnInit, OnDestroy {
  patient!: LoginResponse;
  appointments: any[] = [];
  filteredAppointments: any[] = [];
  historyAppointments: any[] = [];
  isHistoryModalOpen: boolean = false;
  isCancelModalOpen: boolean = false;
  selectedAppointmentId: number | null = null;  
  currentIndex = 0;
  clinics: { [id: number]: Clinic } = {};
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  specializationId!: number;
  specializationNames: { [key: number]: string } = {};
  specialization: string = '';
  BASE_URL = BASE_URL;
  private pollingSubscription!: Subscription;

  // Feedback properties
  isFeedbackModalOpen: boolean = false;
  currentFeedbackAppointment: any = null;
  rating: number = 0;
  comment: string = '';
  hasRated: boolean = false;
  processedAppointments: any[] = [];
  showInitialFeedbackModal: boolean = false;
  private firstLoginAfterProcessing: boolean = false;

  constructor(
    private doctorService: DoctorService,
    private specializationService: SpecializationService,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private toastr: ToastrService,
    private feedbackService: FeedbackService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
        this.checkFirstLoginAfterProcessing();
        this.loadAppointments();
        this.startPolling();
      }
    });

    this.activatedRoute.params.subscribe(params => {
      if (params['specialization']) {
        const specializationId = Number(params['specialization']);
        if (!isNaN(specializationId)) {
          this.getSpecializationName(specializationId);
          this.fetchDoctors(specializationId);
        } else {
          console.error("Invalid specialization ID:", params['specialization']);
        }
      } else {
        console.error("Specialization ID is missing from route parameters.");
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  private checkFirstLoginAfterProcessing(): void {
    const lastLoginTime = localStorage.getItem('lastLoginTime');
    const now = new Date().getTime();
    
    // Consider it first login if:
    // 1. No last login time recorded OR
    // 2. Last login was before the current session
    this.firstLoginAfterProcessing = !lastLoginTime || 
                                 (parseInt(lastLoginTime || '0') < now);

    
    // Update last login time
    localStorage.setItem('lastLoginTime', now.toString());
  }

  

  startPolling(): void {
    this.pollingSubscription = interval(60000)
      .pipe(
        switchMap(() => this.appointmentService.getAppointments(this.patient.data.id))
      )
      .subscribe({
        next: (response) => this.handleAppointmentResponse(response),
        error: (error) => console.error("Polling error:", error)
      });
  }

  loadAppointments(): void {
    this.appointmentService.getAppointments(this.patient.data.id)
      .subscribe((response) => this.handleAppointmentResponse(response));
  }

  handleAppointmentResponse(response: any): void {
    if (response.succeeded) {
      let fetchedAppointments: Appointment[] = Array.isArray(response.data) ? 
        response.data : 
        (typeof response.data === "object" ? [response.data] : []);

      if (fetchedAppointments.length > 0) {
        this.processAppointments(fetchedAppointments);
        this.checkForUnratedAppointments();
      }
    }
  }

  // In your component where you handle appointments
filterAppointments(appointments: any[]): any[] {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

  return appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.timeSlot.date);
    return appointmentDate >= currentDate;
  });
}


getHistoryAppointments(appointments: any[]): any[] {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  return appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.timeSlot.date);
    return appointmentDate < currentDate;
  });
}


  

  checkForUnratedAppointments(): void {
    const unratedProcessed = this.appointments
      .filter(appt => appt.appointmentStatus_En === 'Finished' && !appt.hasRated)
      .sort((a, b) => new Date(b.timeSlot.date).getTime() - new Date(a.timeSlot.date).getTime());

    if (unratedProcessed.length > 0) {
      const latestUnrated = unratedProcessed[0];
      const feedbackShownKey = `feedbackShown_${latestUnrated.id}`;
      
      // Show modal if:
      // 1. It's the first login after processing AND
      // 2. The feedback modal hasn't been shown for this appointment yet
      if (this.firstLoginAfterProcessing && !localStorage.getItem(feedbackShownKey)) {
        this.showInitialFeedbackModal = true;
        this.currentFeedbackAppointment = latestUnrated;
        localStorage.setItem(feedbackShownKey, 'true');
      }
    }
  }

  processAppointments(fetchedAppointments: Appointment[]): void {
    const clinicIds = Array.from(new Set(fetchedAppointments.map(appt => appt.clinicId)));

    if (clinicIds.length > 0) {
      forkJoin(clinicIds.map(id => this.clinicService.getClinicById(id)))
        .subscribe({
          next: (clinicResponses) => this.processClinics(fetchedAppointments, clinicResponses),
          error: (error) => console.error("Error fetching clinics:", error)
        });
    } else {
      this.initializeAppointments(fetchedAppointments);
    }
  }

  processClinics(fetchedAppointments: Appointment[], clinicResponses: any[]): void {
    clinicResponses.forEach(response => {
      if (response.Succeeded && response.data) {
        this.clinics[response.data.id] = response.data;
      }
    });

    this.initializeAppointments(fetchedAppointments);
  }

  initializeAppointments(fetchedAppointments: Appointment[]): void {
    this.appointments = fetchedAppointments.map(appt => ({
      ...appt,
      clinicName: this.clinics[appt.clinicId]?.name || 'Unknown',
      hasRated: false
    }));

    this.getDoctorInfoForAppointments();
    this.filterAndSortAppointments();
  }

getDoctorInfoForAppointments(): void {
  this.appointments.forEach(ap => {
    this.doctorService.getDoctorsByOptionalParams({ id: ap.doctorId }).subscribe(
      (res) => {
        if (res && res.data && res.data.length > 0) {
          const doctor = res.data.find((d: any) => d.id === ap.doctorId); // find matching doctor
          if (doctor) {
            ap.doctorProfilePicture = doctor.profilePicture;
            ap.doctorName = doctor.firstName + " " +doctor.lastName; 
       

            this.clinicService.getClinicById(doctor.clinicId).subscribe(
              (c) => ap.clinicName = c.data.name
            );
          }
        }
      }
    );
  });
}


  filterAndSortAppointments(): void {
    this.filteredAppointments = this.appointments.filter(
      appt => ['UpComing', 'Arrived', 'NextInQueue', 'InProgress'].includes(appt.appointmentStatus_En)
    );

    this.historyAppointments = this.appointments.filter(
      appt => appt.appointmentStatus_En === 'Finished'
    );

    this.processedAppointments = this.appointments.filter(
      appt => appt.appointmentStatus_En === 'Finished' && !appt.hasRated
    );

    this.appointments.sort(
      (a, b) => new Date(b.timeSlot.date).getTime() - new Date(a.timeSlot.date).getTime()
    );
  }

  openFeedbackModal(appointment: any): void {
    this.currentFeedbackAppointment = appointment;
    this.isFeedbackModalOpen = true;
    this.rating = 0;
    this.comment = '';
  }

  closeFeedbackModal(): void {
    this.isFeedbackModalOpen = false;
    this.showInitialFeedbackModal = false;
    this.currentFeedbackAppointment = null;
  }

  setRating(rating: number): void {
    this.rating = rating;
  }



  getSpecializationName(id: number): void {
    this.specializationService.getSpecializationById(id).subscribe(name => {
      this.specialization = name;
    });
  }

  fetchDoctors(specializationId: number): void {
    if (!isNaN(specializationId)) {
      this.doctorService.getDoctorsBySpecialization(specializationId).subscribe({
        next: (doctors) => {
          this.doctors = doctors;
          this.filteredDoctors = doctors;
          this.fetchClinicsForDoctors();
        },
        error: (error) => console.error("Error fetching doctors:", error)
      });
    }
  }

  fetchClinicsForDoctors(): void {
    const uniqueClinicIds = Array.from(
      new Set(this.doctors.map(d => d.clinicId).filter(id => id))
    );
        
    if (uniqueClinicIds.length > 0) {
      forkJoin(
        uniqueClinicIds.map(clinicId =>
          this.clinicService.getClinicById(clinicId).pipe(
            map(response => {
              this.clinics[response.data.id] = response.data;
            })
          )
        )
      ).subscribe({
        next: () => this.filteredDoctors = [...this.doctors],
        error: (error) => console.error("Error fetching clinics:", error)
      });
    }
  }

  openHistoryModal(): void {
    this.isHistoryModalOpen = true;
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
  }

  openCancelModal(appointmentId: number): void {
    this.selectedAppointmentId = appointmentId;
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
    this.selectedAppointmentId = null;
  }



  reschedule(appointmentId: number, doctorId: number): void {
    this.router.navigate([`/doctor-appointments-reschedual/${doctorId}/-1/-1`], {
      queryParams: { isReschedule: true, appointmentId: appointmentId }
    });
  }

  nextCard(): void {
    if (this.currentIndex < this.appointments.length - 3) {
      this.currentIndex++;
    }
  }

  prevCard(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  submitFeedback(): void {
    if (this.rating === 0) {
      this.toastr.warning(this.translocoService.translate('pHome.feedback.ratingRequired'));
      return;
    }

    const feedbackData = {
      rating: this.rating,
      comment: this.comment,
      appointmentId: this.currentFeedbackAppointment.id,
      doctorId: this.currentFeedbackAppointment.doctorId,
      patientId: this.patient.data.id
    };

    this.feedbackService.createFeedback(feedbackData).subscribe({
      next: () => {
        this.toastr.success(this.translocoService.translate('pHome.feedback.success'));
        this.hasRated = true;
        
        const ratedAppointment = this.appointments.find(
          a => a.id === this.currentFeedbackAppointment.id
        );
        if (ratedAppointment) {
          ratedAppointment.hasRated = true;
        }

        this.closeFeedbackModal();
        this.filterAndSortAppointments();
      },
      error: (err) => {
        this.toastr.error(this.translocoService.translate('pHome.feedback.error'));
      }
    });
  }

  confirmCancel(): void {
    if (this.selectedAppointmentId) {
      this.appointmentService.cancelAppointment(this.selectedAppointmentId).subscribe({
        next: () => {
          this.toastr.success(this.translocoService.translate('pHome.appointments.cancelSuccess'));
          this.appointments = this.appointments.filter((appt) => appt.id !== this.selectedAppointmentId);
          this.filteredAppointments = this.filteredAppointments.filter((appt) => appt.id !== this.selectedAppointmentId);
          this.closeCancelModal();
        },
        error: (err) => {
          this.toastr.error(this.translocoService.translate('pHome.appointments.cancelError'));
          this.closeCancelModal();
        }
      });
    }
  }




}