import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit, Renderer2, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { RecaptchaFormsModule, RecaptchaModule } from 'ng-recaptcha';
import { HttpClient } from '@angular/common/http';

declare const google: any;


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterModule, 
    CommonModule, 
    HttpClientModule, 
    FormsModule, 
    ReactiveFormsModule, 
    MatSnackBarModule,
    TranslocoModule,
    RecaptchaModule,
    RecaptchaFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private http = inject(HttpClient);
  loginForm!: FormGroup;
  isSubmitted = false;
  returnUrl = '';
  isDarkMode = false;
  currentLang: string = 'en';
  showCaptcha: boolean = false;
  captchaResolved: boolean = false;
  captchaResponse: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private renderer: Renderer2,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {

    this.loadGoogleSignInScript();

    this.loginForm = this.formBuilder.group({
      EmailOrUsernameOrPhone: ['', Validators.required],
      password: ['', Validators.required],
      recaptcha: ['']
    });

    this.returnUrl = this.activatedRoute.snapshot.queryParams['returnUrl'] || '/';
    this.currentLang = this.translocoService.getActiveLang();
    this.applyDarkModePreference();
    this.checkIfCaptchaNeeded();
  }

  private loadGoogleSignInScript(): void {
    // Check if script is already loaded
    if (typeof google !== 'undefined') return;

    const script = this.renderer.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    this.renderer.appendChild(document.head, script);
  }
  loginWithGoogle(): void {
    // Initialize Google Sign-In
    google.accounts.id.initialize({
      client_id: '410166621597-sc6uusdim40vt366k0uvnnsli0c6oqnb.apps.googleusercontent.com', 
      callback: this.handleGoogleSignIn.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // Prompt Google Sign-In
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: render button manually if prompt fails
        google.accounts.id.renderButton(
          document.getElementById('googleLoginButton'),
          { 
            theme: 'outline', 
            size: 'large', 
            text: 'continue_with',
            width: 400 
          }
        );
      }
    });
  }

   private handleGoogleSignIn(response: any): void {
    if (response.credential) {
      // Send token to your backend
      this.http.post('/api/Authentication/loginWithGoogle', {
        googleTokenId: response.credential
      }).subscribe({
        next: (authResponse: any) => {
          // Handle successful login (same as your existing logic)
          localStorage.setItem('failedLoginAttempts', '0');
          this.handleSuccessfulLogin(authResponse);
        },
        error: (error) => {
          console.error('Google login failed:', error);
          this.toastr.error(
            this.translocoService.translate('login.googleLoginFailed'),
            this.translocoService.translate('login.error')
          );
        }
      });
    }
  }

   private handleSuccessfulLogin(response: any): void {
    // Your existing login success logic
    const userRole = response.data.applicationRole_En;
    
    if (userRole === 'Admin') {
      this.router.navigateByUrl('/admin-home');
    } else if (userRole === 'Doctor') {
      this.router.navigateByUrl('/doctor-home');
    } else if (userRole === 'Patient') {
      this.router.navigateByUrl('/patient-home');
    } else if (userRole === 'Secretary') {
      this.router.navigateByUrl('/secretary-home');
    } else {
      this.router.navigateByUrl(this.returnUrl);
    }
  }


  checkIfCaptchaNeeded(): void {
    const failedAttempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
    if (failedAttempts >= 3) {
      this.showCaptcha = true;
      this.loginForm.get('recaptcha')?.setValidators(Validators.required);
      this.loginForm.get('recaptcha')?.updateValueAndValidity();
    }
  }

onCaptchaResolved(response: string | null): void {
  if (response) {
    this.captchaResponse = response;
    this.captchaResolved = true;
    // Remove this line - form control handles it automatically
    // this.loginForm.patchValue({ recaptcha: response });
  } else {
    this.captchaResolved = false;
    this.captchaResponse = '';
    // Remove this line too
    // this.loginForm.patchValue({ recaptcha: '' });
  }
}

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  get fc() {
    return this.loginForm.controls;
  }

  private applyDarkModePreference(): void {
    this.isDarkMode = false;
    this.renderer.removeClass(document.body, 'dark-mode');
    localStorage.removeItem('darkMode');
  }

  submit(): void {
    this.isSubmitted = true;

    if (this.loginForm.invalid) {
      if (this.showCaptcha && this.fc['recaptcha'].invalid) {
        this.toastr.warning(
          this.translocoService.translate('login.captchaVerificationRequired'),
          this.translocoService.translate('login.warning')
        );
      } else {
        this.toastr.warning(
          this.translocoService.translate('login.incompleteFields'),
          this.translocoService.translate('login.warning')
        );
      }
      return;
    }

    const loginData = {
      EmailOrUsernameOrPhone: this.fc['EmailOrUsernameOrPhone'].value,
      password: this.fc['password'].value,
      captcha: this.showCaptcha ? this.fc['recaptcha'].value : null
    };

    this.userService.login(loginData).subscribe({
      next: (response) => {
        localStorage.setItem('failedLoginAttempts', '0');
        
        this.applyDarkModePreference();
        const userRole = response.data.applicationRole_En;
        
        if (userRole === 'Admin') {
          this.router.navigateByUrl('/admin-home');
        } else if (userRole === 'Doctor') {
          this.router.navigateByUrl('/doctor-home');
        } else if (userRole === 'Patient') {
          this.router.navigateByUrl('/patient-home');
        } else if (userRole === 'Secretary') {
          this.router.navigateByUrl('/secretary-home');
        } else {
          console.error('Unexpected user role:', userRole);
          this.router.navigateByUrl(this.returnUrl);
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        
        const failedAttempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0') + 1;
        localStorage.setItem('failedLoginAttempts', failedAttempts.toString());
        
        if (failedAttempts >= 3 && !this.showCaptcha) {
          this.showCaptcha = true;
          this.loginForm.get('recaptcha')?.setValidators(Validators.required);
          this.loginForm.get('recaptcha')?.updateValueAndValidity();
          
          this.toastr.info(
            this.translocoService.translate('login.captchaEnabled'),
            this.translocoService.translate('login.info')
          );
        }
        
        if (error.status === 401) {
          const errorResponse = {
            data: error.error?.data || null,
            statusCode: error.status,
            succeeded: error.error?.succeeded || false,
            message: error.error?.message || this.translocoService.translate('login.errors.unauthorized'),
            errors: error.error?.errors || []
          };
          
          this.toastr.error(
            errorResponse.message,
            this.translocoService.translate('login.errors.unauthorized'),
            {
              timeOut: 10000,
              enableHtml: true
            }
          );
        } else {
          const defaultTitle = this.translocoService.translate('login.errors.errorTitle');
          let errorMessage = '';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          } else {
            errorMessage = this.translocoService.translate('login.errors.generalError');
          }
          
          if (error.status === 0) {
            errorMessage = this.translocoService.translate('login.errors.connectionFailed');
          }
          
          this.toastr.error(
            errorMessage, 
            defaultTitle,
            {
              timeOut: 5000
            }
          );
        }
      }
    });  
  }  
}