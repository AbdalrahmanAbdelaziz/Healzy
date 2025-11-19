import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../../services/authentication.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-new-patient-add-phone',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SHeaderComponent,
    SSidenavbarComponent,
    TranslocoModule
  ],
  templateUrl: './new-patient-add-phone.component.html',
  styleUrls: ['./new-patient-add-phone.component.css']
})
export class NewPatientAddPhoneComponent implements OnInit {
  firstName: string = '';
  lastName: string = '';
  username: string = '';
  phoneNumber: string = '';
  docId!: number;
  usernameTouched: boolean = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.docId = +params['docId'];
      this.phoneNumber = params['phoneNumber'] || '';

      if (!this.docId) {
        console.error('No doctor ID found in query parameters.');
      }
    });
  }

  onUsernameBlur(): void {
    this.usernameTouched = true;
  }

  // ✅ Helper used by template
  isValidUsername(username: string): boolean {
    const usernameRegex = /^[A-Za-z0-9]{4,20}$/;
    return usernameRegex.test(username);
  }

  submitAppointment(): void {
    // Required fields
    if (!this.firstName || !this.lastName || !this.username || !this.phoneNumber) {
      this.toastr.warning('Please fill all required fields.');
      return;
    }

    // Username validation
    if (!this.isValidUsername(this.username)) {
      this.toastr.warning(
        'Username must be at least 4 characters, English letters or numbers only, with no spaces.'
      );
      return;
    }

    // Phone validation
    if (!/^[0-9]+$/.test(this.phoneNumber)) {
      this.toastr.warning('Please enter a valid phone number (digits only).');
      return;
    }

    const formData = new FormData();
    formData.append('firstName', this.firstName);
    formData.append('lastName', this.lastName);
    formData.append('username', this.username);
    formData.append('phoneNumber', this.phoneNumber);

    this.authService.addNewPatient(formData).subscribe(
      (response: any) => {
        if (response && response.data) {
          const patientId = response.data.id;
          this.resetForm();
          this.router.navigate([`/sec-doctor-appointments/${this.docId}/${patientId}`]);
        } else {
          this.toastr.error('Failed to retrieve patient ID from the response.');
        }
      },
      (error) => {
        let errorMessage = 'Failed to register patient. Try again.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.toastr.error(errorMessage);
        console.error('Error during patient registration:', error);
      }
    );
  }

  // ✅ Public reset method
  resetForm(): void {
    this.firstName = '';
    this.lastName = '';
    this.username = '';
    this.phoneNumber = '';
    this.usernameTouched = false;
  }
}
