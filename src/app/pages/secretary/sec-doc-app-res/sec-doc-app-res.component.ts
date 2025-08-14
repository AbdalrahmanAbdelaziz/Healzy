import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { UserService } from '../../../services/user.service';
import { DoctorService } from '../../../services/doctor.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { PHeaderComponent } from '../../patient/p-header/p-header.component';
import { SideNavbarComponent } from '../../patient/side-navbar/side-navbar.component';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { DHeaderComponent } from '../../doctor/d-header/d-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';


@Component({
  selector: 'app-sec-doc-app-res',
  imports: [CommonModule, RouterModule, SHeaderComponent, SSidenavbarComponent, DHeaderComponent, PHeaderComponent, TranslocoModule, FooterComponent],
  templateUrl: './sec-doc-app-res.component.html',
  styleUrl: './sec-doc-app-res.component.css'
})
export class SecDocAppResComponent implements OnInit {
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
      this.router.navigate(['/sec-appointments-reschedual', this.docId, this.specializationId, selectedDate], {
        queryParams: this.isReschedule ? { isReschedule: true, appointmentId: this.appointmentId } : {}
      });
    } else {
      console.error('Doctor ID or Specialization ID is not available.');
    }
  }
}
