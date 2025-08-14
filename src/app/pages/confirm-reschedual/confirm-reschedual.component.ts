import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { LoginResponse } from '../../shared/models/login-response';
import { Clinic } from '../../shared/models/clinic.model';
import { Doctor } from '../../shared/models/doctor.model';
import { DoctorService } from '../../services/doctor.service';
import { SpecializationService } from '../../services/specialization.service';
import { UserService } from '../../services/user.service';
import { ClinicService } from '../../services/clinic.service';
import { Appointment, TimeSlot } from '../../shared/models/appointment.model';
import { APIResponse } from '../../shared/models/api-response.dto';
import { BASE_URL } from '../../shared/constants/urls';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { PHeaderComponent } from '../patient/p-header/p-header.component';
import { SideNavbarComponent } from '../patient/side-navbar/side-navbar.component';
import { SHeaderComponent } from "../secretary/s-header/s-header.component";
import { SSidenavbarComponent } from "../secretary/s-sidenavbar/s-sidenavbar.component";
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-confirm-reschedual',
  imports: [CommonModule, RouterModule, PHeaderComponent, FooterComponent, FormsModule, SHeaderComponent, SSidenavbarComponent, TranslocoModule],
  templateUrl: './confirm-reschedual.component.html',
  styleUrl: './confirm-reschedual.component.css'
})
export class ConfirmReschedualComponent implements OnInit {
  patient!: LoginResponse;
  selectedDoctor?: Doctor;
  selectedTimeSlot?: TimeSlot;
  specialization: string = '';
  clinic?: Clinic;
  notes: string = ''; // Stores user input for notes
  BASE_URL = BASE_URL;
  appointmentId!: number; // Add this to store the appointment ID for rescheduling

  constructor(
    private doctorService: DoctorService,
    private specializationService: SpecializationService,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private toastr: ToastrService,
     public translocoService: TranslocoService 
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const doctorId = Number(params['doctorId']);
      const timeSlotId = Number(params['slotId']);
      this.appointmentId = Number(params['appointmentId']); // Get the appointment ID from query params

      console.log("Doctor ID from URL:", doctorId); // Debugging
      console.log("Time Slot ID from URL:", timeSlotId); // Debugging
      console.log("Appointment ID from URL:", this.appointmentId); // Debugging

      if (doctorId) {
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
  }

  getClinicDetails(clinicId: number) {
    this.clinicService.getClinicById(clinicId).subscribe(
      (response: APIResponse<Clinic>) => {
        this.clinic = response.data;
        console.log("Clinic Details:", this.clinic); // Debugging
      },
      (error) => {
        console.error("Error fetching clinic details:", error);
        this.toastr.error("Failed to fetch clinic details.");
      }
    );
  }

  getTimeSlotDetails(timeSlotId: number) {
    this.appointmentService.getTimeSlotById(timeSlotId).subscribe(
      (response: APIResponse<TimeSlot>) => {
        this.selectedTimeSlot = response.data;
        console.log("Selected Time Slot:", this.selectedTimeSlot); // Debugging
      },
      (error) => {
        console.error("Error fetching time slot details:", error);
        this.toastr.error("Failed to fetch time slot details.");
      }
    );
  }

  getDoctorDetails(doctorId: number): void {
    this.doctorService.getDoctorsByOptionalParams({ id: doctorId }).subscribe(
      (response: APIResponse<Doctor[]>) => {
        const doctors = response.data;
        console.log("Doctors fetched from API:", doctors); // Debugging

        // Find the doctor with the matching ID
        const doctor = doctors.find(d => d.id === doctorId);

        if (doctor) {
          this.selectedDoctor = doctor;
          console.log("Selected Doctor:", this.selectedDoctor); // Debugging

          this.specializationService.getSpecializationById(this.selectedDoctor.specializationId).subscribe((name) => {
            this.specialization = name;
            console.log("Specialization:", this.specialization); // Debugging
          });

          this.getClinicDetails(this.selectedDoctor.clinicId);
        } else {
          console.warn("No doctor found for ID:", doctorId);
          this.toastr.warning("No doctor found for the provided ID.");
        }
      },
      (error) => {
        console.error("Error loading doctor details:", error);
        this.toastr.error("Failed to load doctor details.");
      }
    );
  }

  confirmReschedule(): void {
    if (!this.selectedTimeSlot || !this.appointmentId) {
      this.toastr.error("Missing required rescheduling information.", "Rescheduling Failed");
      return;
    }

    const rescheduleData = {
      appointmentId: this.appointmentId,
      newTimeSlotId: this.selectedTimeSlot.id
    };

    console.log("Reschedule Data:", rescheduleData); // Log the payload

    this.appointmentService.rescheduleAppointment(rescheduleData).subscribe({
      next: () => {
        this.toastr.success(this.translocoService.translate('reschedule.successMessage'));
        this.router.navigate(['/patient-home']);
      },
      error: () => {
        this.toastr.error(this.translocoService.translate('reschedule.errorMessage'));
      }
    });
  }
}