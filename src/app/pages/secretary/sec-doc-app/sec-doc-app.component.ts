import { Component, OnInit } from '@angular/core';
import { AppointmentService } from '../../../services/appointment.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { SHeaderComponent } from '../s-header/s-header.component';
import { PatientService } from '../../../services/patient.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-sec-doc-app',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    SHeaderComponent, 
    SSidenavbarComponent,
    TranslocoModule
  ],
  templateUrl: './sec-doc-app.component.html',
  styleUrl: './sec-doc-app.component.css'
})
export class SecDocAppComponent implements OnInit {
  availableDays: string[] = [];
  docId!: number;
  isReschedule = false;
  appointmentId!: number;
  patientId!: number;
  bookingWayId: number | null = null;
  bookingWayName: string | null = null;

  constructor(
    private appointmentService: AppointmentService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private patientService: PatientService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        // Handle user changes if needed
      }
    });

    this.route.paramMap.subscribe(params => {
      this.docId = +params.get('docId')!;
      this.patientId = +params.get('patientId')!;

      console.log('Doctor ID:', this.docId);
      console.log('Patient ID:', this.patientId);

      if (!this.docId) console.error('Doctor ID is missing');
      if (!this.patientId) console.error('Patient ID is missing');

      if (this.docId) {
        this.loadAvailableDays();
      }

      if (this.patientId) {
        this.loadPatientDetails(this.patientId);
      }
    });

    this.route.queryParams.subscribe(params => {
      this.isReschedule = params['isReschedule'] === 'true';
      this.appointmentId = +params['appointmentId'] || -1;
      this.bookingWayId = params['bookingWayId'] ? Number(params['bookingWayId']) : null;
      this.bookingWayName = params['bookingWayName'] || null;

      console.log('Reschedule Flag:', this.isReschedule);
      console.log('Appointment ID:', this.appointmentId);
      console.log('Booking Way ID:', this.bookingWayId);
      console.log('Booking Way Name:', this.bookingWayName);

      if (this.isReschedule) {
        console.log(`Rescheduling Appointment ID: ${this.appointmentId}`);
      }
    });
  }

  loadAvailableDays(): void {
    const numberOfRequiredDays = 14;

    this.appointmentService.getAvailableDays(this.docId, numberOfRequiredDays).subscribe(
      (response) => {
        this.availableDays = response.data.workingDays || [];
      },
      (error) => {
        console.error('Error loading available days:', error);
      }
    );
  }

  loadPatientDetails(patientId: number): void {
    this.patientService.getPatientById(patientId).subscribe(
      (response) => {
        console.log('Patient Details:', response);
      },
      (error) => {
        console.error('Error loading patient details:', error);
      }
    );
  }

  goToDayAppointments(selectedDate: string): void {
    if (this.docId && this.patientId) {
      this.router.navigate(['/sec-appointments', this.docId, selectedDate], {
        queryParams: {
          isReschedule: this.isReschedule ? 'true' : 'false',
          appointmentId: this.appointmentId,
          patientId: this.patientId,
          bookingWayId: this.bookingWayId,
          bookingWayName: this.bookingWayName
        }
      });
    } else {
      console.error('Doctor ID or Patient ID is not available.');
      console.log('Doctor ID:', this.docId);
      console.log('Patient ID:', this.patientId);
    }
  }
}