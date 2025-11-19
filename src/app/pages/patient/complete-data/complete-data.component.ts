import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { PHeaderComponent } from '../p-header/p-header.component';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { BASE_URL } from '../../../shared/constants/urls';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { Lookup } from '../../../shared/models/lookup.model';
import { LookupsService } from '../../../services/lookups.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { SHeaderComponent } from '../../secretary/s-header/s-header.component';
import { DHeaderComponent } from '../../doctor/d-header/d-header.component';
import { AdminHeaderComponent } from '../../admin/admin-header/admin-header.component';

@Component({
  selector: 'app-complete-data',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PHeaderComponent,
    ReactiveFormsModule,
    TranslocoModule,
    SHeaderComponent,
    DHeaderComponent,
    AdminHeaderComponent
  ],
  templateUrl: './complete-data.component.html',
  styleUrls: ['./complete-data.component.css'],
})
export class CompleteDataComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  BASE_URL = BASE_URL;
  selectedPicture: File | null = null;
  currentLang: string = 'en';
  textDirection: 'ltr' | 'rtl' = 'ltr';
  originalValues: any = {};
  maxDate: string = '';
  userRole: string | null = null;

  genderList: Lookup[] = [];
  countryList: Lookup[] = [];
  governorateList: Lookup[] = [];
  districtList: Lookup[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private lookupService: LookupsService,
    private toastrService: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.maxDate = new Date().toISOString().split('T')[0];
    this.initForms();
    this.prefillForm();
    this.setupLanguage();
    this.loadLookups();

    const currentUser = this.userService.getUserFromLocalStorage();
    if (currentUser?.data?.applicationRole_En) {
      this.userRole = currentUser.data.applicationRole_En;
    }
  }

  private setupLanguage(): void {
    this.currentLang = this.translocoService.getActiveLang();
    this.textDirection = this.currentLang === 'ar' ? 'rtl' : 'ltr';

    this.translocoService.langChanges$.subscribe((lang) => {
      this.currentLang = lang;
      this.textDirection = lang === 'ar' ? 'rtl' : 'ltr';
      this.prefillForm();
    });
  }

  private initForms(): void {
    // Profile Form
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(4)]],
      phoneNumber: ['', Validators.required],
      email: ['', [Validators.email]],
      profilePicture: [null],
      dateOfBirth: [''],
      genderId: [null],
      countryId: [null],
      governorateId: [null],
      districtId: [null],
    });

    // Password Form
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  // Custom validator: newPassword === confirmPassword
  private passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword
      ? { passwordsMismatch: true }
      : null;
  };

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
        dateOfBirth: user.data.dateOfBirth,
        genderId: user.data.genderId ? Number(user.data.genderId) : null,
        countryId: user.data.countryId ? Number(user.data.countryId) : null,
        governorateId: user.data.governorateId ? Number(user.data.governorateId) : null,
        districtId: user.data.districtId ? Number(user.data.districtId) : null,
      });

      this.originalValues = { ...this.profileForm.value };

      if (user.data.countryId) this.updateGovernorates(user.data.countryId.toString(), false);
      if (user.data.governorateId) this.updateDistricts(user.data.governorateId.toString(), false);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPicture = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.profileForm.patchValue({ profilePicture: reader.result });
      };
      reader.readAsDataURL(this.selectedPicture);
    }
  }

  private loadLookups(): void {
    this.lookupService.loadGenders().subscribe({
      next: (res) => (this.genderList = res.data),
      error: () => this.toastrService.error(this.translocoService.translate('errors.loadGenders')),
    });

    this.lookupService.loadCountries().subscribe({
      next: (res) => (this.countryList = res.data),
      error: () => this.toastrService.error(this.translocoService.translate('errors.loadCountries')),
    });
  }

  updateGovernorates(countryId: string, resetDistricts = true) {
    this.lookupService.loadGovernoratesOfCountry(Number(countryId)).subscribe({
      next: (res) => {
        this.governorateList = res.data;
        if (resetDistricts) {
          this.districtList = [];
          this.profileForm.patchValue({ governorateId: null, districtId: null });
        }
      },
      error: () => {
        this.toastrService.error(this.translocoService.translate('errors.loadGovernorates'));
        this.governorateList = [];
      },
    });
  }

  updateDistricts(governorateId: string, reset = true) {
    this.lookupService.loadDistrictsOfGovernorate(Number(governorateId)).subscribe({
      next: (res) => {
        this.districtList = res.data;
        if (reset) this.profileForm.patchValue({ districtId: null });
      },
      error: () => {
        this.toastrService.error(this.translocoService.translate('errors.loadDistricts'));
        this.districtList = [];
      },
    });
  }

  onSubmit(): void {
  if (!this.profileForm.valid) {
    this.profileForm.markAllAsTouched();
    return;
  }

  const user = this.userService.getUser();
  if (!user) return;

  const updatedFields: any = {
    FirstName: this.profileForm.value.firstName || user.data.firstName,
    LastName: this.profileForm.value.lastName || user.data.lastName,
    Username: this.profileForm.value.username || user.data.username,
    PhoneNumber: this.profileForm.value.phoneNumber || user.data.phoneNumber,
    Email: this.profileForm.value.email || user.data.email,
    DateOfBirth: this.profileForm.value.dateOfBirth || user.data.dateOfBirth,
    ProfilePicture: this.selectedPicture ? this.selectedPicture : user.data.profilePicture,
    GenderId: this.profileForm.value.genderId || user.data.genderId,
    CountryId: this.profileForm.value.countryId || user.data.countryId,
    GovernorateId: this.profileForm.value.governorateId || user.data.governorateId,
    DistrictId: this.profileForm.value.districtId || user.data.districtId,
  };

  this.userService.updateUserProfile(updatedFields).subscribe({
    next: (response) => {
      if (response.succeeded) {
        this.toastrService.success(this.translocoService.translate('profile.updateSuccess'));
        const currentUser = this.userService.getUser();
        if (currentUser) {
          const mergedUser: LoginResponse = {
            ...currentUser,
            data: { ...currentUser.data, ...response.data },
          };
          this.userService.setUserToLocalStorage(mergedUser);
          this.originalValues = { ...this.profileForm.value };
        }
      } else {
        this.toastrService.error(this.translocoService.translate('errors.updateFailed'));
      }
    },
    error: (err) => {
      if (err.error?.errors) {
        // Loop through all validation error fields
        for (const field in err.error.errors) {
          if (err.error.errors.hasOwnProperty(field)) {
            const messages = err.error.errors[field];
            messages.forEach((msg: string) => {
              this.toastrService.error(msg);
            });
          }
        }
      } else if (err.error?.title) {
        // Fallback: show title from backend if available
        this.toastrService.error(err.error.title);
      } else {
        // Default generic error
        this.toastrService.error(this.translocoService.translate('errors.updateFailed'));
      }
    },
  });
}


  onChangePassword(): void {
    if (!this.passwordForm.valid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.userService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordForm.reset();
      },
    });
  }

  get formControls() {
    return this.profileForm.controls;
  }

  get passwordControls() {
    return this.passwordForm.controls;
  }

  removeProfilePicture(): void {
    this.userService.removeUserProfilePicture().subscribe({
      next: (response) => {
        if (response.succeeded) {
          this.toastrService.success(this.translocoService.translate('profile.pictureRemoved'));
          const currentUser = this.userService.getUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              data: { ...currentUser.data, profilePicture: null },
            };
            this.userService.setUserToLocalStorage(updatedUser);
            this.profileForm.patchValue({ profilePicture: null });
          }
        } else {
          this.toastrService.error(this.translocoService.translate('errors.updateFailed'));
        }
      },
      error: () => this.toastrService.error(this.translocoService.translate('errors.updateFailed')),
    });
  }
}
