import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { FormsModule, NgModel } from '@angular/forms';
import { PatientService } from '../../../services/patient.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { DoctorService } from '../../../services/doctor.service';
import { Doctor } from '../../../shared/models/doctor.model';

@Component({
  selector: 'app-new-patient',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SHeaderComponent,
    SSidenavbarComponent,
    TranslocoModule
  ],
  templateUrl: './new-patient.component.html',
  styleUrls: ['./new-patient.component.css']
})
export class NewPatientComponent implements OnInit {
  phoneNumber: string = '';
  patientId: number | null = null;
  isRegistered: boolean | null = null;
  bookingWayId: number | null = null;
  bookingWayName: string | null = null;
  doctorId!: number;

  constructor(
    private patientService: PatientService,
    private doctorService: DoctorService,
    private router: Router,
    private userService: UserService,
    public translocoService: TranslocoService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.bookingWayId = params['bookingWayId'] ? Number(params['bookingWayId']) : null;
      this.bookingWayName = params['bookingWayName'] || null;
    });

    const user: LoginResponse | null = this.userService.getUser();

    if (user?.data.applicationRole_En === 'Secretary') {
      this.doctorService.getDoctorsFromSecretary().subscribe({
        next: (doctor: Doctor) => {
          if (doctor && doctor.id) {
            this.doctorId = doctor.id;
            this.userService.setDoctorIdForSecretary(this.doctorId);
          } else {
            console.warn('No doctor assigned to this secretary.');
          }
        },
        error: (err) => console.error('Error fetching doctor for secretary:', err)
      });
    } else if (user?.data.applicationRole_En === 'Doctor') {
      this.doctorId = user.data.id;
    } else {
      console.error('No valid doctor ID available.');
    }
  }

checkRegistration() {
  if (!this.phoneNumber.match(/^[0-9]{11}$/)) {
    console.warn('Invalid phone number. Must be 11 digits.');
    return;
  }

  this.patientService.checkPatientByPhone(this.phoneNumber).subscribe(
    (response) => {
      if (response.succeeded && response.data > 0) {
        this.patientId = response.data;
        this.isRegistered = true;
      } else {
        this.patientId = null;
        this.isRegistered = false;
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
    if (this.doctorId) {
      this.router.navigate(['/add-patient-phone'], {
        queryParams: {
          docId: this.doctorId,
          phoneNumber: this.phoneNumber,
          bookingWayId: this.bookingWayId,
          bookingWayName: this.bookingWayName
        }
      });
    } else console.error('Doctor ID is not available.');
  }

  goToAppointments() {
    if (this.doctorId && this.patientId) {
      this.router.navigate([`/sec-doctor-appointments/${this.doctorId}/${this.patientId}`], {
        queryParams: {
          bookingWayId: this.bookingWayId,
          bookingWayName: this.bookingWayName
        }
      });
    } else console.error('Doctor ID or Patient ID is not available.');
  }
}
