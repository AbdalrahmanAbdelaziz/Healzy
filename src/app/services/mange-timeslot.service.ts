import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BASE_URL } from '../shared/constants/urls';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MangeTimeslotService {
  private apiUrl = BASE_URL + '/api'

  constructor(private http: HttpClient) { }


  createTimeSlot(timeSlotData: {
    intervalDate: string;
    intervalStartTime: string;
    intervalEndTime: string;
    intervalPeriodInMinutes: number;
    doctorId: number;
    numberOfWeeksToRepeat: number;
  }): Observable<any> {
    const url = `${this.apiUrl}/TimeSlot/CreateTimeSlotsOfInterval`; // Correct endpoint
    console.log('API URL:', url); // Debugging
    return this.http.post(url, timeSlotData);
  }

  createDoctorTimeSlot(timeSlotData: {
    intervalDate: string;
    intervalStartTime: string;
    intervalEndTime: string;
    intervalPeriodInMinutes: number;
    userId: number; // Change doctorId to userId
    numberOfWeeksToRepeat: number;
  }): Observable<any> {
    const url = `${this.apiUrl}/TimeSlot/CreateTimeSlotsOfInterval`; // Correct endpoint
    console.log('API URL:', url); // Debugging
    return this.http.post(url, timeSlotData);
  }
}
