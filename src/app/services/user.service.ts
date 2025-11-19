import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { UserLogin } from '../shared/models/login-request.dto';
import { BASE_URL, LOGIN_URL } from '../shared/constants/urls';
import { LoginResponse } from '../shared/models/login-response';
import { APIResponse } from '../shared/models/api-response.dto';
import { ResetPassword } from '../shared/models/ResetPassword';
import { TranslocoService } from '@ngneat/transloco';
import { Doctor } from '../shared/models/doctor.model';

const USER_KEY = 'User';


@Injectable({
  providedIn: 'root',
})
export class UserService {
  private doctorSpecialization: any | null = null;
private secretaryDoctorId: number | null = null;

  private userSubject = new BehaviorSubject<LoginResponse | null>(
    this.getUserFromLocalStorage()
  );
  public userObservable = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private toaster: ToastrService,
    private translocoService: TranslocoService
    
  ) {}

login(userLogin: UserLogin): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(LOGIN_URL, userLogin).pipe(
    tap({
      next: (response) => {
        this.setUserToLocalStorage(response);
        this.userSubject.next(response);
        this.toaster.success(
          this.translocoService.translate('auth.welcome', { name: response.data.firstName })
        );
        if (!localStorage.getItem('darkMode')) localStorage.setItem('darkMode', 'false');
      }
    }),
    catchError((err) => {
      this.toaster.error(
        this.translocoService.translate('login.errors.unauthorized')
      );
      return throwError(() => err);
    })
  );
}


  logout() {
    this.userSubject.next(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('userRole');
    localStorage.removeItem('doctorId');
    localStorage.removeItem('darkMode');
  }


  setDarkModePreference(isDarkMode: boolean): void {
    localStorage.setItem('darkMode', isDarkMode.toString());
  }

  getDarkModePreference(): boolean {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? savedMode === 'true' : false;
  }

 
  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }


    setUserToLocalStorage(user: LoginResponse) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('userRole', user.data.applicationRole_En);
    if (user.data.applicationRole_En === 'Secretary' && user.data.doctorId) {
      localStorage.setItem('doctorId', user.data.doctorId.toString());
    }
    this.userSubject.next(user);
  }

  getUserFromLocalStorage(): LoginResponse | null {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }



  getUser(): LoginResponse | null {
    return this.getUserFromLocalStorage();
  }

  // ✅ new method for Google login or external set
  setUser(user: LoginResponse) {
    this.setUserToLocalStorage(user);
  }

    setDoctorSpecialization(spec: any) {
    this.doctorSpecialization = spec;
  }

  getDoctorSpecialization(): any | null {
    return this.doctorSpecialization;
  }

  getUserById(userId: number): Observable<APIResponse<LoginResponse>> {
    const url = `${BASE_URL}/api/users/${userId}`;
    return this.http.get<APIResponse<LoginResponse>>(url);
  }

  refreshUserData(): Observable<LoginResponse> {
    const user = this.getUser();
    if (!user) return new Observable<LoginResponse>();

    return this.http.get<LoginResponse>(`${BASE_URL}/api/users/${user.data.id}`).pipe(
      tap((updatedUser) => {
        this.setUserToLocalStorage(updatedUser);
        this.userSubject.next(updatedUser);
      })
    );
  }

  // ✅ Updated forgetPassword method
  forgetPassword(email: string, callbackUrl: string): Observable<any> {
    const body = { email, callbackUrl };
    return this.http.post<any>(`${BASE_URL}/api/Authentication/forgetPassword`, body).pipe(
      tap({
        next: () =>
          this.toaster.success(
            this.translocoService.translate('auth.resetLinkSent')
          ),
        error: () =>
          this.toaster.error(
            this.translocoService.translate('auth.resetLinkFailed')
          ),
      })
    );
  }

resetPassword(email: string, passwordResetToken: string, newPassword: string): Observable<any> {
  const body = { email, passwordResetToken, newPassword };
  return this.http.post<any>(`${BASE_URL}/api/Authentication/resetPassword`, body).pipe(
    tap({
      next: () =>
        this.toaster.success(
          this.translocoService.translate('auth.resetSuccess')
        ),
      error: () =>
        this.toaster.error(
          this.translocoService.translate('auth.resetFailed')
        ),
    })
  );
}



updateUserProfile(profileData: any): Observable<APIResponse<LoginResponse>> {
  const url = `${BASE_URL}/api/User/updateUserProfileid`;

  const formData = new FormData();

  // Append text fields
  formData.append('FirstName', profileData.FirstName);
  formData.append('LastName', profileData.LastName);
  formData.append('Username', profileData.Username);
  formData.append('PhoneNumber', profileData.PhoneNumber);
  formData.append('Email', profileData.Email);
  formData.append('DateOfBirth', profileData.DateOfBirth);

  // Append profile picture (file or existing path)
  if (profileData.ProfilePicture instanceof File) {
    formData.append('ProfilePicture', profileData.ProfilePicture);
  } else {
    formData.append('ProfilePicture', profileData.ProfilePicture || '');
  }

  // Append lookup IDs
  formData.append('GenderId', profileData.GenderId?.toString() || '');
  formData.append('CountryId', profileData.CountryId?.toString() || '');
  formData.append('GovernorateId', profileData.GovernorateId?.toString() || '');
  formData.append('DistrictId', profileData.DistrictId?.toString() || '');

  return this.http.put<APIResponse<LoginResponse>>(url, formData);
}

removeUserProfilePicture(): Observable<APIResponse<any>> {
  const url = `${BASE_URL}/api/User/removeUserProfilePicture`;
  return this.http.delete<APIResponse<any>>(url);
}


setDoctorIdForSecretary(doctorId: number) {
  this.secretaryDoctorId = doctorId;
}

getDoctorIdForSecretary(): number | null {
  return this.secretaryDoctorId;
}


changePassword(currentPassword: string, newPassword: string): Observable<any> {
  const url = `${BASE_URL}/api/Authentication/changePassword`;
  const body = { currentPassword, newPassword };

  return this.http.post<any>(url, body).pipe(
    tap({
      next: () =>
        this.toaster.success(
          this.translocoService.translate('auth.changePasswordSuccess')
        ),
      error: () =>
        this.toaster.error(
          this.translocoService.translate('auth.changePasswordFailed')
        ),
    })
  );
}






}
