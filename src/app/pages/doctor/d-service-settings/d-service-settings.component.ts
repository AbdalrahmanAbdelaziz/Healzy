import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DoctorService } from '../../../services/doctor.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service'; // Import UserService
import { ServiceOfDoctor } from '../../../services/doctorService.service';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-d-service-settings',
  imports: [
    CommonModule,
    RouterModule,
    DHeaderComponent,
    FooterComponent,
    FormsModule,
    TranslocoModule
  ],
  templateUrl: './d-service-settings.component.html',
  styleUrl: './d-service-settings.component.css'
})
export class DServiceSettingsComponent implements OnInit {
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
      doctorId: user.data.doctorId,
      specializationId: user.data.specializationId 
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

