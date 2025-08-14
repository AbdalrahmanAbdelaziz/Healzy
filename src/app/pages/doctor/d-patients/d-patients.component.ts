import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PatientService } from '../../../services/patient.service'; // Import PatientService
import { UserService } from '../../../services/user.service'; // Import UserService
import { FormsModule } from '@angular/forms'; // Import FormsModule for search bar
import { ToastrService } from 'ngx-toastr';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-d-patients',
  imports: [CommonModule, RouterModule, DHeaderComponent, DSidenavbarComponent, FormsModule, TranslocoModule, FooterComponent],
  templateUrl: './d-patients.component.html',
  styleUrl: './d-patients.component.css'
})
export class DPatientsComponent implements OnInit {
  patients: any[] = []; // Array to store patient data
  filteredPatients: any[] = []; // Array to store filtered patient data
  searchQuery: string = ''; // Search query for filtering patients
  userId: number | null = null; // User ID fetched from the login response

  constructor(
    private patientService: PatientService, 
    private userService: UserService, 
    private toastr: ToastrService,
    public translocoService: TranslocoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchUserId();
  }

  // Fetch userId from the login response
  fetchUserId(): void {
    const user = this.userService.getUser();
    if (user && user.data.id) {
      this.userId = user.data.id; // Use user.data.id instead of user.data.doctorId
      this.fetchPatients();
    } else {
      this.toastr.error('No user ID found.', 'Error');
    }
  }

  // Fetch patients data from the backend
  fetchPatients(): void {
    if (!this.userId) return;

    this.patientService.getPatientsByDoctorId(this.userId).subscribe({
      next: (response: any) => {
        this.patients = response.data || [];
        this.filteredPatients = this.patients; // Initialize filteredPatients with all patients
      },
      error: (error) => {
        this.toastr.error('Failed to fetch patients.', 'Error');
      },
    });
  }

  // Filter patients based on search query
  filterPatients(): void {
    this.filteredPatients = this.patients.filter(
      (patient) =>
        patient.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        patient.phoneNumber.includes(this.searchQuery)
    );
  }

  viewPatientProfile(patientId: number): void {
  this.router.navigate(['/patient', patientId]);
}

  // onFileUpload(event: any, patientId: number): void {
  //   const file = event.target.files[0];
  //   if (file) {
  //     this.patientService.uploadDocument(patientId, file).subscribe({
  //       next: (response: any) => {
  //         this.toastr.success('Document uploaded successfully.', 'Success');
  //         this.fetchPatients(); // Refresh patient data
  //       },
  //       error: (error) => {
  //         this.toastr.error('Failed to upload document.', 'Error');
  //       },
  //     });
  //   }
  // }
}