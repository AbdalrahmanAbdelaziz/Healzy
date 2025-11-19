import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password',
  imports: [RouterModule, CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  resetPasswordForm!: FormGroup;
  isSubmitted = false;
  passwordResetToken!: string;

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
    const token = params['token'];  // <-- use 'token' not 'code'
    if (token) {
      // decode URI components in case + or %20 were replaced
      this.passwordResetToken = decodeURIComponent(token.replace(/ /g, '+'));
    }
  });
}


  private initializeForm(): void {
    this.resetPasswordForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
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

    if (!this.passwordResetToken) {
      // Only show toast here on submit if token is missing
      this.toastr.error('Reset token is missing. Please use the link from your email.');
      return;
    }

    const email = this.fc['email'].value;
    const newPassword = this.fc['newPassword'].value;

    this.userService.resetPassword(email, this.passwordResetToken, newPassword).subscribe({
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
