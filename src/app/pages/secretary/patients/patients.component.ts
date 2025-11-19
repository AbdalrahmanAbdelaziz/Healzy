import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { PatientService } from '../../../services/patient.service';
import { UserService } from '../../../services/user.service';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { DoctorService } from '../../../services/doctor.service';
import { take } from 'rxjs/operators';
import { LoginResponse } from '../../../shared/models/login-response';
import { Doctor } from '../../../shared/models/doctor.model';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, RouterModule, SHeaderComponent, FooterComponent, FormsModule, TranslocoModule],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css'],
})
export class PatientsComponent implements OnInit {
  patients: any[] = [];
  filteredPatients: any[] = [];
  searchQuery: string = '';
  doctorId: number | null = null;

  constructor(
    private patientService: PatientService,
    private userService: UserService,
    private doctorService: DoctorService,
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadDoctorIdAndPatients();
  }

  private loadDoctorIdAndPatients(): void {
    const user: LoginResponse | null = this.userService.getUser();
    if (!user) {
      console.error('No user data found.');
      this.toastr.error('User data not found.');
      return;
    }

    if (user.data.applicationRole_En === 'Secretary') {
      // Fetch doctor assigned to the secretary
      this.doctorService.getDoctorsFromSecretary().pipe(take(1)).subscribe({
        next: (doctor: Doctor) => {
          if (doctor && doctor.id) {
            this.doctorId = doctor.id;
            this.userService.setDoctorIdForSecretary(this.doctorId);
            this.fetchPatients();
          } else {
            console.warn('No doctor assigned to this secretary.');
            this.toastr.warning(this.translocoService.translate('errors.noDoctorAssigned'));
          }
        },
        error: (err) => {
          console.error('Error fetching doctor for secretary:', err);
          this.toastr.error(this.translocoService.translate('error.fetch_doctors_failed'));
        },
      });
    } else if (user.data.applicationRole_En === 'Doctor') {
      // Doctor: use own ID
      this.doctorId = user.data.id;
      this.fetchPatients();
    }
  }

  fetchPatients(): void {
    if (!this.doctorId) {
      console.error('Doctor ID is null or undefined');
      return;
    }

    this.patientService.getPatientsByDoctorId(this.doctorId).subscribe({
      next: (response: any) => {
        this.patients = response.data || [];
        this.filteredPatients = this.patients;
      },
      error: (error) => {
        console.error('API Error:', error);
        this.toastr.error('Failed to fetch patients.', 'Error');
      },
    });
  }

  filterPatients(): void {
    this.filteredPatients = this.patients.filter(
      (patient) =>
        patient.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        patient.phoneNumber.includes(this.searchQuery)
    );
  }
}
