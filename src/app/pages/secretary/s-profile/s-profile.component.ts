import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { PatientService } from '../../../services/patient.service';
import { SHeaderComponent } from '../s-header/s-header.component'; 
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { BASE_URL } from '../../../shared/constants/urls';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';



@Component({
  selector: 'app-s-profile',
  imports: [CommonModule, RouterModule, SHeaderComponent, SSidenavbarComponent, FormsModule, ReactiveFormsModule,TranslocoModule],
  templateUrl: './s-profile.component.html',
  styleUrl: './s-profile.component.css'
})
export class SProfileComponent implements OnInit {
  profileForm!: FormGroup;
  BASE_URL = BASE_URL;
  selectedPicture: File | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private patientService: PatientService,
    private toastrService: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.prefillForm();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      phoneNumber: ['', [Validators.required]],
      email: [''],
      profilePicture: [null],
    });
  }

  private prefillForm(): void {
    const user = this.userService.getUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.data.firstName,
        lastName: user.data.lastName,
        username: user.data.username,
        phoneNumber: user.data.phoneNumber,
        email: user.data.email,
        profilePicture: user.data.profilePicture,
      });
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPicture = input.files[0];
  
      // ✅ Create an object URL to update the preview instantly
      const reader = new FileReader();
      reader.onload = () => {
        this.profileForm.patchValue({ profilePicture: reader.result });
      };
      reader.readAsDataURL(this.selectedPicture);
  
      this.profileForm.get('profilePicture')?.updateValueAndValidity();
    }
  }
  

  onSubmit(): void {
    if (this.profileForm.valid) {
      const user = this.userService.getUser();
      if (!user) {
        this.toastrService.error('User not found. Please log in again.');
        return;
      }
  
      const formData = new FormData();
      
      // Append text fields (skip `profilePicture` here)
      Object.entries(this.profileForm.value).forEach(([key, value]) => {
        if (key !== 'profilePicture' && value !== null && value !== undefined && value !== '') {
          formData.append(key, value as string);
        }
      });
  
      // Append `profilePicture` separately if a new file is selected
      if (this.selectedPicture) {
        formData.append('profilePicture', this.selectedPicture);
      }
  
      this.patientService.updatePatientProfile(user.data.id, formData).subscribe({
        next: () => {
          this.toastrService.success('Profile updated successfully');
  
          // Reload the page to fetch the latest data
          window.location.reload();
        },
        error: (err) => {
          this.toastrService.error('Failed to update profile');
          console.error(err);
        },
      });
    } else {
      this.profileForm.markAllAsTouched();
    }
  }

  get formControls() {
    return this.profileForm.controls;
  }
}
