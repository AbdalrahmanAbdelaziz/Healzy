import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

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
    TranslocoModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isSubmitted = false;
  returnUrl = '';
  isDarkMode = false;
  currentLang: string = 'en';

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
    this.loginForm = this.formBuilder.group({
      EmailOrUsernameOrPhone: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.returnUrl = this.activatedRoute.snapshot.queryParams['returnUrl'] || '/';
    this.currentLang = this.translocoService.getActiveLang();
    this.applyDarkModePreference();
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
        this.toastr.warning(
            this.translocoService.translate('login.incompleteFields'),
            this.translocoService.translate('login.warning')  // Fixed typo: translate -> translate
        );
        return;
    }

    this.userService.login({
        EmailOrUsernameOrPhone: this.fc['EmailOrUsernameOrPhone'].value,
        password: this.fc['password'].value
    }).subscribe({
        next: (response) => {
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
            }
        },
        error: (error) => {
            console.error('Login error:', error);
            
            // Display the full error response in toastr
            if (error.status === 401) {
                // For 401 errors, show the detailed error response
                const errorResponse = {
                    data: error.error?.data || null,
                    statusCode: error.status,
                    succeeded: error.error?.succeeded || false,
                    message: error.error?.message || this.translocoService.translate('login.errors.unauthorized'),
                    errors: error.error?.errors || []
                };
                
                // Display the backend message as primary content
                this.toastr.error(
                    errorResponse.message, // Show the backend message first
                    this.translocoService.translate('login.errors.unauthorized'), // Translated title
                    {
                        timeOut: 10000,
                      
                        enableHtml: true
                    }
                );
            } else {
                // For other errors, prioritize backend message
                const defaultTitle = this.translocoService.translate('login.errors.errorTitle');
                let errorMessage = '';
                let errorTitle = defaultTitle;
                
                // Priority order for error message:
                if (error.error?.message) {
                    errorMessage = error.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                } else {
                    // errorMessage = this.translocoService.translate('login.errors.generalError');
                }
                
                // Special cases
                if (error.status === 0) {
                    errorMessage = this.translocoService.translate('login.errors.connectionFailed');
                } else if (error.status === 404) {
                    // errorMessage = this.translocoService.translate('login.errors.notFound');
                }
                
                this.toastr.error(
                    errorMessage, 
                    errorTitle,   
                    {
                        timeOut: 5000
                       
                    }
                );
            }
        }
    });  
}  
}