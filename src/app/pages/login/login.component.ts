import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit, Renderer2, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { RecaptchaFormsModule, RecaptchaModule } from 'ng-recaptcha';
import { GoogleLoginService } from '../../services/google-login.service';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';


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
  showPassword: boolean = false;
  isMobileApp = false;
  googleLoaded = false;

  // ✅ Client IDs
  private readonly WEB_CLIENT_ID = '410166621597-sc6uusdim40vt366k0uvnnsli0c6oqnb.apps.googleusercontent.com';
  private readonly ANDROID_CLIENT_ID = '410166621597-mkhbeakcj21k6tmjbv11psvfprtut915.apps.googleusercontent.com';

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private googleLoginService: GoogleLoginService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private renderer: Renderer2,
    private translocoService: TranslocoService,
    
  ) {}

  ngOnInit(): void {
    this.isMobileApp = Capacitor.isNativePlatform();
    console.log('GOOGLE_LOGIN: App initialized. Is mobile?', this.isMobileApp);

    if (!this.isMobileApp) {
      console.log('GOOGLE_LOGIN: Loading Google Sign-In script for web...');
      this.loadGoogleSignInScript();
    } else {
      try {
        console.log('GOOGLE_LOGIN: Initializing GoogleAuth (native) with Android client ID...');
        GoogleAuth.initialize({
          clientId: this.ANDROID_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: true
        });
      } catch (err) {
        console.error('GOOGLE_LOGIN: GoogleAuth.initialize() failed (native):', err);
      }
    }

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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private loadGoogleSignInScript(): void {
    if (document.getElementById('google-gsi-script')) return;

    const script = this.renderer.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('GOOGLE_LOGIN: Google script loaded successfully ✅');
      this.googleLoaded = true;
      this.webGoogleLogin();
    };
    script.onerror = (ev: any) => {
      console.error('GOOGLE_LOGIN: Failed to load Google script ❌', ev);
      this.toastr.error('Google Sign-In script failed to load.', 'Error');
    };
    this.renderer.appendChild(document.head, script);
  }

  googleLogin(): void {
    console.log('GOOGLE_LOGIN: Google login button clicked.');
    if (this.isMobileApp) {
      this.nativeGoogleLogin();
    } else {
      this.webGoogleLogin();
    }
  }

  private webGoogleLogin(): void {
    if (typeof google === 'undefined') {
      console.error('GOOGLE_LOGIN: Google script not loaded.');
      this.toastr.error('Google script not loaded.', 'Error');
      return;
    }

    try {
      console.log('GOOGLE_LOGIN: Initializing web Google sign-in...');
      google.accounts.id.initialize({
        client_id: this.WEB_CLIENT_ID,
        callback: this.handleGoogleSignIn.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      const btnContainer = document.getElementById('googleLoginButton');
      if (btnContainer) {
        btnContainer.innerHTML = '';
        google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 400
        });
      }

      google.accounts.id.prompt();
      this.googleLoaded = true;
      console.log('GOOGLE_LOGIN: Google sign-in initialized (web).');
    } catch (err) {
      console.error('GOOGLE_LOGIN: webGoogleLogin() failed ❌', err);
      this.toastr.error('Google login initialization failed.', 'Error');
    }
  }

  private async nativeGoogleLogin() {
    try {
      console.log('GOOGLE_LOGIN: Attempting native Google sign-in...');
      const googleUser = await GoogleAuth.signIn();
      console.log('GOOGLE_LOGIN: Google user info received:', googleUser);

      const idToken = googleUser?.authentication?.idToken;
      if (!idToken) {
        console.error('GOOGLE_LOGIN: Missing idToken ❌');
        this.toastr.error('Login failed: No token received.', 'Error');
        return;
      }

      console.log('GOOGLE_LOGIN: Sending token to backend...');
      this.googleLoginService.loginWithGoogle(idToken).subscribe({
        next: (res) => {
          console.log('GOOGLE_LOGIN: Server login success ✅', res);
          this.userService.setUser(res);
          this.handleSuccessfulLogin(res);
        },
        error: (err) => {
          console.error('GOOGLE_LOGIN: Server login failed ❌', err);
          this.toastr.error('Google login failed on server.', 'Error');
        }
      });
    } catch (error: any) {
      console.error('GOOGLE_LOGIN: Native sign-in failed ❌', error);
      if (error?.error === 'popup_closed_by_user') {
        this.toastr.info('Login cancelled by user.', 'Info');
      } else {
        this.toastr.error('Google login failed. Check Logcat for details.', 'Error');
      }
    }
  }

  handleGoogleSignIn(response: any) {
    console.log('GOOGLE_LOGIN: Google sign-in response (web):', response);

    const googleTokenId = response?.credential;
    if (!googleTokenId) {
      console.error('GOOGLE_LOGIN: No credential returned ❌', response);
      this.toastr.error('Google login failed: No token received.', 'Error');
      return;
    }

    console.log('GOOGLE_LOGIN: Sending token to backend...');
    this.googleLoginService.loginWithGoogle(googleTokenId).subscribe({
      next: (res) => {
        console.log('GOOGLE_LOGIN: Server response success ✅', res);
        this.userService.setUser(res);
        this.handleSuccessfulLogin(res);
      },
      error: (err) => {
        console.error('GOOGLE_LOGIN: Server response error ❌', err);
        this.toastr.error('Google login failed on server.', 'Error');
      }
    });
  }

  private handleSuccessfulLogin(response: any): void {
    console.log('GOOGLE_LOGIN: Handling successful login:', response);
    const userRole = response?.data?.applicationRole_En;
    const storedReturnUrl = this.activatedRoute.snapshot.queryParams['returnUrl'];

    let targetUrl = storedReturnUrl || '/';
    if (!storedReturnUrl) {
      if (userRole === 'Admin') targetUrl = '/admin-home';
      else if (userRole === 'Doctor') targetUrl = '/doctor-home';
      else if (userRole === 'Patient') targetUrl = '/patient-home';
      else if (userRole === 'Secretary') targetUrl = '/secretary-home';
    }

    console.log('GOOGLE_LOGIN: Navigating to', targetUrl);
    this.router.navigate([targetUrl], { replaceUrl: true });
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
    this.captchaResponse = response || '';
    this.captchaResolved = !!response;
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
    if (this.loginForm.invalid) return;

    const loginData = {
      EmailOrUsernameOrPhone: this.fc['EmailOrUsernameOrPhone'].value,
      password: this.fc['password'].value,
      captcha: this.showCaptcha ? this.fc['recaptcha'].value : null
    };

    this.userService.login(loginData).subscribe({
      next: (response) => {
        this.userService.setUser(response);
        this.handleSuccessfulLogin(response);
      },
      error: (error) => console.error('GOOGLE_LOGIN: Normal login failed ❌', error)
    });
  }

  logout(): void {
    console.log('GOOGLE_LOGIN: Logging out user...');
    this.userService.logout();
    localStorage.removeItem('user');
  }
}
