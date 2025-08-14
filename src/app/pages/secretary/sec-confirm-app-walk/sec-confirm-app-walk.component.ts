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
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { FormsModule } from '@angular/forms';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { BASE_URL } from '../../../shared/constants/urls';
import { ToastrService } from 'ngx-toastr';
import { SHeaderComponent } from '../s-header/s-header.component';
import { PatientService } from '../../../services/patient.service';
import { Patient } from '../../../shared/models/patient';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { BookingWay } from '../../../shared/models/bookingWay';
import { BookingWayService } from '../../../services/booking-way.service';
@Component({
  selector: 'app-sec-confirm-app-walk',
  imports: [CommonModule, RouterModule, SHeaderComponent, FooterComponent, FormsModule, TranslocoModule],

  templateUrl: './sec-confirm-app-walk.component.html',
  styleUrl: './sec-confirm-app-walk.component.css'
})
export class SecConfirmAppWalkComponent implements OnInit {
  doctors: Doctor[] = [];
  selectedDoctor?: Doctor;
  selectedTimeSlot?: TimeSlot;
  specialization: string = '';
  clinic?: Clinic;
  filteredDoctors: Doctor[] = [];
  specializations: { id: number; name: string }[] = [];
  selectedSpecialization: string = '';
  appointments: any[] = [];
  clinics: { [id: number]: string } = {}; 
  specializationId!: number;
  specializationNames: { [key: number]: string } = {};
  doctor!: Doctor;
  notes: string = '';
  BASE_URL = BASE_URL;
  patientId!: number;
  patient!: Patient;
  bookingWayId?: number; // Store the booking way ID

  constructor(
    private doctorService: DoctorService,
    private specializationService: SpecializationService,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private toastr: ToastrService, 
    private patientService: PatientService,
    public translocoService: TranslocoService,
    private bookingWayService: BookingWayService
  ) {}

  ngOnInit(): void {
    this.getWalkInBookingWay(); // Fetch booking way first
    
    this.activatedRoute.queryParams.subscribe(params => {
      console.log("Received Query Params:", params);
      const doctorId = Number(params['doctorId']);
      const timeSlotId = Number(params['slotId']);
      this.patientId = Number(params['patientId']);

      if (doctorId) {
        console.log("Fetching details for Doctor ID:", doctorId);
        this.getDoctorDetails(doctorId);
      }
      if (timeSlotId) {
        this.getTimeSlotDetails(timeSlotId);
      }
      if (this.patientId) {
        this.getPatientDetails(this.patientId);
      }
    });

    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        // Handle user changes if needed
      }
    });
  }

  getWalkInBookingWay(): void {
    this.bookingWayService.getWalkInBookingWay().subscribe(
      (response: APIResponse<BookingWay>) => {
        this.bookingWayId = response.data.id;
        console.log("Booking Way ID:", this.bookingWayId);
      },
      (error) => {
        console.error("Error loading booking way:", error);
        this.toastr.error(this.translocoService.translate('booking.bookingWayError'));
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
    console.log("Fetching details for Doctor ID:", doctorId);

    const requestBody = {
      doctorId: doctorId,
    };

    this.doctorService.getDoctorsByOptionalParams(requestBody).subscribe(
      (response: APIResponse<Doctor[]>) => {
        const doctors = response.data;
        if (doctors.length > 0) {
          this.selectedDoctor = doctors[0];
          console.log("Selected Doctor:", this.selectedDoctor);
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

  getPatientDetails(patientId: number): void {
    this.patientService.getPatientById(patientId).subscribe(
      (response: APIResponse<Patient>) => {
        this.patient = response.data;
        console.log("Patient Details:", this.patient);
      },
      (error) => {
        console.error("Error loading patient details:", error);
      }
    );
  }

  confirmBooking(): void {
    if (!this.selectedDoctor || !this.selectedTimeSlot || !this.clinic || !this.patient || !this.bookingWayId) {
      this.toastr.error("Missing required booking information.", "Booking Failed");
      return;
    }

    if (!this.selectedTimeSlot.id || !this.clinic.id || !this.selectedDoctor.id || !this.patient.id) {
      this.toastr.error("Invalid appointment details. Please try again.", "Booking Failed");
      return;
    }

    const bookingData: Appointment = {
      notes: this.notes,
      timeSlotId: this.selectedTimeSlot.id,
      clinicId: this.clinic.id,
      doctorId: this.selectedDoctor.id,
      patientID: this.patient.id,
      bookingWayId: this.bookingWayId // Include the booking way ID
    };

    console.log("Booking Data:", bookingData);

    this.appointmentService.createAppointment(bookingData).subscribe(
      response => {
        this.toastr.success(
          this.translocoService.translate('booking.successMessage')
        );
        this.router.navigate(['/secretary-home']);
      },
      error => {
        this.toastr.error(
          this.translocoService.translate('booking.errorMessage')
        );
      }
    );
  }
}