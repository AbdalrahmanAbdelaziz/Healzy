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
  styleUrl: './service-setting.component.css'
})
export class ServiceSettingComponent implements OnInit {
  doctorServices: any[] = [];
  availableServices: any[] = [];
  isModalOpen: boolean = false;

  constructor(
    private serivicesOfDoctor: ServiceOfDoctor,
    private doctorService: DoctorService,
    private userService: UserService,
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadDoctorServices();
  }

  loadDoctorServices() {
    const user = this.userService.getUser();
    if (user && user.data.doctorId) {
      this.serivicesOfDoctor.getServicesByDoctorId(user.data.doctorId).subscribe((response) => {
        this.doctorServices = response.data;
      });
    }
  }

  openServiceModal() {
    const user = this.userService.getUser();
    if (user && user.data.specializationId) {
      this.serivicesOfDoctor.getServicesBySpecializationId(user.data.specializationId).subscribe(
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
    } else {
      console.error('Specialization ID is missing in user data.');
      this.toastr.error(this.translocoService.translate('error.specialization_missing'), 'Error');
    }
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
    const user = this.userService.getUser();
    if (!user || !user.data.doctorId) {
      console.error('Doctor ID is missing in user data.');
      this.toastr.error(this.translocoService.translate('error.specialization_missing'), 'Error');
      return;
    }

    const requestBody = {
      doctorPriceForService: service.price || 0,
      doctorAvgDurationForServiceInMinutes: service.doctorAvgDurationForServiceInMinutes || 0,
      specializationServiceId: service.id,
      doctorId: user.data.doctorId
    };

    this.serivicesOfDoctor.assignServiceToDoctor(requestBody).subscribe(
      (response) => {
        if (response.message === 'This service is already assigned to you.') {
          this.toastr.warning(this.translocoService.translate('info.already_assigned'), 'Info');
        } else {
          this.toastr.success(this.translocoService.translate('success.service_added'), 'Success');
          this.loadDoctorServices();
          this.closeServiceModal();
        }
      },
      (error) => {
        console.error('Error assigning service to doctor:', error);
        this.toastr.info(this.translocoService.translate('info.already_assigned'), 'Info');
      }
    );
  }
}
