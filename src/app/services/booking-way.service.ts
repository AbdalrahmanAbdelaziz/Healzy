import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/constants/urls';
import { APIResponse } from '../shared/models/api-response.dto';
import { BookingWay } from '../shared/models/bookingWay';

@Injectable({
  providedIn: 'root'
})
export class BookingWayService {
  private apiUrl = `${BASE_URL}/api/BookingWay`;

  constructor(private http: HttpClient) { }

  getAppBookingWay(): Observable<APIResponse<BookingWay>> {
    return this.http.get<APIResponse<BookingWay>>(`${this.apiUrl}/getAppBookingWay`);
  }

  getWalkInBookingWay(): Observable<APIResponse<BookingWay>> {
    return this.http.get<APIResponse<BookingWay>>(`${this.apiUrl}/getWalkInBookingWay`);
  }

  getPhoneBookingWay(): Observable<APIResponse<BookingWay>> {
    return this.http.get<APIResponse<BookingWay>>(`${this.apiUrl}/getPhoneBookingWay`);
  }
}