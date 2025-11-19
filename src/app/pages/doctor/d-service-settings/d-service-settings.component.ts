import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { DHeaderComponent } from '../d-header/d-header.component';
import { FooterComponent } from '../../footer/footer.component';
import { UserService } from '../../../services/user.service';
import { ServiceOfDoctor } from '../../../services/doctorService.service';
import { DoctorService } from '../../../services/doctor.service';

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
  styleUrls: ['./d-service-settings.component.css']
})
export class DServiceSettingsComponent implements OnInit {
  doctorServices: any[] = [];
  availableServices: any[] = [];
  isModalOpen = false;

  constructor(
    private servicesOfDoctor: ServiceOfDoctor,
    private userService: UserService,
    private toastr: ToastrService,
    public translocoService: TranslocoService,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadDoctorServices();
  }

  // Load services already assigned to the doctor
  loadDoctorServices() {
    const user = this.userService.getUser();
    if (user && user.data?.id) {
      this.servicesOfDoctor.getServicesByDoctorId(user.data.id).subscribe({
        next: (res) => {
          this.doctorServices = res.data || [];
        },
        error: (err) => {
          console.error('Error loading doctor services:', err);
        }
      });
    }
  }

  // Open modal to select new services
  openServiceModal() {
    const specialization = this.userService.getDoctorSpecialization();

    if (!specialization?.id) {
      console.error('Specialization is missing in UserService.');
      this.toastr.error(this.translocoService.translate('error.specialization_missing'), 'Error');
      return;
    }

    this.servicesOfDoctor.getServicesBySpecializationId(specialization.id).subscribe({
      next: (response) => {
        this.availableServices = (response.data || []).map((service: any) => ({
          ...service,
          price: 0,
          doctorAvgDurationForServiceInMinutes: 0
        }));
        this.isModalOpen = true;
      },
      error: (err) => {
        console.error('Error fetching available services:', err);
        this.toastr.error(this.translocoService.translate('error.fetch_services_failed'), 'Error');
      }
    });
  }

  closeServiceModal() {
    this.isModalOpen = false;
  }

  // Validate modal inputs before adding
  validateAndAddService(service: any) {
    console.log('Clicked Add Service:', service);

    if (!service.price || service.price <= 0) {
      this.toastr.warning(this.translocoService.translate('warning.fill_price'), 'Warning');
      return;
    }

    if (!service.doctorAvgDurationForServiceInMinutes || service.doctorAvgDurationForServiceInMinutes <= 0) {
      this.toastr.warning(this.translocoService.translate('warning.fill_duration'), 'Warning');
      return;
    }

    this.addService(service);
  }

  // Call API to assign service to doctor
  addService(service: any) {
    const user = this.userService.getUser();
    const specializationId = this.userService.getDoctorSpecialization()?.id;

    if (!user?.data?.id || !specializationId) {
      console.error('Missing doctor or specialization ID.');
      this.toastr.error(this.translocoService.translate('error.specialization_missing'), 'Error');
      return;
    }

    const requestBody = {
      doctorPriceForService: service.price,
      doctorAvgDurationForServiceInMinutes: service.doctorAvgDurationForServiceInMinutes,
      specializationServiceId: service.id,
      doctorId: user.data.id,          // Use user ID as doctor ID
      specializationId: specializationId
    };

    console.log('Assign Service Request Body:', requestBody);

    this.servicesOfDoctor.assignServiceToDoctor(requestBody).subscribe({
      next: (res) => {
        if (res.message === 'This service is already assigned to you.') {
          this.toastr.warning(this.translocoService.translate('info.already_assigned'), 'Info');
        } else {
          this.toastr.success(this.translocoService.translate('success.service_added'), 'Success');
          this.loadDoctorServices();
          this.closeServiceModal();
        }
      },
      error: (err) => {
        console.error('Error assigning service:', err);
        this.toastr.warning(this.translocoService.translate('info.assign_failed'), 'Error');
      }
    });
  }
}
