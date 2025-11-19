import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { DoctorService } from '../../../services/doctor.service';
import { UserService } from '../../../services/user.service';
import { ServiceOfDoctor } from '../../../services/doctorService.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { LoginResponse } from '../../../shared/models/login-response';
import { Doctor } from '../../../shared/models/doctor.model';

@Component({
  selector: 'app-service-setting',
  imports: [
    CommonModule,
    RouterModule,
    SHeaderComponent,
    SSidenavbarComponent,
    FormsModule,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './service-setting.component.html',
  styleUrls: ['./service-setting.component.css']
})
export class ServiceSettingComponent implements OnInit {
  doctorServices: any[] = [];
  availableServices: any[] = [];
  isModalOpen: boolean = false;
  doctorId!: number;
  doctorSpecializationId: number | null = null;

  constructor(
    private serivicesOfDoctor: ServiceOfDoctor,
    private doctorService: DoctorService,
    private userService: UserService,
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadDoctorIdAndServices();
  }

  private loadDoctorIdAndServices(): void {
    const user: LoginResponse | null = this.userService.getUser();

    if (!user) {
      console.error('No user data found.');
      return;
    }

    if (user.data.applicationRole_En === 'Secretary') {
      // Secretary: fetch the doctor assigned to them
      this.doctorService.getDoctorsFromSecretary().subscribe({
        next: (doctor: Doctor) => {
          if (doctor && doctor.id) {
            this.doctorId = doctor.id;
            this.doctorSpecializationId = doctor.specializationId; // <-- use specializationId directly
            this.userService.setDoctorIdForSecretary(this.doctorId);
            this.loadDoctorServices();
          } else {
            console.warn('No doctor assigned to this secretary.');
            this.toastr.warning(this.translocoService.translate('errors.noDoctorAssigned'));
          }
        },
        error: (err) => {
          console.error('Error fetching doctor for secretary:', err);
          this.toastr.error(this.translocoService.translate('error.fetch_doctors_failed'), 'Error');
        }
      });
    } else if (user.data.applicationRole_En === 'Doctor') {
      // Doctor: use own ID
      this.doctorId = user.data.id;
      this.doctorSpecializationId = user.data.specializationId;
      this.loadDoctorServices();
    } else {
      console.error('No valid doctor ID available.');
    }
  }

  openServiceModal() {
    if (!this.doctorSpecializationId) {
      console.error('Specialization ID is missing.');
      this.toastr.error(this.translocoService.translate('error.specialization_missing'), 'Error');
      return;
    }

    this.serivicesOfDoctor.getServicesBySpecializationId(this.doctorSpecializationId).subscribe(
      (response) => {
        this.availableServices = response.data.map((service: any) => ({
          ...service,
          price: null,
          doctorAvgDurationForServiceInMinutes: null
        }));
        this.isModalOpen = true;
      },
      (error) => {
        console.error('Error fetching available services:', error);
        this.toastr.error(this.translocoService.translate('error.fetch_services_failed'), 'Error');
      }
    );
  }

  closeServiceModal() {
    this.isModalOpen = false;
  }

  validateAndAddService(service: any) {
    if (!service.price || !service.doctorAvgDurationForServiceInMinutes) {
      this.toastr.warning(this.translocoService.translate('warning.fill_all_fields'), 'Warning');
      return;
    }
    this.addService(service);
  }

  addService(service: any) {
    if (!this.doctorId) {
      console.error('Doctor ID is missing.');
      this.toastr.error(this.translocoService.translate('error.specialization_missing'), 'Error');
      return;
    }

    const requestBody = {
      doctorPriceForService: service.price || 0,
      doctorAvgDurationForServiceInMinutes: service.doctorAvgDurationForServiceInMinutes || 0,
      specializationServiceId: service.id,
      doctorId: this.doctorId
    };

    this.serivicesOfDoctor.assignServiceToDoctor(requestBody).subscribe({
      next: (response) => {
        if (response.message === 'This service is already assigned to you.') {
          this.toastr.warning(this.translocoService.translate('info.already_assigned'), 'Info');
        } else {
          this.toastr.success(this.translocoService.translate('success.service_added'), 'Success');
          this.loadDoctorServices();
          this.closeServiceModal();
        }
      },
      error: (error) => {
        console.error('Error assigning service to doctor:', error);
        this.toastr.info(this.translocoService.translate('info.already_assigned'), 'Info');
      }
    });
  }

  private loadDoctorServices(): void {
    if (!this.doctorId) return;

    this.serivicesOfDoctor.getServicesByDoctorId(this.doctorId).subscribe({
      next: (response) => {
        this.doctorServices = response.data;
      },
      error: (err) => {
        console.error('Error loading doctor services:', err);
        this.toastr.error(this.translocoService.translate('error.fetch_services_failed'), 'Error');
      }
    });
  }
}
