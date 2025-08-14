import { Component, OnInit } from '@angular/core';
import { AppointmentService } from '../../../services/appointment.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PHeaderComponent } from '../p-header/p-header.component';
import { UserService } from '../../../services/user.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-doctor-appointments',
  imports: [CommonModule, RouterModule, PHeaderComponent, SideNavbarComponent, TranslocoModule, FooterComponent ],
  templateUrl: './doctor-appointments.component.html',
  styleUrl: './doctor-appointments.component.css'
})
export class DoctorAppointmentsComponent implements OnInit {
  patient!: LoginResponse;
  availableDays: string[] = [];
  docId!: number;
  specializationId!: number;
  isReschedule = false;
  appointmentId!: number;

  constructor(
    private appointmentService: AppointmentService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }
    });

    // Get parameters and query params
    this.route.paramMap.subscribe(params => {
      this.docId = +params.get('docId')!;
      this.specializationId = +params.get('specializationId')!;

      if (!this.docId) console.error('Doctor ID is missing');
      if (!this.specializationId) console.error('Specialization ID is missing');

      if (this.docId) {
        this.loadAvailableDays();
      }
    });

    // Handle rescheduling params
    this.route.queryParams.subscribe(params => {
      this.isReschedule = params['isReschedule'] === 'true';
      this.appointmentId = +params['appointmentId'] || -1;

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

  goToDayAppointments(selectedDate: string): void {
    if (this.docId && this.specializationId) {
      this.router.navigate(['/appointments', this.docId, this.specializationId, selectedDate], {
        queryParams: this.isReschedule ? { isReschedule: true, appointmentId: this.appointmentId } : {}
      });
    } else {
      console.error('Doctor ID or Specialization ID is not available.');
    }
  }
}
