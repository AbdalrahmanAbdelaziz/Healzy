import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/constants/urls';
import { SpecializationResponse } from '../shared/models/specialization.model';
import { APIResponse } from '../shared/models/api-response.dto';

export interface Service {
  id: number;
  serviceName: string;
  serviceDescription: string;
  avgDurationInMinutes: number;
  specializationId: number;
  specializationName?: string;
}

export interface CreateServiceRequest {
  serviceName: string;
  serviceDescription: string;
  avgDurationInMinutes: number;
  specializationId: number;
}

export interface ServicesResponse {
  data: Service[];
  statusCode: number;
  succeeded: boolean;
  message: string;
  errors: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ServiceOfDoctor {
  private apiUrl = BASE_URL + '/api/Services'; 

  constructor(private http: HttpClient) {}

  getAllServices(): Observable<ServicesResponse> {
    return this.http.get<ServicesResponse>(`${this.apiUrl}/getAllServices`);
  }


createService(serviceData: CreateServiceRequest): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/createService`, serviceData);
}

  getServicesByDoctorId(doctorId: number): Observable<{ data: any[] }> {
    return this.http.get<{ data: any[] }>(`${this.apiUrl}/getServicesByDoctorId/${doctorId}`);
  }

  getServicesBySpecializationId(specializationId: number): Observable<{ data: any[] }> {
    return this.http.get<{ data: any[] }>(`${this.apiUrl}/getServiceBySpecializationId/${specializationId}`);
  }

  assignServiceToDoctor(requestBody: {
    doctorPriceForService: number;
    doctorAvgDurationForServiceInMinutes: number;
    specializationServiceId: number;
    doctorId: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/assignServiceToDoctor`, requestBody);
  }

  getAllSpecializations(): Observable<SpecializationResponse> {
    return this.http.get<SpecializationResponse>(`${this.apiUrl}/getAllSpecializations`);
  }
}