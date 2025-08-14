import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Clinic } from '../shared/models/clinic.model';
import { BASE_URL } from '../shared/constants/urls';
import { APIResponse } from '../shared/models/api-response.dto';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private baseUrl = BASE_URL + '/api/Clinic';

  constructor(private http: HttpClient) {}

  getClinicById(clinicId: number): Observable<APIResponse<Clinic>> {
    return this.http.get<any>(`${this.baseUrl}/getClinic/${clinicId}`).pipe(
      map(response => ({
        data: response.data || response, // Handle both wrapped and direct responses
        Succeeded: response.succeeded || true,
        Message: response.message || '',
        Errors: response.errors || []
      }))
    );
  }

  getAllClinics(): Observable<Clinic[]> {
    return this.http.get<{ data: Clinic[] }>(`${this.baseUrl}/getAllClinics`)
      .pipe(map(response => response.data));
  }
}