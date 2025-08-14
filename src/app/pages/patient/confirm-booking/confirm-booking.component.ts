import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { Clinic } from '../../../shared/models/clinic.model';
import { Doctor } from '../../../shared/models/doctor.model';
import { DoctorService } from '../../../services/doctor.service';
import { SpecializationService } from '../../../services/specialization.service';
import { UserService } from '../../../services/user.service';
import { ClinicService } from '../../../services/clinic.service';
import { Appointment, TimeSlot } from '../../../shared/models/appointment.model';
import { forkJoin, map } from 'rxjs';
import { PHeaderComponent } from '../p-header/p-header.component';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { FormsModule } from '@angular/forms';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { BASE_URL } from '../../../shared/constants/urls';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { BookingWayService } from '../../../services/booking-way.service'; // Add this import

@Component({
  selector: 'app-confirm-booking',
  imports: [CommonModule, RouterModule, PHeaderComponent, SideNavbarComponent, FormsModule, TranslocoModule, FooterComponent ],
  templateUrl: './confirm-booking.component.html',
  styleUrl: './confirm-booking.component.css'
})
export class ConfirmBookingComponent implements OnInit {
  patient!: LoginResponse;
  doctors: Doctor[] = [];
  selectedDoctor?: Doctor;
  selectedTimeSlot?: TimeSlot;
  specialization: string = '';
  clinic?: Clinic;
  filteredDoctors: Doctor[] = [];
  specializations: { id: number; name: string }[] = [];
  selectedSpecialization: string = '';
  appointments: any[] = [];
  clinics: { [id: number]: string } = {}; // Store only clinic names
  specializationId!: number;
  specializationNames: { [key: number]: string } = {};
  doctor!: Doctor; // Add this in the class
  notes: string = ''; // Stores user input for notes
  BASE_URL = BASE_URL;
  bookingWayId: number | null = null; // Add this to store booking way ID

  constructor(
    private doctorService: DoctorService,
    private specializationService: SpecializationService,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private toastr: ToastrService,
    public translocoService: TranslocoService,
    private bookingWayService: BookingWayService // Add this
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      console.log("Received Query Params:", params); // Log the received query parameters
      const doctorId = Number(params['doctorId']);
      const timeSlotId = Number(params['slotId']);
  
      if (doctorId) {
        console.log("Fetching details for Doctor ID:", doctorId); // Log the doctorId being used
        this.getDoctorDetails(doctorId);
      }
      if (timeSlotId) {
        this.getTimeSlotDetails(timeSlotId);
      }
    });
  
    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }
    });

    // Get the booking way ID when component initializes
    this.getBookingWayId();
  }

  getBookingWayId(): void {
    this.bookingWayService.getAppBookingWay().subscribe(
      (response: APIResponse<any>) => {
        this.bookingWayId = response.data.id;
      },
      (error) => {
        console.error("Error loading booking way:", error);
        this.toastr.error(
          this.translocoService.translate('booking.bookingWayError'), 
          this.translocoService.translate('booking.errorTitle')
        );
      }
    );
  }

  getClinicDetails(clinicId: number) {
    this.clinicService.getClinicById(clinicId).subscribe(
      (response: APIResponse<Clinic>) => {
        this.clinic = response.data;
      }
    );
  }

  getTimeSlotDetails(timeSlotId: number) {
    this.appointmentService.getTimeSlotById(timeSlotId).subscribe(
      (response: APIResponse<TimeSlot>) => {
        this.selectedTimeSlot = response.data;
      }
    );
  }

  getDoctorDetails(doctorId: number): void {
    console.log("Fetching details for Doctor ID:", doctorId); // Log the doctorId being used

    // Prepare the request body as expected by the backend
    const requestBody = {
      doctorId: doctorId, // Include the doctorId
    };

    this.doctorService.getDoctorsByOptionalParams(requestBody).subscribe(
      (response: APIResponse<Doctor[]>) => {
        const doctors = response.data;
        if (doctors.length > 0) {
          this.selectedDoctor = doctors[0];
          console.log("Selected Doctor:", this.selectedDoctor); // Log the selected doctor
          this.specializationService.getSpecializationById(this.selectedDoctor.specializationId).subscribe((name) => {
            this.specialization = name;
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

  confirmBooking(): void {
    if (!this.selectedDoctor || !this.selectedTimeSlot || !this.clinic || !this.patient) {
      this.toastr.error(
        this.translocoService.translate('booking.missingInfoError'), 
        this.translocoService.translate('booking.errorTitle')
      );
      return;
    }
  
    if (!this.selectedTimeSlot.id || !this.clinic.id || !this.selectedDoctor.id || !this.patient.data.id) {
      this.toastr.error(
        this.translocoService.translate('booking.invalidDetailsError'), 
        this.translocoService.translate('booking.errorTitle')
      );
      return;
    }
  
    if (!this.bookingWayId) {
      this.toastr.error(
        this.translocoService.translate('booking.bookingWayMissingError'), 
        this.translocoService.translate('booking.errorTitle')
      );
      return;
    }
  
    // Create the booking data with type assertion
    const bookingData = {
      notes: this.notes,
      timeSlotId: this.selectedTimeSlot.id,
      clinicId: this.clinic.id,
      doctorId: this.selectedDoctor.id,
      patientID: this.patient.data.id,
      bookingWayId: this.bookingWayId
    } as Appointment; 
  
    this.appointmentService.createAppointment(bookingData).subscribe(
      response => {
        this.toastr.success(
          this.translocoService.translate('booking.successMessage')
        );
        this.router.navigate(['/patient-home']);
      },
      error => {
        this.toastr.error(
          this.translocoService.translate('booking.errorMessage')
        );
      }
    );
  }
}