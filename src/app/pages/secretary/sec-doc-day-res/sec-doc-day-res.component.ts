import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { UserService } from '../../../services/user.service';
import { DoctorService } from '../../../services/doctor.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { PHeaderComponent } from '../../patient/p-header/p-header.component';
import { SideNavbarComponent } from '../../patient/side-navbar/side-navbar.component';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { ToastrService } from 'ngx-toastr';
import { ConfirmRescheduleModalComponent } from '../confirm-reschedule-modal/confirm-reschedule-modal.component';
import { DHeaderComponent } from '../../doctor/d-header/d-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-sec-doc-day-res',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SHeaderComponent,
    SSidenavbarComponent,
    ConfirmRescheduleModalComponent,
    PHeaderComponent,
    DHeaderComponent,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './sec-doc-day-res.component.html',
  styleUrls: ['./sec-doc-day-res.component.css']
})
export class SecDocDayResComponent implements OnInit {
  patient!: LoginResponse;
  selectedDate: string = '';
  timeSlots: any[] = [];
  docId!: number;
  clinicId: number = 0;
  specializationId: number = 0;
  appointmentId!: number;
  isModalVisible: boolean = false;
  selectedTimeSlot: any = null;

  constructor(
    private route: ActivatedRoute,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService,
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
    this.appointmentId = Number(this.route.snapshot.queryParams['appointmentId']) || 0;

    if (this.selectedDate && this.docId) {
      this.loadDoctorDetails();
      this.loadTimeSlots();
    } else {
      this.showTranslatedToastr('error', 'missing_parameters', 'Date or Doctor ID is missing from route parameters.');
    }
  }

  private showTranslatedToastr(type: 'success' | 'error' | 'info' | 'warning', key: string, defaultMessage: string): void {
    const message = this.translocoService.translate(`toastr.${key}`) || defaultMessage;
    const title = this.translocoService.translate(`toastr.${type}`) || 
                 type.charAt(0).toUpperCase() + type.slice(1);
    this.toastr[type](message, title);
  }

  loadDoctorDetails(): void {
    this.doctorService.getDoctorsBySpecialization(this.docId).subscribe(
      (doctors) => {
        if (doctors && doctors.length > 0) {
          const doctor = doctors[0];
          this.clinicId = doctor.clinicId;
          this.specializationId = doctor.specializationId;
        } else {
          // this.showTranslatedToastr('warning', 'no_doctor_found', 'No doctor found with the given specialization ID.');
        }
      },
      (error) => {
        this.showTranslatedToastr('error', 'doctor_details_error', 'Error fetching doctor details');
      }
    );
  }

  loadTimeSlots(): void {
    this.appointmentService.getFutureTimeSlotsByDate(this.selectedDate, this.docId).subscribe(
      (response) => {
        this.timeSlots = response.data || [];
      },
      (error) => {
        this.showTranslatedToastr('error', 'timeslots_error', 'Error loading available time slots');
      }
    );
  }

  openModal(timeSlot: any): void {
    this.selectedTimeSlot = timeSlot;
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.selectedTimeSlot = null;
  }

  confirmReschedule(): void {
    if (!this.selectedTimeSlot || !this.appointmentId) {
      this.showTranslatedToastr('error', 'missing_reschedule_info', 'Missing required rescheduling information');
      return;
    }
  
    const rescheduleData = {
      appointmentId: this.appointmentId,
      newTimeSlotId: this.selectedTimeSlot.id
    };
  
    this.appointmentService.rescheduleAppointment(rescheduleData).subscribe(
      response => {
        this.showTranslatedToastr('success', 'reschedule_success', 'Your appointment has been rescheduled successfully!');
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      error => {
        this.showTranslatedToastr('error', 'reschedule_error', 'An error occurred while rescheduling');
      }
    );
  
    this.closeModal();
  }
}