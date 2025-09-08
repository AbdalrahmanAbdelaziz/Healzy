import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Country, 
  Governorate, 
  District, 
  ApiResponse, 
  CountryRequest, 
  GovernorateRequest, 
  DistrictRequest 
} from '../shared/models/location.models';
import { BASE_URL } from '../shared/constants/urls';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private apiUrl = BASE_URL; 

  constructor(private http: HttpClient) { }

  // Country endpoints
  getAllCountries(): Observable<ApiResponse<Country>> {
    return this.http.get<ApiResponse<Country>>(`${this.apiUrl}/api/Country/all`);
  }

  createCountry(countryData: CountryRequest): Observable<ApiResponse<Country>> {
    return this.http.post<ApiResponse<Country>>(`${this.apiUrl}/api/Country`, countryData);
  }

  updateCountry(id: number, countryData: CountryRequest): Observable<ApiResponse<Country>> {
    return this.http.put<ApiResponse<Country>>(`${this.apiUrl}/api/Country/${id}`, countryData);
  }

  deleteCountry(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/api/Country/${id}`);
  }

  // Governorate endpoints
  getAllGovernorates(): Observable<ApiResponse<Governorate>> {
    return this.http.get<ApiResponse<Governorate>>(`${this.apiUrl}/api/Governorate/all`);
  }

  getGovernoratesByCountry(countryId: number): Observable<ApiResponse<Governorate>> {
    return this.http.get<ApiResponse<Governorate>>(`${this.apiUrl}/api/Governorate/country/${countryId}`);
  }

  createGovernorate(governorateData: GovernorateRequest): Observable<ApiResponse<Governorate>> {
    return this.http.post<ApiResponse<Governorate>>(`${this.apiUrl}/api/Governorate`, governorateData);
  }

  updateGovernorate(id: number, governorateData: GovernorateRequest): Observable<ApiResponse<Governorate>> {
    return this.http.put<ApiResponse<Governorate>>(`${this.apiUrl}/api/Governorate/${id}`, governorateData);
  }

  deleteGovernorate(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/api/Governorate/${id}`);
  }

  // District endpoints
  getAllDistricts(): Observable<ApiResponse<District>> {
    return this.http.get<ApiResponse<District>>(`${this.apiUrl}/api/District/all`);
  }

  getDistrictsByGovernorate(governorateId: number): Observable<ApiResponse<District>> {
    return this.http.get<ApiResponse<District>>(`${this.apiUrl}/api/District/governorate/${governorateId}`);
  }

  createDistrict(districtData: DistrictRequest): Observable<ApiResponse<District>> {
    return this.http.post<ApiResponse<District>>(`${this.apiUrl}/api/District`, districtData);
  }

  updateDistrict(id: number, districtData: DistrictRequest): Observable<ApiResponse<District>> {
    return this.http.put<ApiResponse<District>>(`${this.apiUrl}/api/District/${id}`, districtData);
  }

  deleteDistrict(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/api/District/${id}`);
  }
}