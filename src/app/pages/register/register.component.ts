import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../services/authentication.service';
import { APIResponse } from '../../shared/models/api-response.dto';
import { RoutesService } from '../../services/routes.service';
import { Router, RouterModule } from '@angular/router';
import { Lookup } from '../../shared/models/lookup.model';
import { LookupsService } from '../../services/lookups.service';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterModule, CommonModule, ReactiveFormsModule, TranslocoModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  private fb = inject(FormBuilder);
  private authService = inject(AuthenticationService);
  private routesService = inject(RoutesService);
  private lookupService = inject(LookupsService);
  private _router = inject(Router);
  private toastr = inject(ToastrService);
  private translocoService = inject(TranslocoService);

  public selectedPicture: File | null = null;
  genders: Lookup[] = [];
  countries: Lookup[] = [];
  governorates: Lookup[] = [];
  districts: Lookup[] = [];
  currentLang: string = 'en';

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.currentLang = this.translocoService.getActiveLang();
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['', [Validators.required]],
      email: [''],
      dateOfBirth: [''],
      genderId: [null],
      countryId: [null],
      governorateId: [null],
      districtId: [null],
      profilePicture: [null],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      bloodType: ['']
    });
  }

 private loadLookups(): void {
  this.lookupService.loadGenders().subscribe({
    next: (res: APIResponse<Lookup[]>) => this.genders = res.data,
    error: (err) => {
      console.error('Error loading genders:', err);
      let errorMessage = this.translocoService.translate('register.errors.loadGenders');
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.status === 0) {
        errorMessage = this.translocoService.translate('register.errors.connectionFailed');
      }
      
      this.toastr.error(errorMessage);
    }
  });

  this.lookupService.loadCountries().subscribe({
    next: (res: APIResponse<Lookup[]>) => this.countries = res.data,
    error: (err) => {
      console.error('Error loading countries:', err);
      let errorMessage = this.translocoService.translate('register.errors.loadCountries');
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.status === 0) {
        errorMessage = this.translocoService.translate('register.errors.connectionFailed');
      }
      
      this.toastr.error(errorMessage);
    }
  });
}

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPicture = input.files[0];
      this.registerForm.patchValue({ profilePicture: this.selectedPicture });
      this.registerForm.get('profilePicture')?.updateValueAndValidity();
    } else {
      this.selectedPicture = null;
    }
  }

  updateGovernorates(countryId: string) {
  this.lookupService.loadGovernoratesOfCountry(Number.parseInt(countryId)).subscribe({
    next: (res: APIResponse<Lookup[]>) => this.governorates = res.data,
    error: (err) => {
      console.error('Error loading governorates:', err);
      let errorMessage = this.translocoService.translate('register.errors.loadGovernorates');
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      }
      this.toastr.error(errorMessage);
      this.governorates = []; // Clear governorates on error
    }
  });
}

updateDistricts(governorateId: string) {
  this.lookupService.loadDistrictsOfGovernorate(Number.parseInt(governorateId)).subscribe({
    next: (res: APIResponse<Lookup[]>) => this.districts = res.data,
    error: (err) => {
      console.error('Error loading districts:', err);
      let errorMessage = this.translocoService.translate('register.errors.loadDistricts');
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      }
      this.toastr.error(errorMessage);
      this.districts = []; // Clear districts on error
    }
  });
}

 onSubmit(): void {
  if (this.registerForm.invalid) {
    this.toastr.warning(
      this.translocoService.translate('register.formErrors.incompleteFields'),
      this.translocoService.translate('register.formErrors.warning')
    );
    this.registerForm.markAllAsTouched();
    return;
  }

  const formValue = { ...this.registerForm.value };
  const filteredFormValue = Object.keys(formValue).reduce((acc, key) => {
    const value = formValue[key];
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as { [key: string]: any });

  const formData = new FormData();
  Object.entries(filteredFormValue).forEach(([key, value]) => {
    if (key !== 'profilePicture') {
      formData.append(key, value as string);
    }
  });

  if (this.selectedPicture) {
    formData.append('profilePicture', this.selectedPicture);
  }

  this.authService.addNewPatient(formData).subscribe({
    next: () => {
      this.toastr.success(this.translocoService.translate('register.success.message'));
      this._router.navigate(['/login']);
    },
    error: (err) => {
      // Modified error handling to show backend message
      let errorMessage = this.translocoService.translate('register.errors.registrationFailed');
      
      // Check if there's a specific error message from the backend
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.status === 0) {
        errorMessage = this.translocoService.translate('register.errors.connectionFailed');
      }
      
      this.toastr.error(errorMessage);
      
      // For debugging purposes, you can also log the full error
      console.error('Registration error:', err);
    },
  });
}

  get formControls() {
    return this.registerForm.controls;
  }
}