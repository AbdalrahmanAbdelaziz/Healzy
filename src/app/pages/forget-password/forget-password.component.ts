import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';


@Component({
  selector: 'app-forget-password',
  imports: [RouterModule, CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.css'
})
export class ForgetPasswordComponent implements OnInit {
  forgetPasswordForm!: FormGroup;
  isSubmitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.forgetPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get fc() {
    return this.forgetPasswordForm.controls;
  }

  submit(): void {
    this.isSubmitted = true;

    if (this.forgetPasswordForm.invalid) {
      this.toastr.error('Please enter a valid email address.');
      return;
    }

    const email = this.fc['email'].value;

    this.userService.forgetPassword(email).subscribe({
      next: () => {
        this.toastr.success('Reset link sent to your email.');
      },
      error: () => {
        this.toastr.error('Failed to send reset link. Try again later.');
      }
    });
  }
}
