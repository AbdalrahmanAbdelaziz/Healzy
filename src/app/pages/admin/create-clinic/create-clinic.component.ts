import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { AdminService } from '../../../services/admin.service';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { Router, RouterModule } from '@angular/router';
import { Lookup } from '../../../shared/models/lookup.model';
import { LookupsService } from '../../../services/lookups.service';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-create-clinic',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule
  ],
  templateUrl: './create-clinic.component.html',
  styleUrls: ['./create-clinic.component.css']
})
export class CreateClinicComponent implements OnInit {
  clinicForm!: FormGroup;
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private lookupService = inject(LookupsService);
  private _router = inject(Router);
  private toastr = inject(ToastrService);
  private translocoService = inject(TranslocoService);

  galleryFiles: File[] = [];
  countries: Lookup[] = [];
  governorates: Lookup[] = [];
  districts: Lookup[] = [];
  isLoading = false;
  currentLanguage: string = 'en';

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.initForm();
    this.loadLookups();
  }

  private initForm(): void {
    this.clinicForm = this.fb.group({
      name: ['', [Validators.required]],
      countryId: ['', [Validators.required]],
      governorateId: ['', [Validators.required]],
      districtId: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      gallery: [null]
    });
  }

  private loadLookups(): void {
    this.lookupService.loadCountries().subscribe(
      (res: APIResponse<Lookup[]>) => this.countries = res.data,
      () => this.toastr.error(this.translocoService.translate('errors.failed_load_countries'))
    );
  }

  getTranslatedName(item: Lookup): string {
    return this.currentLanguage === 'ar' ? item.name_Ar : item.name_En;
  }

  onGalleryChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.galleryFiles = Array.from(input.files);
      this.clinicForm.patchValue({ gallery: this.galleryFiles });
    } else {
      this.galleryFiles = [];
    }
  }

  updateGovernorates(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const countryId = selectElement.value;
    
    if (!countryId) {
      this.governorates = [];
      this.districts = [];
      this.clinicForm.patchValue({ governorateId: '', districtId: '' });
      return;
    }
    this.lookupService.loadGovernoratesOfCountry(Number(countryId)).subscribe(
      (res: APIResponse<Lookup[]>) => {
        this.governorates = res.data;
        this.districts = [];
        this.clinicForm.patchValue({ governorateId: '', districtId: '' });
      },
      () => this.toastr.error(this.translocoService.translate('errors.failed_load_governorates'))
    );
  }

  updateDistricts(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const governorateId = selectElement.value;
    
    if (!governorateId) {
      this.districts = [];
      this.clinicForm.patchValue({ districtId: '' });
      return;
    }
    this.lookupService.loadDistrictsOfGovernorate(Number(governorateId)).subscribe(
      (res: APIResponse<Lookup[]>) => this.districts = res.data,
      () => this.toastr.error(this.translocoService.translate('errors.failed_load_districts'))
    );
  }

  onSubmit(): void {
    if (this.clinicForm.invalid) {
      this.toastr.warning(
        this.translocoService.translate('clinic_form.incomplete_fields_message'),
        this.translocoService.translate('clinic_form.incomplete_fields_title')
      );
      this.clinicForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = new FormData();

    Object.entries(this.clinicForm.value).forEach(([key, value]) => {
      if (key !== 'gallery' && value !== null && value !== undefined) {
        formData.append(key, value as string);
      }
    });

    this.galleryFiles.forEach((file) => {
      formData.append(`gallery`, file, file.name);
    });

    this.adminService.createClinic(formData).subscribe({
      next: () => {
        this.toastr.success(this.translocoService.translate('clinic_form.create_success'));
        this._router.navigate(['/admin/clinics']);
      },
      error: (err) => {
        this.toastr.error(this.translocoService.translate('clinic_form.create_error'));
        console.error(err);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  get formControls() {
    return this.clinicForm.controls;
  }

  removeGalleryFile(index: number): void {
    this.galleryFiles.splice(index, 1);
  }
}