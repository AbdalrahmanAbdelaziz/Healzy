import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { ServiceOfDoctor } from '../../../services/doctorService.service';
import { Specialization, SpecializationService } from '../../../services/specialization.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-new-service',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    AdminHeaderComponent,
    FormsModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    TranslocoModule
  ],
  templateUrl: './new-service.component.html',
  styleUrls: ['./new-service.component.css']
})
export class NewServiceComponent implements OnInit {
  newService = {
    serviceName: '',
    serviceDescription: '',
    avgDurationInMinutes: 30,
    specializationId: 0
  };
  
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
    this.doctorService.createService(this.newService).subscribe({
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
    if (!this.newService.serviceName.trim()) {
      this.toastr.warning(this.translocoService.translate('validation.service_name_required'));
      return false;
    }
    if (!this.newService.specializationId) {
      this.toastr.warning(this.translocoService.translate('validation.specialization_required'));
      return false;
    }
    if (this.newService.avgDurationInMinutes <= 0) {
      this.toastr.warning(this.translocoService.translate('validation.duration_positive'));
      return false;
    }
    return true;
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