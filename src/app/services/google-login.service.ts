// google-login.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/constants/urls';

@Injectable({
  providedIn: 'root'
})
export class GoogleLoginService {

  constructor(private http: HttpClient) { }

  loginWithGoogle(googleTokenId: string): Observable<any> {
    return this.http.post(
      `${BASE_URL}/api/Authentication/loginWithGoogle`,
      { googleTokenId } 
    );
  }
}
