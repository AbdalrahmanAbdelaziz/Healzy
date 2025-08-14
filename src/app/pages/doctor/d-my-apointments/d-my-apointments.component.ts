import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { ConfirmationModalComponent } from '../../../confirmation-modal/confirmation-modal.component';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { Observable, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-d-my-apointments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DHeaderComponent,
    DSidenavbarComponent,
    ConfirmationModalComponent,
    TranslocoModule
  ],
  templateUrl: './d-my-apointments.component.html',
  styleUrls: ['./d-my-apointments.component.css']
})
export class DMyApointmentsComponent implements OnInit, OnDestroy {
  availableDays: { date: string; dayOfWeek: string }[] = [];
  selectedDate: string = '';
  appointments: any[] = [];
  userId!: number;
  isCancelModalVisible: boolean = false;
  isCheckoutModalVisible: boolean = false;
  appointmentToCancel: any = null;
  appointmentToCheckout: any = null;
  selectedAppointmentId: number | null = null;
  isCancelModalOpen: boolean = false;
  private pollingSubscription!: Subscription;

  constructor(
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    const user = this.userService.getUser();
    if (user && user.data.applicationRole_En === 'Doctor' && user.data.id) {
      this.userId = user.data.id;
      this.fetchAvailableDays();
      this.startPolling();
    } else {
      this.showTranslatedToastr('error', 'no_doctor_id', 'No user ID found for the doctor.');
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  private showTranslatedToastr(type: 'success' | 'error' | 'info' | 'warning', key: string, defaultMessage: string): void {
    const message = this.translocoService.translate(`toastr.${key}`) || defaultMessage;
    const title = this.translocoService.translate(`toastr.${type}`) || type.charAt(0).toUpperCase() + type.slice(1);
    this.toastr[type](message, title);
  }

  startPolling(): void {
    this.pollingSubscription = interval(5000)
      .pipe(
        switchMap(() => this.appointmentService.searchAppointmentsByOptionalParams(this.userId))
      )
      .subscribe({
        next: (response: any) => {
          this.appointments = (response.data || []).filter((appointment: any) => {
            return (
              appointment.timeSlot?.date === this.selectedDate &&
              appointment.appointmentStatus_En === 'NextInQueue'
            );
          });
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.showTranslatedToastr('error', 'fetch_appointments_failed', 'Failed to fetch appointments');
        },
      });
  }

  fetchAvailableDays(): void {
    const numberOfRequiredDays = 14;

    this.appointmentService.getAvailableDays(this.userId, numberOfRequiredDays).subscribe({
      next: (response: any) => {
        this.availableDays = (response.data.workingDays || []).map((date: string) => {
          const dayOfWeek = new Date(date).toLocaleDateString(this.translocoService.getActiveLang(), { weekday: 'long' });
          return { date, dayOfWeek };
        });

        if (this.availableDays.length > 0) {
          this.selectedDate = this.availableDays[0].date;
          this.fetchAppointmentsForDate(this.selectedDate);
        }
      },
      error: (error) => {
        this.showTranslatedToastr('error', 'fetch_days_failed', 'Failed to fetch available days');
      },
    });
  }

  fetchAppointmentsForDate(date: string): void {
    this.appointmentService.searchAppointmentsByOptionalParams(this.userId).subscribe({
      next: (response: any) => {
        this.appointments = (response.data || []).filter((appointment: any) => {
          return (
            appointment.timeSlot?.date === date &&
            appointment.appointmentStatus_En === 'NextInQueue'
          );
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.showTranslatedToastr('error', 'fetch_appointments_failed', 'Failed to fetch appointments');
      },
    });
  }

  onDateSelect(event: any): void {
    this.selectedDate = event.target.value;
    this.fetchAppointmentsForDate(this.selectedDate);
  }

  markAsInProgress(appointmentId: number): void {
    this.makeAppointmentInProgress(appointmentId).subscribe({
      next: () => {
        this.showTranslatedToastr('success', 'status_updated', 'Appointment status updated to In Progress');
        this.router.navigate(['/d-view-pp'], { 
          queryParams: { appointmentId: appointmentId } 
        });
      },
      error: (err) => {
        this.showTranslatedToastr('error', 'status_update_failed', 'Failed to update appointment status');
      },
    });
  }

  makeAppointmentInProgress(appointmentId: number): Observable<any> {
    return this.appointmentService.makeAppointmentInProgress(appointmentId);
  }
}