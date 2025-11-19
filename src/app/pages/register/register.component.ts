import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  showPassword = false;
  maxDate: string = '';

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.currentLang = this.translocoService.getActiveLang();

    const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  this.maxDate = `${yyyy}-${mm}-${dd}`;
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  // 🔹 Custom Password Validator
  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    if (!value) return null;

    const errors: any = {};
    if (value.length < 8) {
      errors.minLength = true;
    }
    if (!/[A-Z]/.test(value)) {
      errors.uppercase = true;
    }
    if (!/\d/.test(value)) {
      errors.digit = true;
    }
    if (!/[^a-zA-Z0-9]/.test(value)) {
      errors.nonAlpha = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

private initForm(): void {
  this.registerForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    username: [
      '', 
      [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z0-9]{4,20}$/)
        
        
      ]
    ],
    password: ['', [Validators.required, this.passwordValidator]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    email: ['', [Validators.email]],
    dateOfBirth: ['', [this.dateOfBirthValidator]],
    genderId: [null],
    countryId: [null],
    governorateId: [null],
    districtId: [null],
    profilePicture: [null],
    emergencyContactName: ['', [Validators.maxLength(50)]],
    emergencyContactPhone: ['', [Validators.pattern(/^[0-9]{10,15}$/)]],
    bloodType: ['', [Validators.pattern(/^(A|B|AB|O)[+-]?$/i)]]
  });
}


  private loadLookups(): void {
    this.lookupService.loadGenders().subscribe({
      next: (res: APIResponse<Lookup[]>) => this.genders = res.data,
      error: (err) => {
        let errorMessage = this.translocoService.translate('register.errors.loadGenders');
        if (err.error?.message) errorMessage = err.error.message;
        else if (err.status === 0) errorMessage = this.translocoService.translate('register.errors.connectionFailed');
        this.toastr.error(errorMessage);
      }
    });

    this.lookupService.loadCountries().subscribe({
      next: (res: APIResponse<Lookup[]>) => this.countries = res.data,
      error: (err) => {
        let errorMessage = this.translocoService.translate('register.errors.loadCountries');
        if (err.error?.message) errorMessage = err.error.message;
        else if (err.status === 0) errorMessage = this.translocoService.translate('register.errors.connectionFailed');
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
        let errorMessage = this.translocoService.translate('register.errors.loadGovernorates');
        if (err.error?.message) errorMessage = err.error.message;
        this.toastr.error(errorMessage);
        this.governorates = [];
      }
    });
  }

  updateDistricts(governorateId: string) {
    this.lookupService.loadDistrictsOfGovernorate(Number.parseInt(governorateId)).subscribe({
      next: (res: APIResponse<Lookup[]>) => this.districts = res.data,
      error: (err) => {
        let errorMessage = this.translocoService.translate('register.errors.loadDistricts');
        if (err.error?.message) errorMessage = err.error.message;
        this.toastr.error(errorMessage);
        this.districts = [];
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
        this._router.navigate(['/login']);
      },
      error: (err) => {
        let errorMessage = this.translocoService.translate('register.errors.registrationFailed');
        if (err.error?.errors && Array.isArray(err.error.errors)) {
          err.error.errors.forEach((msg: string) => this.toastr.error(msg));
          return;
        }
        if (err.error?.message) errorMessage = err.error.message;
        else if (err.status === 0) errorMessage = this.translocoService.translate('register.errors.connectionFailed');
        this.toastr.error(errorMessage);
        console.error('Registration error:', err);
      }
    });
  }

  get formControls() {
    return this.registerForm.controls;
  }

  // Custom DOB validator: date cannot be in the future
private dateOfBirthValidator(control: AbstractControl): ValidationErrors | null {
  const selectedDate = new Date(control.value);
  const today = new Date();
  if (control.value && selectedDate > today) {
    return { futureDate: true };
  }
  return null;
}

}
