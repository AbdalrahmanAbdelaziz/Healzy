import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { APIResponse } from '../shared/models/api-response.dto';
import { Lookup } from '../shared/models/lookup.model';
import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private _envService = inject(EnvironmentService);
  private _httpClient = inject(HttpClient);

  createDoctor(formData: FormData): Observable<APIResponse<any>> {
    return this._httpClient.post<APIResponse<any>>(
      this._envService.getApiUrl() + '/api/Authentiction/createDoctor',
      formData
    ).pipe(
      catchError((e) => throwError(() => e))
    );
  }

  getAllClinics(): Observable<APIResponse<any[]>> {
    return this._httpClient.get<APIResponse<any[]>>(
      this._envService.getApiUrl() + '/api/Clinic/getAllClinics'
    ).pipe(
      catchError((e) => throwError(() => e))
    );
  }

  getAllSpecializations(): Observable<APIResponse<Lookup[]>> {
    return this._httpClient.get<APIResponse<Lookup[]>>(
      this._envService.getApiUrl() + '/api/Specialization/all'
    ).pipe(
      catchError((e) => throwError(() => e))
    );
  }

  // Add this method to your existing AdminService
createSecretary(formData: FormData): Observable<APIResponse<any>> {
    return this._httpClient.post<APIResponse<any>>(
      this._envService.getApiUrl() + '/api/Authentiction/createSecretary',
      formData
    ).pipe(
      catchError((e) => throwError(() => e))
    );
  }
  
  getAllDoctors(): Observable<APIResponse<any[]>> {
    return this._httpClient.get<APIResponse<any[]>>(
      this._envService.getApiUrl() + '/api/Doctor/all'
    ).pipe(
      catchError((e) => throwError(() => e))
    );
  }

  createClinic(formData: FormData): Observable<APIResponse<any>> {
    return this._httpClient.post<APIResponse<any>>(
      this._envService.getApiUrl() + '/api/Clinic/createClinic',
      formData
    ).pipe(
      catchError((e) => throwError(() => e))
    );
  }
}