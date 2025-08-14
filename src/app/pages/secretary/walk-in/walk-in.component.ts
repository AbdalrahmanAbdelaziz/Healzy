import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../services/patient.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-walk-in',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SHeaderComponent,
    SSidenavbarComponent,
    TranslocoModule
  ],
  templateUrl: './walk-in.component.html',
  styleUrl: './walk-in.component.css'
})
export class WalkInComponent implements OnInit {
  phoneNumber: string = '';
  patientId: number | null = null;
  isRegistered: boolean | null = null;
  bookingWayId: number | null = null;
  bookingWayName: string | null = null;

  constructor(
    private patientService: PatientService,
    private router: Router,
    private userService: UserService,
    public translocoService: TranslocoService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.bookingWayId = params['bookingWayId'] ? Number(params['bookingWayId']) : null;
      this.bookingWayName = params['bookingWayName'] || null;
      
      console.log('Walk-In Booking Way ID:', this.bookingWayId);
      console.log('Walk-In Booking Way Name:', this.bookingWayName);
    });
  }

  checkRegistration() {
    if (!this.phoneNumber) {
      console.error('Phone number is required.');
      return;
    }

    this.patientService.checkPatientByPhone(this.phoneNumber).subscribe(
      (response) => {
        if (response.succeeded && response.data > 0) {
          this.patientId = response.data;
          this.isRegistered = true;
          console.log('Patient is registered with ID:', this.patientId);
        } else {
          this.patientId = null;
          this.isRegistered = false;
          console.log('Patient is not registered.');
        }
      },
      (error) => {
        console.error('Error checking registration:', error);
        this.isRegistered = false;
        this.patientId = null;
      }
    );
  }

  goToRegister() {
    const user: LoginResponse | null = this.userService.getUser();
    if (user && user.data.doctorId) {
      this.router.navigate(['/add-patient-walk'], {
        queryParams: { 
          docId: user.data.doctorId,
          phoneNumber: this.phoneNumber,
          bookingWayId: this.bookingWayId,
          bookingWayName: this.bookingWayName
        }
      });
    } else {
      console.error('Error: Secretary login response does not contain a doctorId.');
    }
  }

  goToAppointments() {
    const user: LoginResponse | null = this.userService.getUser();
    if (user && user.data.doctorId && this.patientId) {
      this.router.navigate([`/sec-doctor-appointments-walk/${user.data.doctorId}/${this.patientId}`], {
        queryParams: {
          bookingWayId: this.bookingWayId,
          bookingWayName: this.bookingWayName
        }
      });
    } else {
      console.error('Doctor ID or Patient ID is not available.');
    }
  }
}