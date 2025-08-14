import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { UserService } from '../../../services/user.service';
import { DoctorService } from '../../../services/doctor.service';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { SHeaderComponent } from '../s-header/s-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-sec-day-app',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    SHeaderComponent, 
    FooterComponent, 
    TranslocoModule
  ],
  templateUrl: './sec-day-app.component.html',
  styleUrl: './sec-day-app.component.css'
})
export class SecDayAppComponent implements OnInit {
  selectedDate: string = '';
  timeSlots: any[] = [];
  docId!: number;
  clinicId: number = 0;
  patientId!: number;
  isReschedule: boolean = false;
  appointmentId: number = -1;
  bookingWayId: number | null = null;
  bookingWayName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private router: Router,
    private userService: UserService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        // Handle user changes if needed
      }
    });

    this.selectedDate = this.route.snapshot.paramMap.get('date') || '';
    this.docId = Number(this.route.snapshot.paramMap.get('doctorId')) || 0;

    this.route.queryParams.subscribe(params => {
      this.patientId = +params['patientId'] || 0;
      this.isReschedule = params['isReschedule'] === 'true';
      this.appointmentId = +params['appointmentId'] || -1;
      this.bookingWayId = params['bookingWayId'] ? Number(params['bookingWayId']) : null;
      this.bookingWayName = params['bookingWayName'] || null;

      console.log('Patient ID:', this.patientId);
      console.log('Is Reschedule:', this.isReschedule);
      console.log('Appointment ID:', this.appointmentId);
      console.log('Booking Way ID:', this.bookingWayId);
      console.log('Booking Way Name:', this.bookingWayName);
    });

    if (this.selectedDate && this.docId) {
      this.loadDoctorDetails();
      this.loadTimeSlots();
    } else {
      console.error('Date or Doctor ID is missing from route parameters.');
    }
  }

  loadDoctorDetails(): void {
    console.log('Fetching doctor details with doctorId:', this.docId);

    this.doctorService.getDoctorsBySpecialization(this.docId).subscribe(
      (doctors) => {
        if (doctors && doctors.length > 0) {
          const doctor = doctors[0];
          this.clinicId = doctor.clinicId;
          console.log('Updated Clinic ID:', this.clinicId);
        } else {
          console.warn('No doctor found with the given ID.');
        }
      },
      (error) => {
        console.error('Error fetching doctor details:', error);
      }
    );
  }

  loadTimeSlots(): void {
    this.appointmentService.getFutureTimeSlotsByDate(this.selectedDate, this.docId).subscribe(
      (response) => {
        this.timeSlots = response.data || [];
      },
      (error) => {
        console.error('Error loading time slots:', error);
      }
    );
  }

  bookTimeslot(timeSlot: any): void {
    this.router.navigate(['/sec-confirm-booking'], {
      queryParams: {
        date: this.selectedDate,
        slotId: timeSlot.id,
        doctorId: this.docId,
        patientId: this.patientId,
        isReschedule: this.isReschedule,
        appointmentId: this.appointmentId,
        bookingWayId: this.bookingWayId,
        bookingWayName: this.bookingWayName
      }
    });
  }
}