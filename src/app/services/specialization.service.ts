import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, forkJoin } from 'rxjs';
import { BASE_URL } from '../shared/constants/urls';
import { SpecializationResponse } from '../shared/models/specialization.model';

export interface Specialization {
  id: number;
  name_Ar: string;
  name_En: string;
}

interface CreateSpecializationResponse {
  succeeded: boolean;
  message: string;
  data: Specialization;
}

@Injectable({
  providedIn: 'root',
})
export class SpecializationService {
  private readonly SPECIALIZATION_ALL_URL = `${BASE_URL}/api/Specialization/all`;
  private readonly SPECIALIZATION_BY_ID_URL = `${BASE_URL}/api/Specialization`; 
  private specializationUrl = BASE_URL + '/api/Specialization';

  constructor(private http: HttpClient) {}

  // Get all specializations for admin
  getAllSpecializationsAdmin(): Observable<SpecializationResponse> {
    const adminUrl = `${BASE_URL}/api/Specialization/all`;
    return this.http.get<SpecializationResponse>(adminUrl);
  }

  // Get all specializations
  getAllSpecializations(): Observable<SpecializationResponse> {
    return this.http.get<SpecializationResponse>(this.SPECIALIZATION_ALL_URL);
  }

  // Get all specializations as array
  getAllSpecializationsAsArray(): Observable<Specialization[]> {
    return this.getAllSpecializations().pipe(
      map(response => response.succeeded ? response.data : [])
    );
  }

  // Get specialization by ID with language support
  getSpecializationById(id: number, lang?: 'en' | 'ar'): Observable<string> {
    return this.http.get<{ data: Specialization }>(`${this.SPECIALIZATION_BY_ID_URL}/${id}`).pipe(
      map(response => lang === 'ar' ? response.data.name_Ar : response.data.name_En)
    );
  }

  // Get full specialization object by ID
  getSpecializationWithTranslations(id: number): Observable<Specialization> {
    return this.http.get<{ data: Specialization }>(`${this.SPECIALIZATION_BY_ID_URL}/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Get multiple specializations with translations
  getMultipleSpecializationsWithTranslations(ids: number[]): Observable<Specialization[]> {
    return forkJoin(
      ids.map(id => this.getSpecializationWithTranslations(id))
    );
  }

  // Create new specialization
  createSpecialization(name_Ar: string, name_En: string): Observable<CreateSpecializationResponse> {
    return this.http.post<CreateSpecializationResponse>(
      this.specializationUrl,
      { name_Ar, name_En }
    );
  }

  // Update specialization
  updateSpecialization(id: number, name_Ar: string, name_En: string): Observable<any> {
    return this.http.put(
      `${this.specializationUrl}/${id}`,
      { name_Ar, name_En }
    );
  }

  // Delete specialization
  deleteSpecialization(id: number): Observable<any> {
    return this.http.delete(`${this.specializationUrl}/${id}`);
  }
}