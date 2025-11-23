// appointments-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { ConfirmationModalComponent } from '../../../confirmation-modal/confirmation-modal.component';
import { DHeaderComponent } from '../d-header/d-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { interval, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DHeaderComponent,
    ConfirmationModalComponent,
    TranslocoModule
  ],
  templateUrl: './appointments-list.component.html',
  styleUrl: './appointments-list.component.css'
})
export class AppointmentsListComponent implements OnInit, OnDestroy {
  availableDays: { date: string; dayOfWeek: string }[] = [];
  selectedDate: string = '';
  appointments: any[] = [];
  userId!: number;
  isCancelModalVisible: boolean = false;
  isCancelModalOpen: boolean = false;
  isCheckoutModalVisible: boolean = false;
  appointmentToCancel: any = null;
  appointmentToCheckout: any = null;
  selectedAppointmentId: number | null = null;
  private pollingSubscription!: Subscription;
  private audio = new Audio(); // For notification sound
  private previousNextInQueueAppointments: number[] = []; // Track NextInQueue appointments

  constructor(
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    // Initialize audio for notification
    this.audio.src = 'notification.mp3';
    this.audio.load();

    const user = this.userService.getUser();
    if (user && user.data.applicationRole_En === 'Doctor' && user.data.id) {
      this.userId = user.data.id;
      this.fetchAvailableDays();
      this.startPolling();
    } else {
      this.toastr.error('No user ID found for the doctor.', 'Error');
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  startPolling(): void {
    this.pollingSubscription = interval(5000)
      .pipe(
        switchMap(() => this.appointmentService.searchAppointmentsByOptionalParams(this.userId))
      )
      .subscribe({
        next: (response: any) => {
          const newAppointments = (response.data || []).filter((appointment: any) => {
            return appointment.timeSlot?.date === this.selectedDate;
          });

          // Sort appointments by timeslot start time
          const sortedAppointments = this.sortAppointmentsByTime(newAppointments);

          // Check for new NextInQueue appointments
          this.checkForNextInQueueChanges(sortedAppointments);

          this.appointments = sortedAppointments;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.toastr.error(this.getTranslation('errors.fetchAppointments'), 'Error');
        },
      });
  }

  private sortAppointmentsByTime(appointments: any[]): any[] {
    return [...appointments].sort((a, b) => {
      const timeA = a.timeSlot?.startTime || '00:00:00';
      const timeB = b.timeSlot?.startTime || '00:00:00';
      
      // Compare times in HH:MM:SS format
      return timeA.localeCompare(timeB);
    });
  }

  private checkForNextInQueueChanges(newAppointments: any[]): void {
    const currentNextInQueue = newAppointments
      .filter(a => a.appointmentStatus_En === 'NextInQueue')
      .map(a => a.id);

    // Find newly added NextInQueue appointments
    const newNextInQueue = currentNextInQueue.filter(id =>
      !this.previousNextInQueueAppointments.includes(id)
    );

    if (newNextInQueue.length > 0) {
      this.playNotificationSound();
    }

    // Update our tracking
    this.previousNextInQueueAppointments = currentNextInQueue;
  }

  private playNotificationSound(): void {
    try {
      this.audio.currentTime = 0; // Reset audio to start
      this.audio.play().catch(e => console.warn('Audio play failed:', e));
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  fetchAvailableDays(): void {
    const numberOfRequiredDays = 14;

    this.appointmentService.getAllDays(this.userId, numberOfRequiredDays).subscribe({
      next: (response: any) => {
        this.availableDays = (response.data.workingDays || []).map((date: string) => {
          const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
          return { date, dayOfWeek };
        });

        if (this.availableDays.length > 0) {
          // Find today's date or the first upcoming date
          const today = new Date().toISOString().split('T')[0];
          const todayOrFirstUpcoming = this.availableDays.find(day => day.date >= today) || this.availableDays[0];
          
          this.selectedDate = todayOrFirstUpcoming.date;
          this.fetchAppointmentsForDate(this.selectedDate);
        }
      },
      error: (error) => {
        this.toastr.error('Failed to fetch available days', 'Error');
      },
    });
  }

  fetchAppointmentsForDate(date: string): void {
    this.appointmentService.searchAppointmentsByOptionalParams(this.userId).subscribe({
      next: (response: any) => {
        const newAppointments = (response.data || []).filter((appointment: any) => {
          return appointment.timeSlot?.date === date;
        });

        // Sort appointments by timeslot start time
        const sortedAppointments = this.sortAppointmentsByTime(newAppointments);

        // Check for new NextInQueue appointments
        this.checkForNextInQueueChanges(sortedAppointments);

        this.appointments = sortedAppointments;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.toastr.error('Failed to fetch appointments', 'Error');
      },
    });
  }

  onDateSelect(event: any): void {
    this.selectedDate = event.target.value;
    this.fetchAppointmentsForDate(this.selectedDate);
  }

  reschedule(appointmentId: number, doctorId: number): void {
    this.router.navigate([`/sec-doctor-appointments-reschedual/${doctorId}/-1/-1`], {
      queryParams: { isReschedule: true, appointmentId: appointmentId },
    });
  }

  openCancelModal(appointmentId: number): void {
    this.selectedAppointmentId = appointmentId;
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
    this.selectedAppointmentId = null;
  }

  confirmCancel(): void {
    if (this.selectedAppointmentId) {
      this.appointmentService.cancelAppointment(this.selectedAppointmentId).subscribe({
        next: () => {
          this.toastr.success(this.getTranslation('appointments.cancelSuccess'));
          this.fetchAppointmentsForDate(this.selectedDate); // Refresh the list
          this.closeCancelModal();
        },
        error: (err) => {
          this.toastr.error(this.getTranslation('appointments.failedCancel'));
          this.closeCancelModal();
        },
      });
    }
  }

  private getTranslation(key: string): string {
    return this.translocoService.translate(key);
  }

  markAsInProgress(appointmentId: number): void {
    this.appointmentService.makeAppointmentInProgress(appointmentId).subscribe({
      next: () => {
        this.toastr.success(
          this.translocoService.translate('appointments.statusUpdated')
        );
        this.router.navigate(['/d-view-pp'], {
          queryParams: { appointmentId: appointmentId }
        });
      },
      error: (err) => {
        this.toastr.error(
          this.translocoService.translate('appointments.statusUpdateFailed')
        );
      },
    });
  }

  navigateToPatientProfile(appointment: any): void {
    if (appointment.appointmentStatus_En === 'InProgress' || appointment.appointmentStatus_En === 'NextInQueue') {
      this.router.navigate(['/d-view-pp'], {
        queryParams: { 
          appointmentId: appointment.id,
          doctorId: this.userId // Add doctorId to query params
        }
      });
    }
  }

  private showTranslatedToastr(type: 'success' | 'error', key: string, fallback: string): void {
    const message = this.translocoService.translate(`appointments.${key}`) || fallback;
    if (type === 'success') {
      this.toastr.success(message);
    } else {
      this.toastr.error(message);
    }
  }

  formatTime(dateTimeString: string): string {
    if (!dateTimeString || dateTimeString === "0001-01-01T00:00:00") {
      return 'N/A';
    }
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'NextInQueue':
        return 'status-next-in-queue';
      case 'InProgress':
        return 'status-in-progress';
      case 'Proccessed':
        return 'status-processed';
      case 'Cancelled':
        return 'status-cancelled';
      case 'upcoming':
        return 'status-upcoming';
      default:
        return 'status-default';
    }
  }

  canCancelAppointment(status: string): boolean {
    const normalized = status.toLowerCase();
    return normalized !== 'processed' && 
           normalized !== 'proccessed' && 
           normalized !== 'finished' && 
           normalized !== 'cancelled';
  }

  canRescheduleAppointment(status: string): boolean {
    return status === 'upcoming';
  }

  canMarkInProgress(status: string): boolean {
    return status === 'NextInQueue';
  }

  isRowClickable(status: string): boolean {
    return status === 'InProgress' || status === 'NextInQueue';
  }
}