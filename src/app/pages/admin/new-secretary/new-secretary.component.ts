import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { Router, RouterModule } from '@angular/router';
import { Lookup } from '../../../shared/models/lookup.model';
import { LookupsService } from '../../../services/lookups.service';
import { ToastrService } from 'ngx-toastr';
import { AdminHeaderComponent } from "../admin-header/admin-header.component";
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { DoctorService } from '../../../services/doctor.service';

@Component({
  selector: 'app-new-secretary',
  standalone: true,
  imports: [
    RouterModule, 
    CommonModule, 
    ReactiveFormsModule, 
    AdminHeaderComponent,
    TranslocoModule
  ],
  templateUrl: './new-secretary.component.html',
  styleUrls: ['./new-secretary.component.css']
})
export class NewSecretaryComponent implements OnInit {
  secretaryForm!: FormGroup;
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private doctorService = inject(DoctorService);
  private lookupService = inject(LookupsService);
  private _router = inject(Router);
  private toastr = inject(ToastrService);
  private translocoService = inject(TranslocoService);

  selectedPicture: File | null = null;
  genders: Lookup[] = [];
  doctors: any[] = [];
  currentLanguage: string = 'en';

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.initForm();
    this.loadLookups();
  }

  private initForm(): void {
    this.secretaryForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      dateOfBirth: ['', [Validators.required]],
      genderId: ['', [Validators.required]],
      doctorId: ['', [Validators.required]],
      hireDate: ['', [Validators.required]],
      profilePicture: [null]
    });
  }

  private loadLookups(): void {
    this.lookupService.loadGenders().subscribe(
      (res: APIResponse<Lookup[]>) => this.genders = res.data,
      () => this.toastr.error(this.translocoService.translate('errors.failed_load_genders'))
    );

    this.doctorService.getAllDoctors().subscribe({
      next: (res: APIResponse<any[]>) => {
        this.doctors = res.data;
      },
      error: () => {
        this.toastr.error(this.translocoService.translate('errors.failed_load_doctors'));
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPicture = input.files[0];
      this.secretaryForm.patchValue({ profilePicture: this.selectedPicture });
      this.secretaryForm.get('profilePicture')?.updateValueAndValidity();
    } else {
      this.selectedPicture = null;
    }
  }

  onSubmit(): void {
    if (this.secretaryForm.invalid) {
      this.toastr.warning(
        this.translocoService.translate('secretary_form.incomplete_fields_message'),
        this.translocoService.translate('secretary_form.incomplete_fields_title')
      );
      this.secretaryForm.markAllAsTouched();
      return;
    }

    const formValue = { ...this.secretaryForm.value };
    const formData = new FormData();

    Object.entries(formValue).forEach(([key, value]) => {
      if (key !== 'profilePicture' && value !== null && value !== undefined) {
        formData.append(key, value as string);
      }
    });

    if (this.selectedPicture) {
      formData.append('profilePicture', this.selectedPicture);
    }

    this.adminService.createSecretary(formData).subscribe({
      next: () => {
        this.toastr.success(this.translocoService.translate('secretary_form.create_success'));
        this._router.navigate(['/admin/users']);
      },
      error: (err) => {
        this.toastr.error(this.translocoService.translate('secretary_form.create_error'));
        console.error(err);
      }
    });
  }

  get formControls() {
    return this.secretaryForm.controls;
  }

  getTranslatedName(item: any): string {
    return this.currentLanguage === 'ar' ? item.name_Ar : item.name_En;
  }

  getDoctorDisplayName(doctor: any): string {
    const firstName = doctor.firstName || '';
    const lastName = doctor.lastName || '';
    
    
    // Return directly formatted string without translation
    return `Dr. ${firstName} ${lastName}`;
}
}