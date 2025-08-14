import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/constants/urls';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  constructor(private http: HttpClient) {}

  createFeedback(feedbackData: any): Observable<any> {
    return this.http.post(`${BASE_URL}/api/Feedback/createNewFeedback`, feedbackData);
  }

  getFeedbacksByDoctorId(docId: number): Observable<any> {
    return this.http.get(`${BASE_URL}/api/Feedback/getFeedbacksByDoctorId/${docId}`);
  }

  getDoctorAverageRate(docId: number): Observable<any> {
    return this.http.get(`${BASE_URL}/api/Feedback/getDoctorAverageRate/${docId}`);
  }
}