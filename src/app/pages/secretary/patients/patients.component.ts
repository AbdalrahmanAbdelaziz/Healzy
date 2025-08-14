import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { PatientService } from '../../../services/patient.service'; // Import PatientService
import { UserService } from '../../../services/user.service'; // Import UserService
import { FormsModule } from '@angular/forms'; // Import FormsModule for search bar
import { ToastrService } from 'ngx-toastr'; // Import ToastrService for notifications
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, RouterModule, SHeaderComponent, FooterComponent, FormsModule, TranslocoModule],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css'],
})
export class PatientsComponent implements OnInit {
  patients: any[] = []; // Array to store patient data
  filteredPatients: any[] = []; // Array to store filtered patient data
  searchQuery: string = ''; // Search query for filtering patients
  doctorId: number | null = null; // Doctor ID fetched from the login response

  constructor(
    private patientService: PatientService, // Inject PatientService
    private userService: UserService, // Inject UserService
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.fetchDoctorId();
  }

  // Fetch doctorId from the login response
  fetchDoctorId(): void {
    const user = this.userService.getUser();
    console.log('User data:', user); // Debug log
    
    if (user && user.data.applicationRole_En === 'Secretary' && user.data.doctorId) {
      this.doctorId = user.data.doctorId;
      console.log('Doctor ID:', this.doctorId); // Debug log
      this.fetchPatients();
    } else {
      console.error('No doctor ID found for the secretary or user data is invalid');
      this.toastr.error('No doctor ID found for the secretary.', 'Error');
    }
  }
  
  fetchPatients(): void {
    if (!this.doctorId) {
      console.error('Doctor ID is null or undefined');
      return;
    }
  
    console.log('Fetching patients for doctor ID:', this.doctorId); // Debug log
    
    this.patientService.getPatientsByDoctorId(this.doctorId).subscribe({
      next: (response: any) => {
        console.log('API Response:', response); // Debug log
        this.patients = response.data || [];
        this.filteredPatients = this.patients;
      },
      error: (error) => {
        console.error('API Error:', error); // Debug log
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