import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Doctor } from '../shared/models/doctor.model';
import { TimeSlot } from '../shared/models/appointment.model';
import { BASE_URL } from '../shared/constants/urls';
import { APIResponse } from '../shared/models/api-response.dto';
import { DoctorsRevenueResponse } from '../shared/models/DoctorsRevenueResponse';
import { DoctorRevenue } from '../shared/models/DoctorRevenue';
import { MedicalRecordEntry } from '../shared/models/medical-record-entry.model';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private apiUrl = BASE_URL + '/api/Doctor'; 

  constructor(private http: HttpClient) {}

  getCheckPriceByDocId(docId: number): Observable<number> {
    return this.http.post<{
      data: number,
      statusCode: number,
      succeeded: boolean,
      message: string,
      errors: any[]
    }>(`${this.apiUrl}/getCheckPriceByDocId/${docId}`, {})
    .pipe(map(response => response.data));
  }

  getTopDoctors(): Observable<Doctor[]> {
    return this.http.get<{ data: Doctor[] }>(`${this.apiUrl}/getOverallTopTenRatedDoctors`)
      .pipe(map(response => response.data)); 
  }

  getDoctorsBySpecialization(specializationId: number): Observable<Doctor[]> {
    return this.http.get<{ data: Doctor[] }>(`${this.apiUrl}/getDoctorsBySpecializationId/${specializationId}`)
      .pipe(map(response => response.data)); 
  }

  getDoctorsByOptionalParams(params: any): Observable<APIResponse<Doctor[]>> {
    return this.http.post<APIResponse<Doctor[]>>(`${this.apiUrl}/getDoctorsByOptionalParams`, params);
  }

  getAllDoctors(): Observable<APIResponse<Doctor[]>> {
    return this.http.post<APIResponse<Doctor[]>>(`${this.apiUrl}/getAll`, {});
  }

  getDoctorServices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/getDoctorServices`);
  }

  getAvailableServices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/getAvailableServices`);
  }

  addDoctorServices(services: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/addDoctorServices`, services);
  }

  getDoctorDayFinalRevenue(docId: number, date: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/getDoctorDayFinalRevenue`, { docId, date });
  }

  getDoctorsWithRevenueForMonth(month: number, year: number): Observable<DoctorsRevenueResponse<DoctorRevenue[]>> {
    return this.http.post<DoctorsRevenueResponse<DoctorRevenue[]>>(
      `${this.apiUrl}/getDoctorsWithRevenuForMonth`, 
      { month, year }
    );
  }

  getDoctorAppointmentsForMonth(doctorId: number, month: number, year: number): Observable<DoctorsRevenueResponse<any[]>> {
    return this.http.post<DoctorsRevenueResponse<any[]>>(
      `${BASE_URL}/api/Appointment/getDrAppointmentsForMonth`,
      { doctorId, month, year }
    );
  }

  // ---------------- New Method for Secretary ----------------
getDoctorsFromSecretary(): Observable<Doctor> {
  return this.http.post<{ data: Doctor }>(`${BASE_URL}/api/Secretary/getDoctor`, {})
    .pipe(map(res => res.data));
}




  // ---------------- New Method for Specializations ----------------
getSpecializations(): Observable<any> {
  return this.http.get<{ data: any }>(`${this.apiUrl}/getSpecialization`)
    .pipe(map(response => response.data));  
}



editMedicalRecordEntry(entry: MedicalRecordEntry): Observable<MedicalRecordEntry> {
  return this.http.put<{ data: MedicalRecordEntry }>(
    `${this.apiUrl}/editMedicalRecordEntry`,
    entry
  ).pipe(map(res => res.data));
}

addFileToMedicalRecordEntry(entryId: number, file: File): Observable<any> {
  const formData = new FormData();
  formData.append('MedicalRecordEntryId', entryId.toString());
  formData.append('File', file);

  return this.http.put(`${this.apiUrl}/addFileToMedicalRecordEntry`, formData);
}


}
