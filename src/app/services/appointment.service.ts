import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { Appointment, TimeSlot } from '../shared/models/appointment.model';
import { BASE_URL } from '../shared/constants/urls';
import { APIResponse } from '../shared/models/api-response.dto';
import { AppointmentStats } from '../shared/models/appointment-stats.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {

  private appointmentData: any = {};

  private baseUrl = BASE_URL;

  constructor(private http: HttpClient) {}

  getAvailableDays(docId: number, numberOfRequiredDays: number): Observable<any> {
    const requestBody = { docId, numberOfRequiredDays };
    return this.http.post(`${this.baseUrl}/api/TimeSlot/GetWorkingDaysOfDoctor`, requestBody);
  }

  getAllDays(docId: number, numberOfRequiredDays: number): Observable<any> {
    const requestBody = { docId, numberOfRequiredDays };
    return this.http.post(`${this.baseUrl}/api/TimeSlot/GetAllWorkingDaysOfDoctor`, requestBody);
  }

  getTimeSlotsByDate(date: string, doctorId: number): Observable<any> {
    const body = { doctorId, date };
    return this.http.post(`${this.baseUrl}/api/TimeSlot/GetDoctorSlots`, body);
  }

  getFutureTimeSlotsByDate(date: string, doctorId: number): Observable<any> {
    const body = { doctorId, date };
    return this.http.post(`${this.baseUrl}/api/TimeSlot/GetFutureDoctorSlots`, body);
  }
  
  getTimeSlotById(timeSlotId: number): Observable<APIResponse<TimeSlot>> {
    return this.http.get<APIResponse<TimeSlot>>(`${this.baseUrl}/api/TimeSlot/GetByIdAsync/${timeSlotId}`);
  }
  
  createAppointment(appointmentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/createAppointment`, appointmentData);
  }
  
  getAppointments(patientId: number): Observable<any> {
    const requestBody = {
      appointmentId: null,
      doctorId: null,
      doctortFirstName: null,
      doctorLastName: null,
      clinicId: null,
      specializationId: null,
      status: null,
      patientId: patientId 
    };
  
    return this.http.post(`${this.baseUrl}/api/Appointment/SearchForAppointmentsByOptionalParams`, requestBody);
  }
  
  cancelAppointment(appointmentId: number): Observable<any> {
    const url = `${this.baseUrl}/api/Appointment/cancelAppointment/${appointmentId}`;
    return this.http.post(url, {}); // Use POST method with an empty body
  }

  ////////////////////////////////////////////////////////////

  getAppointmentStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Appointment/getAppointmentStats`);
  }

  reserveAppointment(appointmentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/appointments/book`, appointmentData);
  }

  rescheduleAppointment(data: { appointmentId: number, newTimeSlotId: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/rescheduleSingleAppointment`, data);
  }

  makeAppointmentArrived(appointmentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/makeAppointmentArrived/${appointmentId}`, {});
  }

  makeAppointmentNextInQueue(appointmentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/makeAppointmentNextInQueue/${appointmentId}`, {});
  }

  makeAppointmentInProgress(appointmentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/startProgressingTheAppointment/${appointmentId}`, {});
  }

  makeAppointmentProcessed(appointmentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/makeAppointmentProccessed/${appointmentId}`, {});
  }



  getAppointmentById(appointmentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Appointment/getAppointment/${appointmentId}`);
  }

  getDoctorDayAppointmentsCount(docId: number, date: string): Observable<AppointmentStats> {
    const requestBody = { docId, date };
    return this.http.post<AppointmentStats>(`${this.baseUrl}/api/Doctor/getDoctorDayAppointmentsCount`, requestBody);
  }

  searchAppointmentsByOptionalParams(doctorId: number): Observable<any> {
    const requestBody = {
      appointmentId: null,
      doctorId: doctorId, 
      doctortFirstName: null,
      doctorLastName: null,
      clinicId: null,
      specializationId: null,
      status: null,
      patientId: null,
    };

    return this.http.post(`${this.baseUrl}/api/Appointment/SearchForAppointmentsByOptionalParams`, requestBody);
  }

  getAppointmentServices(appointmentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Appointment/GetAppointmentServices/${appointmentId}`);
  }


 addServiceToAppointment(serviceId: number, appointmentId: number, quantity: number, price: number): Observable<any> {
    const requestBody = {
      servieId: serviceId,
      appointmentId: appointmentId,
      quantity: quantity,
      price: price
    };
    return this.http.post(`${this.baseUrl}/api/Appointment/addServiceForAppointment`, requestBody);
}

  submitPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/SubmitPayment`, paymentData);
  }

  getRevenueData(doctorId: number, date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Revenue/GetRevenueData?doctorId=${doctorId}&date=${date}`);
  }

  getAppointmentReceipt(appointmentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Appointment/getAppointmentReceipt/${appointmentId}`);
  }

  payAppointment(paymentData: {
    paidCash: number;
    paidInstapay: number;
    paidWallet: number;
    appointmentId: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Appointment/payAppointment`, paymentData);
  }


  completeVisit(visitData: {
    appointmentId: number;
    checkPrice: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/completeVisit`, visitData);
  }
  
   setAppointmentCheckPrice(appointmentId: number, checkPrice: number): Observable<any> {
  const requestBody = {
    appointmentId: appointmentId,
    checkPrice: checkPrice
  };
  return this.http.post(`${this.baseUrl}/api/Appointment/setAppointmentCheckPrice`, requestBody);
}

// In your appointment.service.ts file
removeServiceFromAppointment(appointmentServiceId: number): Observable<any> {
  const url = `${this.baseUrl}/AppointmentServices/${appointmentServiceId}`;
  return this.http.delete(url).pipe();
}

}