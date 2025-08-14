import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { ConfirmationModalComponent } from '../../../confirmation-modal/confirmation-modal.component';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';
import { Observable, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Appointment } from '../../../shared/models/appointment.model';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-my-appointment',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SHeaderComponent,
    SSidenavbarComponent,
    ConfirmationModalComponent,
    CheckoutModalComponent,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './my-appointment.component.html',
  styleUrls: ['./my-appointment.component.css'],
})
export class MyAppointmentComponent implements OnInit, OnDestroy {
    private audio = new Audio(); // This is for the "InProgress" notification sound
    private actionSound = new Audio(); // New audio object for "arrive", "next in queue", "checkout"
    private previousInProgressAppointments: number[] = [];

    availableDays: { date: string; dayOfWeek: string }[] = [];
    selectedDate: string = '';
    appointments: any[] = [];
    doctorId!: number;
    isCancelModalOpen: boolean = false;
    isCheckoutModalVisible: boolean = false;
    appointmentToCancel: any = null;
    appointmentToCheckout: any = null;
    selectedAppointmentId: number | null = null;
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
        this.audio.src = 'notification.mp3'; // Sound for InProgress
        this.audio.load();

        this.actionSound.src = 'notification2.mp3'; // New sound for actions
        this.actionSound.load();

        const user = this.userService.getUser();
        if (user && user.data.applicationRole_En === 'Secretary' && user.data.doctorId) {
            this.doctorId = user.data.doctorId;
            this.fetchAvailableDays();
            this.startPolling();
        } else {
            this.toastr.error(this.getTranslation('errors.noDoctorId'), 'Error');
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
                switchMap(() => this.appointmentService.searchAppointmentsByOptionalParams(this.doctorId))
            )
            .subscribe({
                next: (response: any) => {
                    const newAppointments = (response.data || [])
                        .filter((appointment: any) => {
                            return (
                                appointment.timeSlot?.date === this.selectedDate &&
                                appointment.appointmentStatus_En !== 'Cancelled' &&
                                appointment.appointmentStatus_En !== 'Proccessed'
                            );
                        })
                        .sort((a: any, b: any) => {
                            const timeA = new Date(`1970-01-01T${a.timeSlot.startTime}`);
                            const timeB = new Date(`1970-01-01T${b.timeSlot.startTime}`);
                            return timeA.getTime() - timeB.getTime();
                        });

                    // Check for new InProgress appointments
                    this.checkForInProgressChanges(newAppointments);

                    this.appointments = newAppointments;
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    this.toastr.error(this.getTranslation('errors.fetchAppointments'), 'Error');
                },
            });
    }

    private checkForInProgressChanges(newAppointments: any[]): void {
        const currentInProgress = newAppointments
            .filter(a => a.appointmentStatus_En === 'InProgress')
            .map(a => a.id);

        // Find newly added InProgress appointments
        const newInProgress = currentInProgress.filter(id =>
            !this.previousInProgressAppointments.includes(id)
        );

        if (newInProgress.length > 0) {
            this.playNotificationSound(this.audio); // Use the original audio for inProgress
        }

        // Update our tracking
        this.previousInProgressAppointments = currentInProgress;
    }

    // Renamed and generalized the play sound method
    private playNotificationSound(audioElement: HTMLAudioElement): void {
        try {
            audioElement.currentTime = 0; // Reset audio to start
            audioElement.play().catch(e => console.warn('Audio play failed:', e));
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }

    fetchAvailableDays(): void {
  const numberOfRequiredDays = 14;

  this.appointmentService.getAllDays(this.doctorId, numberOfRequiredDays).subscribe({
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
        this.appointmentService.searchAppointmentsByOptionalParams(this.doctorId).subscribe({
            next: (response: any) => {
                this.appointments = (response.data || [])
                    .filter((appointment: any) => {
                        return (
                            appointment.timeSlot?.date === date &&
                            appointment.appointmentStatus_En !== 'Cancelled' &&
                            appointment.appointmentStatus_En !== 'Proccessed'
                        );
                    })
                    .sort((a: any, b: any) => {
                        // Convert time strings to Date objects for comparison
                        const timeA = new Date(`1970-01-01T${a.timeSlot.startTime}`);
                        const timeB = new Date(`1970-01-01T${b.timeSlot.startTime}`);
                        return timeA.getTime() - timeB.getTime();
                    });
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.toastr.error(this.getTranslation('errors.fetchAppointments'), 'Error');
            },
        });
    }

    onDateSelect(event: any): void {
        this.selectedDate = event.target.value;
        this.fetchAppointmentsForDate(this.selectedDate);
    }

    markAsArrived(appointmentId: number): void {
        this.makeAppointmentArrived(appointmentId).subscribe({
            next: () => {
                this.toastr.success(this.getTranslation('appointments.statusArrived'));
                this.playNotificationSound(this.actionSound); // Play new sound
                this.fetchAppointmentsForDate(this.selectedDate);
            },
            error: (err) => {
                this.toastr.error(this.getTranslation('appointments.failedStatusUpdate'));
            },
        });
    }

    markAsNextInQueue(appointmentId: number): void {
        // Check if there's already an appointment with NextInQueue status
        const existingNextInQueue = this.appointments.find(appt =>
            appt.appointmentStatus_En === 'NextInQueue' && appt.id !== appointmentId
        );

        if (existingNextInQueue) {
            this.toastr.warning(this.getTranslation('appointments.onlyOneNextInQueue'));
            return;
        }

        this.makeAppointmentNextInQueue(appointmentId).subscribe({
            next: () => {
                this.toastr.success(this.getTranslation('appointments.statusNextInQueue'));
                this.playNotificationSound(this.actionSound); // Play new sound
                this.fetchAppointmentsForDate(this.selectedDate);
            },
            error: (err) => {
                this.toastr.error(this.getTranslation('appointments.failedStatusUpdate'));
            },
        });
    }

    hasNextInQueueAppointment(): boolean {
        return this.appointments.some(appt => appt.appointmentStatus_En === 'NextInQueue');
    }

    markAsInProgress(appointmentId: number): void {
        // This method is intentionally empty as per your comment ("Disabled for secretary")
    }

    markAsProcessed(appointmentId: number): void {
        this.makeAppointmentProcessed(appointmentId).subscribe({
            next: () => {
                this.toastr.success(this.getTranslation('appointments.statusProcessed'));
                this.playNotificationSound(this.actionSound); // Play new sound

                // Find and update the appointment in the current list
                const processedAppointment = this.appointments.find(appt => appt.id === appointmentId);
                if (processedAppointment) {
                    // Set the processed status
                    processedAppointment.appointmentStatus_En = 'Processed';

                    // Fetch the updated appointment data before opening the modal
                    this.appointmentService.getAppointmentById(appointmentId).subscribe({
                        next: (response) => {
                            this.appointmentToCheckout = response.data;
                            this.isCheckoutModalVisible = true;
                            this.cdr.detectChanges();
                        },
                        error: (err) => {
                            this.toastr.error(this.getTranslation('appointments.failedFetchUpdatedData'));
                        }
                    });
                }

                // Refresh the appointments list
                this.fetchAppointmentsForDate(this.selectedDate);
            },
            error: (err) => {
                this.toastr.error(this.getTranslation('appointments.failedStatusUpdate'));
            },
        });
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
                    this.appointments = this.appointments.filter((appt) => appt.id !== this.selectedAppointmentId);
                    this.closeCancelModal();
                },
                error: (err) => {
                    this.toastr.error(this.getTranslation('appointments.failedCancel'));
                    this.closeCancelModal();
                },
            });
        }
    }

    closeCheckoutModal(): void {
        this.isCheckoutModalVisible = false;
        this.appointmentToCheckout = null;
        this.fetchAppointmentsForDate(this.selectedDate);
    }

    getRemainingToPay(appointment: Appointment): number {
        return appointment.remainingToPay ?? 0;
    }

    // Check if there's remaining payment
    hasRemainingPayment(appointment: Appointment): boolean {
        return (appointment.remainingToPay ?? 0) > 0;
    }

    openCheckoutModal(appointment: Appointment): void {
        if (appointment.id) {
            this.appointmentToCheckout = appointment; // Assign the full appointment object
            this.isCheckoutModalVisible = true;
        } else {
            this.toastr.error(this.getTranslation('appointments.invalidAppointment'), 'Error');
        }
    }

    getAppointmentReceipt(appointmentId: number): void {
        this.appointmentService.getAppointmentReceipt(appointmentId).subscribe({
            next: (response: any) => {
                this.toastr.success(this.getTranslation('appointments.receiptFetched'));
            },
            error: (error) => {
                this.toastr.error(this.getTranslation('appointments.failedReceiptFetch'));
            },
        });
    }

    makeAppointmentArrived(appointmentId: number): Observable<any> {
        return this.appointmentService.makeAppointmentArrived(appointmentId);
    }

    makeAppointmentNextInQueue(appointmentId: number): Observable<any> {
        return this.appointmentService.makeAppointmentNextInQueue(appointmentId);
    }

    makeAppointmentInProgress(appointmentId: number): Observable<any> {
        return this.appointmentService.makeAppointmentInProgress(appointmentId);
    }

    makeAppointmentProcessed(appointmentId: number): Observable<any> {
        return this.appointmentService.makeAppointmentProcessed(appointmentId);
    }

    private getTranslation(key: string): string {
        return this.translocoService.translate(key);
    }
}