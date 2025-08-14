import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DoctorService } from '../../../services/doctor.service';
import { ToastrService } from 'ngx-toastr';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { MangeTimeslotService } from '../../../services/mange-timeslot.service';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-d-timeslot-management',
   imports: [
     CommonModule,
     RouterModule,
     FormsModule,
     DHeaderComponent,
     DSidenavbarComponent,
     ReactiveFormsModule,
     TranslocoModule,
     FooterComponent
   ],
  templateUrl: './d-timeslot-management.component.html',
  styleUrl: './d-timeslot-management.component.css'
})
export class DTimeslotManagementComponent implements OnInit {
  timeSlotForm!: FormGroup;
  weekDays: { day: string, date: string }[] = [];
  doctorId!: number; // Add a property to store the doctor ID

  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private toastr: ToastrService,
    private userService: UserService,
    private mangeTimeslotService: MangeTimeslotService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.generateWeekDays();

    // Get the doctor ID from the logged-in secretary's data
    const user: LoginResponse | null = this.userService.getUser();
    if (user && user.data.doctorId) {
      this.doctorId = user.data.doctorId; // Fetch the doctorId from the secretary's data
    } else {
      console.error('Error: No doctor ID found in the logged-in secretary\'s data.');
      this.toastr.error('No doctor ID found. Please contact support.');
    }

    // Initialize form
    this.timeSlotForm = this.fb.group({
      selectedDay: [null, Validators.required],
      workingFrom: ['', Validators.required],  // 00:00:00 format
      workingTo: ['', Validators.required],
      slotInterval: [null, [Validators.required, Validators.min(1)]], // Default 15 mins
      repeatWeeks: [null, [Validators.required, Validators.min(1)]], // Default 1 week
    });
  }

  // Generate the next 7 days dynamically
  generateWeekDays() {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today); // Create a new Date object for each iteration
      date.setDate(today.getDate() + i); // Add 'i' days to the current date
  
      // Format the date as YYYY-MM-DD in local time
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
  
      this.weekDays.push({
        day: date.toLocaleDateString('en-US', { weekday: 'long' }), // Full day name (e.g., Monday)
        date: formattedDate // Date in YYYY-MM-DD format
      });
  
      console.log('Generated day:', this.weekDays[i]); // Log each generated day
    }
  }
  // Submit form data
  onSubmit() {
    if (this.timeSlotForm.valid && this.doctorId) {
      const formData = this.timeSlotForm.value;
  
      // Add seconds to the time values
      const timeSlotData = {
        intervalDate: formData.selectedDay,
        intervalStartTime: formData.workingFrom + ':00', // Add seconds
        intervalEndTime: formData.workingTo + ':00', // Add seconds
        intervalPeriodInMinutes: formData.slotInterval,
        doctorId: this.doctorId,
        numberOfWeeksToRepeat: formData.repeatWeeks
      };
  
      this.mangeTimeslotService.createTimeSlot(timeSlotData).subscribe({
        next: (response) => {
          this.toastr.success(this.translocoService.translate('toast.timeSlotsCreated'));
          this.timeSlotForm.reset();
        },
        error: (error) => {
          console.error('Failed to create time slots:', error);
          this.toastr.error(this.translocoService.translate('toast.timeSlotsError'));
        }
      });
    } else {
      this.toastr.warning(this.translocoService.translate('toast.timeSlotsWarning'));
    }
  }
}
