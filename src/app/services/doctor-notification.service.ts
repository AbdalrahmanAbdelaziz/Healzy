import { Injectable } from '@angular/core';
import { AppointmentService } from './appointment.service';
import { UserService } from './user.service';
import { interval, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DoctorNotificationService {
  private audio = new Audio('notification.mp3');
  private previousNextInQueue: number[] = [];

  constructor(private appointmentService: AppointmentService, private userService: UserService) {}

  startDoctorPolling() {
    const user = this.userService.getUser();
    if (!user || user.data.applicationRole_En !== 'Doctor') return;

    const doctorId = user.data.id;

    interval(60000)
      .pipe(switchMap(() => this.appointmentService.searchAppointmentsByOptionalParams(doctorId)))
      .subscribe((response: any) => {
        const appointments = response.data || [];

        const currentNext = appointments
          .filter((a: any) => a.appointmentStatus_En === 'NextInQueue')
          .map((a: any) => a.id);

        const newOnes = currentNext.filter((id: any) => !this.previousNextInQueue.includes(id));

        if (newOnes.length > 0) {
          this.audio.currentTime = 0;
          this.audio.play().catch(err => console.warn('Audio blocked:', err));
        }

        this.previousNextInQueue = currentNext;
      });
  }
}
