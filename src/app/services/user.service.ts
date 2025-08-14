import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { UserLogin } from '../shared/models/login-request.dto';
import { BASE_URL, LOGIN_URL } from '../shared/constants/urls';
import { LoginResponse } from '../shared/models/login-response';
import { APIResponse } from '../shared/models/api-response.dto';
import { ResetPassword } from '../shared/models/ResetPassword';
import { TranslocoService } from '@ngneat/transloco'; 


const USER_KEY = 'User';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject = new BehaviorSubject<LoginResponse | null>(
    this.getUserFromLocalStorage()
  );
  public userObservable = this.userSubject.asObservable();

  constructor(private http: HttpClient, private toaster: ToastrService,  private translocoService: TranslocoService) {}

  login(userLogin: UserLogin): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(LOGIN_URL, userLogin).pipe(
      tap({
        next: (response) => {
          this.setUserToLocalStorage(response);
          this.userSubject.next(response);
          this.toaster.success(
            this.translocoService.translate('auth.welcome', { name: response.data.firstName })
          );
          if (!localStorage.getItem('darkMode')) {
            localStorage.setItem('darkMode', 'false');
          }
        }
      })
    );
  }

  setDarkModePreference(isDarkMode: boolean): void {
    localStorage.setItem('darkMode', isDarkMode.toString());
  }

  getDarkModePreference(): boolean {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? savedMode === 'true' : false; 
  }

logout() {
  this.userSubject.next(null);
  // Clear all user-related data but keep other preferences if needed
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('userRole');
  localStorage.removeItem('doctorId');
  // Explicitly remove dark mode preference to return to default
  localStorage.removeItem('darkMode');
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

  getUserById(userId: number): Observable<APIResponse<LoginResponse>> {
    const url = `${BASE_URL}/api/users/${userId}`;
    return this.http.get<APIResponse<LoginResponse>>(url);
  }

  // ✅ Refresh user data after profile update
  refreshUserData(): Observable<LoginResponse> {
    const user = this.getUser();
    if (!user) return new Observable<LoginResponse>();

    return this.http.get<LoginResponse>(`http://localhost:8585/api/users/${user.data.id}`).pipe(
      tap((updatedUser) => {
        this.setUserToLocalStorage(updatedUser);
        this.userSubject.next(updatedUser); // Update observable
      })
    );
  }


  forgetPassword(email: string): Observable<any> {
    return this.http.post<any>('http://localhost:8585/api/users/forgot-password', { email }).pipe(
      tap({
        next: () => this.toaster.success(
          this.translocoService.translate('auth.resetLinkSent')
        ),
        error: () => this.toaster.error(
          this.translocoService.translate('auth.resetLinkFailed')
        )
      })
    );
  }

  resetPassword(payload: ResetPassword): Observable<any> {
    return this.http.post<any>('http://localhost:8585/api/users/forgot-password', payload).pipe(
      tap({
        next: () => this.toaster.success(
          this.translocoService.translate('auth.resetSuccess')
        ),
        error: () => this.toaster.error(
          this.translocoService.translate('auth.resetFailed')
        )
      })
    );
  }

  
}

