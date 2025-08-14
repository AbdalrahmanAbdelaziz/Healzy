import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../../services/patient.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { UserService } from '../../../services/user.service';
import { FileSizePipe } from '../../../services/file-size.pipe';
import { forkJoin } from 'rxjs';
import { AppointmentService } from '../../../services/appointment.service';

@Component({
  selector: 'app-d-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DHeaderComponent, DSidenavbarComponent, FileSizePipe, TranslocoModule],
  templateUrl: './d-patient-profile.component.html',
  styleUrls: ['./d-patient-profile.component.css']
})
export class DPatientProfileComponent implements OnInit {
  patientId!: number;
  patientDetails: any;
  isLoading: boolean = true;
  currentTab: string = 'personal';
  visitHistory: any[] = [];
  filteredVisitHistory: any[] = [];
  historySearchTerm: string = '';
  historySortBy: string = 'dateDesc';
  expandedVisits: { [key: number]: boolean } = {};
  currentDoctorName: string = '';
  currentAppointmentMedicalRecord: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private userService: UserService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    const user = this.userService.getUser();
    if (user && user.data && user.data.firstName) {
      this.currentDoctorName = user.data.firstName;
    }

    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      if (this.patientId) {
        this.loadPatientDetails();
        this.loadVisitHistoryWithServices();
      } else {
        this.showTranslatedToastr('error', 'no_patient_id', 'No patient ID provided');
        this.router.navigate(['/doctor-patients']);
      }
    });
  }

  private showTranslatedToastr(type: 'success' | 'error' | 'info' | 'warning', key: string, defaultMessage: string): void {
    const message = this.translocoService.translate(`toastr.${key}`) || defaultMessage;
    const title = this.translocoService.translate(`toastr.${type}`) ||
                  type.charAt(0).toUpperCase() + type.slice(1);
    this.toastr[type](message, title);
  }

  loadPatientDetails(): void {
    this.patientService.getPatientById(this.patientId).subscribe({
      next: (response) => {
        this.patientDetails = response.data;
      },
      error: (err) => {
        this.isLoading = false;
        this.showTranslatedToastr('error', 'load_patient_error', 'Failed to load patient details');
      }
    });
  }

  loadVisitHistoryWithServices(): void {
    this.isLoading = true;
    
    // Get the doctorId from the user service
    const user = this.userService.getUser();
    const docId = user?.data?.doctorId || user?.data?.id;
    
    if (!docId) {
      this.isLoading = false;
      this.showTranslatedToastr('error', 'no_doctor_id', 'Doctor ID not found in user data');
      return;
    }

    // First get the medical records with both patientId and docId
    this.patientService.getPatientMedicalRecordForAppointment(this.patientId, docId).subscribe({
      next: (medicalRecordsResponse: any) => {
        if (medicalRecordsResponse.data?.entries?.length > 0) {
          const entries = medicalRecordsResponse.data.entries;
          
          // Create an array of observables to get receipt for each appointment
          const receiptObservables = entries.map((entry: any) => 
            this.appointmentService.getAppointmentReceipt(entry.appointmentId)
          );

          // Execute all requests in parallel with proper typing
          forkJoin(receiptObservables).subscribe({
            next: (receiptResponses: unknown) => {
              // Cast the response to any[] since we know the structure
              const responses = receiptResponses as any[];
              
              this.visitHistory = entries.map((entry: any, index: number) => {
                const receipt = responses[index]?.data;
                const services = receipt?.appointmentServicesResponses || [];
                
                return {
                  ...entry,
                  doctorName: entry.doctorName || this.currentDoctorName,
                  date: entry.entryDate,
                  attachments: entry.fileUrls ? entry.fileUrls.map((url: string) => this.transformFileUrlToAttachment(url)) : [],
                  services: services.map((service: any) => ({
                    name: service.serviceName,
                    description: service.serviceDescription,
                    quantity: service.quantity,
                    price: service.singleServicePriceForAppointment,
                    total: service.quantity * service.singleServicePriceForAppointment
                  })),
                  paymentInfo: {
                    totalPrice: receipt?.totalPrice || 0,
                    paidCash: receipt?.paidCash || 0,
                    paidInstapay: receipt?.paidInstapay || 0,
                    paidWallet: receipt?.paidWallet || 0,
                    paidVisa: receipt?.paidVisa || 0,
                    remainingToPay: receipt?.remainingToPay || 0
                  }
                };
              });

              this.filteredVisitHistory = [...this.visitHistory];
              this.isLoading = false;
              this.filterHistory();
            },
            error: (err: any) => {
              console.error('Error loading receipts:', err);
              this.isLoading = false;
              this.showTranslatedToastr('error', 'load_receipts_error', 'Error loading appointment receipts');
            }
          });
        } else {
          this.visitHistory = [];
          this.filteredVisitHistory = [];
          this.isLoading = false;
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.showTranslatedToastr('error', 'load_medical_record_error', 'Error loading medical record entries');
      }
    });
  }

  transformFileUrlToAttachment(fileUrl: string): any {
    const fileName = fileUrl.split('\\').pop() || fileUrl.split('/').pop() || 'file';
    const extension = fileName.split('.').pop()?.toLowerCase();
    let fileType = 'application/octet-stream';
    
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
      fileType = 'image/' + extension;
    } else if (extension === 'pdf') {
      fileType = 'application/pdf';
    } else if (extension === 'txt') {
      fileType = 'text/plain';
    }
    
    const baseUrl = 'https://hogozati.rossodirect.com:1234/';
    const properUrl = fileUrl.startsWith('wwwroot') 
      ? baseUrl + fileUrl.replace(/\\/g, '/').replace('wwwroot/', '')
      : fileUrl;
    
    return {
      name: fileName,
      type: fileType,
      url: properUrl,
      size: 0
    };
  }

  viewImage(file: any): void {
    const imageUrl = file.url || file.previewUrl;

    if (!imageUrl) {
      this.showTranslatedToastr('error', 'file_url_missing', 'File URL is missing for viewing.');
      return;
    }

    if (file.type.includes('image')) {
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '1000';
      modal.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.src = imageUrl;
      img.style.maxWidth = '90%';
      img.style.maxHeight = '90%';
      img.style.objectFit = 'contain';

      modal.appendChild(img);

      modal.onclick = () => {
        document.body.removeChild(modal);
      };

      document.body.appendChild(modal);
    } else if (file.type === 'application/pdf' || file.type === 'text/plain') {
      window.open(imageUrl, '_blank');
    } else {
      this.showTranslatedToastr('info', 'cannot_preview_file', 'Cannot preview this file type. Attempting to open in new tab.');
      window.open(imageUrl, '_blank');
    }
  }

  calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  filterHistory(): void {
    if (!this.historySearchTerm) {
      this.filteredVisitHistory = [...this.visitHistory];
    } else {
      const term = this.historySearchTerm.toLowerCase();
      this.filteredVisitHistory = this.visitHistory.filter(visit => {
        return (
          (visit.diagnosis && visit.diagnosis.toLowerCase().includes(term)) ||
          (visit.doctorName && visit.doctorName.toLowerCase().includes(term)) ||
          (visit.prescriptions && visit.prescriptions.toLowerCase().includes(term))
        );
      });
    }
    this.sortHistory();
  }

  sortHistory(): void {
    if (this.historySortBy === 'dateDesc') {
      this.filteredVisitHistory.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      this.filteredVisitHistory.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }

  toggleVisitDetails(visitId: number): void {
    this.expandedVisits[visitId] = !this.expandedVisits[visitId];
  }

  changeTab(tab: string): void {
    this.currentTab = tab;
  }

  formatDate(dateString: string): string {
    if (!dateString) return this.translocoService.translate('patient_profile.not_specified');

    const date = new Date(dateString);
    return date.toLocaleDateString(this.translocoService.getActiveLang(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get isArabic(): boolean {
    return this.translocoService.getActiveLang() === 'ar';
  }

  viewOrDownloadFile(file: any) {
    if (file.type.includes('image')) {
      this.viewImage(file);
    } else if (file.type.includes('pdf')) {
      window.open(file.url, '_blank');
    } else {
      console.log('Cannot display this file type directly:', file.name);
      window.open(file.url, '_blank');
    }
  }

  navigateToPatientsList(): void {
    this.router.navigate(['/doctor-patients']);
  }
}