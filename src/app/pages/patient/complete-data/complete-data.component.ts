import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { PatientService } from '../../../services/patient.service';
import { PHeaderComponent } from '../p-header/p-header.component';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { BASE_URL } from '../../../shared/constants/urls';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-complete-data',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    PHeaderComponent, 
    SideNavbarComponent, 
    FormsModule, 
    ReactiveFormsModule,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './complete-data.component.html',
  styleUrl: './complete-data.component.css',
})
export class CompleteDataComponent implements OnInit {
  profileForm!: FormGroup;
  BASE_URL = BASE_URL;
  selectedPicture: File | null = null;
  currentLang: string = 'en';
  textDirection: 'ltr' | 'rtl' = 'ltr';

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
    this.setupLanguage();

  }

  private setupLanguage(): void {
    this.currentLang = this.translocoService.getActiveLang();
    this.textDirection = this.currentLang === 'ar' ? 'rtl' : 'ltr';
    
    this.translocoService.langChanges$.subscribe(lang => {
      this.currentLang = lang;
      this.textDirection = lang === 'ar' ? 'rtl' : 'ltr';
    });
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
        this.toastrService.error(this.translocoService.translate('errors.userNotFound'));
        return;
      }
  
      const formData = new FormData();
      
      // ✅ Only append text fields (skip `profilePicture` here)
      Object.entries(this.profileForm.value).forEach(([key, value]) => {
        if (key !== 'profilePicture' && value !== null && value !== undefined && value !== '') {
          formData.append(key, value as string);
        }
      });
  
      // ✅ Append `profilePicture` separately if a new file is selected
      if (this.selectedPicture) {
        formData.append('profilePicture', this.selectedPicture);
      }
  
      this.patientService.updatePatientProfile(user.data.id, formData).subscribe({
        next: () => {
          this.toastrService.success(this.translocoService.translate('profile.updateSuccess'));
  
          // ✅ Refresh user data in local storage and UI
          this.userService.refreshUserData().subscribe({
            next: (updatedUser) => {
              this.userService.setUserToLocalStorage(updatedUser);
              this.profileForm.patchValue({ profilePicture: updatedUser.data.profilePicture });
            },
            error: (err) => {
              console.error(err);
              this.toastrService.error(this.translocoService.translate('errors.updateFailed'));
            },
          });
        },
        error: (err) => {
          this.toastrService.error(this.translocoService.translate('errors.updateFailed'));
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
