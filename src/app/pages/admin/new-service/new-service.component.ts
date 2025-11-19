import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { Service, ServiceOfDoctor } from '../../../services/doctorService.service';
import { Specialization, SpecializationService } from '../../../services/specialization.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TruncatePipe } from '../../../shared/constants/truncate.pipe';
import { LocalizedFieldPipe } from '../../../services/localized-field.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-new-service',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminHeaderComponent,
    LoadingSpinnerComponent,
    TruncatePipe,
    TranslocoModule,
    LocalizedFieldPipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './new-service.component.html',
  styleUrls: ['./new-service.component.css']
})
export class NewServiceComponent implements OnInit {
  newService: Partial<Service> = {
    serviceName: '',
    serviceDescription: '',
    avgDurationInMinutes: 0,
    specializationId: 0
  };

  submitted = false;
  errors: { [key: string]: string } = {};
  
  specializations: Specialization[] = [];
  isLoading = false;
  isSubmitting = false;
  currentLanguage: string = 'en';

  constructor(
    private doctorService: ServiceOfDoctor,
    private specializationService: SpecializationService,
    private toastr: ToastrService,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.loadSpecializations();
  }

  getTranslatedName(spec: Specialization): string {
    return this.currentLanguage === 'ar' ? spec.name_Ar : spec.name_En;
  }

  loadSpecializations(): void {
    this.isLoading = true;
    this.specializationService.getAllSpecializations().subscribe({
      next: (response) => {
        if (response.succeeded) {
          this.specializations = response.data;
        } else {
          this.toastr.error(
            response.message || this.translocoService.translate('errors.failed_load_specializations')
          );
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.toastr.error(this.translocoService.translate('errors.load_specializations_error'));
        this.isLoading = false;
      }
    });
  }

  

  onSubmit(): void {
  if (!this.validateForm()) return;

  this.isSubmitting = true;

  // Cast to CreateServiceRequest (because validation guarantees all fields exist)
  const payload = this.newService as Required<Service>;

  this.doctorService.createService(payload).subscribe({
    next: (response) => {
      const success = response.Succeeded || response.succeeded;
      const message = response.Message || response.message || response.data;
      
      if (success) {
        this.toastr.success(message || this.translocoService.translate('service_form.create_success'));
        this.resetForm();
      } else {
        this.toastr.error(message || this.translocoService.translate('service_form.create_error'));
      }
      this.isSubmitting = false;
    },
    error: (err) => {
      this.toastr.error(this.translocoService.translate('errors.service_creation_error'));
      console.error('Error:', err);
      this.isSubmitting = false;
    }
  });
}

  validateForm(): boolean {
    this.errors = {};
    this.submitted = true;

    if (!this.newService.serviceName || this.newService.serviceName.trim() === '') {
      this.errors['serviceName'] = this.translocoService.translate('services.errors.name_required');
    } else if (this.newService.serviceName.length < 3) {
      this.errors['serviceName'] = this.translocoService.translate('services.errors.name_min');
    }

    if (!this.newService.serviceDescription || this.newService.serviceDescription.trim() === '') {
      this.errors['serviceDescription'] = this.translocoService.translate('services.errors.description_required');
    } else if (this.newService.serviceDescription.length < 10) {
      this.errors['serviceDescription'] = this.translocoService.translate('services.errors.description_min');
    }

    if (!this.newService.avgDurationInMinutes || this.newService.avgDurationInMinutes <= 0) {
      this.errors['avgDurationInMinutes'] = this.translocoService.translate('services.errors.duration_required');
    }

    if (!this.newService.specializationId || this.newService.specializationId === 0) {
      this.errors['specializationId'] = this.translocoService.translate('services.errors.specialization_required');
    }

    return Object.keys(this.errors).length === 0;
  }


   saveService(): void {
    if (!this.validateForm()) {
      return;
    }

    // TODO: Call backend API to save service
    this.toastr.success(
      this.translocoService.translate('services.messages.create_success'),
      this.translocoService.translate('services.title')
    );

    // Reset form
    this.newService = { serviceName: '', serviceDescription: '', avgDurationInMinutes: 0, specializationId: 0 };
    this.submitted = false;
  }

  hasError(field: string): boolean {
    return this.submitted && !!this.errors[field];
  }

  getError(field: string): string {
    return this.errors[field] || '';
  }

  resetForm(): void {
    this.newService = {
      serviceName: '',
      serviceDescription: '',
      avgDurationInMinutes: 30,
      specializationId: 0
    };
  }
}