import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpecializationService } from '../../../services/specialization.service';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-new-specialization',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminHeaderComponent, ReactiveFormsModule, TranslocoModule],
  templateUrl: './new-specialization.component.html',
  styleUrls: ['./new-specialization.component.css']
})
export class NewSpecializationComponent implements OnInit {
  specializationForm!: FormGroup;
  isSubmitting = false;
  currentLanguage: string = 'en';
  isSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private specializationService: SpecializationService,
    private toastr: ToastrService,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.initForm();
  }

  private initForm(): void {
    this.specializationForm = this.fb.group({
      name_En: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-z\s]+$/) // English only
        ]
      ],
      name_Ar: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[\u0600-\u06FF\s]+$/) // Arabic only
        ]
      ]
    });
  }

  onSubmit(): void {
    this.isSubmitted = true;

    if (this.specializationForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const { name_Ar, name_En } = this.specializationForm.value;

    this.specializationService.createSpecialization(name_Ar, name_En).subscribe({
      next: () => {
        this.toastr.success(this.translocoService.translate('specialization_form.create_success'));
        this.specializationForm.reset();
        this.isSubmitting = false;
        this.isSubmitted = false;
      },
      error: (err) => {
        this.toastr.error(this.translocoService.translate('specialization_form.create_error'));
        console.error('Error creating specialization:', err);
        this.isSubmitting = false;
      }
    });
  }

  get f() {
    return this.specializationForm.controls;
  }
}
