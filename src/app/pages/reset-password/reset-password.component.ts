import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ResetPassword } from '../../shared/models/ResetPassword';


@Component({
  selector: 'app-reset-password',
  imports: [RouterModule, CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {

  resetPasswordForm!: FormGroup;
  isSubmitted = false;
  emailToReset!: string;
  emailToken!: string;

  constructor(
    private userService: UserService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.parseQueryParams();
    this.initializeForm();
  }

  private parseQueryParams(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.emailToReset = params['email'] || '';
      const token = params['code'] || '';
      this.emailToken = token.replace(/  /g, '+'); // Correct possible formatting issues
    });
  }

  private initializeForm(): void {
    this.resetPasswordForm = this.formBuilder.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validator: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(formGroup: FormGroup): null | { notMatching: true } {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { notMatching: true };
  }

  get fc() {
    return this.resetPasswordForm.controls;
  }

  submit(): void {
    this.isSubmitted = true;

    if (this.resetPasswordForm.invalid) {
      this.toastr.warning('Please fill out the form correctly.');
      return;
    }

    const resetPasswordPayload: ResetPassword = {
      email: this.emailToReset,
      emailToken: this.emailToken,
      newPassword: this.fc['newPassword'].value,
      confirmPassword: this.fc['confirmPassword'].value
    };

    this.userService.resetPassword(resetPasswordPayload).subscribe({
      next: () => {
        this.toastr.success('Password has been reset successfully.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error(error);
        this.toastr.error('Failed to reset password. Please try again.');
      }
    });
  }
}
