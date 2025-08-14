import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { UserService } from '../../../services/user.service';
import { DoctorService } from '../../../services/doctor.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { PHeaderComponent } from '../p-header/p-header.component';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-day-appointments',
  imports: [CommonModule, RouterModule, PHeaderComponent, SideNavbarComponent,TranslocoModule, FooterComponent],
  templateUrl: './day-appointments.component.html',
  styleUrl: './day-appointments.component.css'
})
export class DayAppointmentsComponent implements OnInit {
  patient!: LoginResponse;
  selectedDate: string = '';
  timeSlots: any[] = [];
  docId!: number;
  clinicId: number = 0;    
  specializationId: number = 0;


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
        this.patient = newUser;
      }
    });

    this.selectedDate = this.route.snapshot.paramMap.get('date') || '';
    this.docId = Number(this.route.snapshot.paramMap.get('doctorId')) || 0;
    this.specializationId = Number(this.route.snapshot.paramMap.get('specializationId')) || 0;

    if (this.selectedDate && this.docId) {
      this.loadDoctorDetails(); // ✅ Ensure doctor details load first
      this.loadTimeSlots();
    } else {
      console.error('Date or Doctor ID is missing from route parameters.');
    }
  }

  loadDoctorDetails(): void {
    console.log('Fetching doctor details with doctorId:', this.docId);
  
    this.doctorService.getDoctorsBySpecialization(this.docId).subscribe(
      (doctors) => {
        if (doctors && doctors.length > 0) { // ✅ Ensure at least one doctor exists
          const doctor = doctors[0]; // ✅ Pick the first doctor from the array
          this.clinicId = doctor.clinicId;
          this.specializationId = doctor.specializationId;
          console.log('Updated Clinic ID:', this.clinicId);
          console.log('Updated Specialization ID:', this.specializationId);
        } else {
          console.warn('No doctor found with the given specialization ID.');
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
      }
    );
  }

  bookTimeslot(timeSlot: any): void {
    this.router.navigate(['/confirm-booking'], {
      queryParams: {
        date: this.selectedDate,
        slotId: timeSlot.id, // Ensure this is the correct ID
        doctorId: this.docId,  
        specializationId: this.specializationId,
      }
    });
  }
}
