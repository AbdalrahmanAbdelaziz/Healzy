import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { PatientService } from '../../../services/patient.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { ServiceOfDoctor } from '../../../services/doctorService.service';
import { UserService } from '../../../services/user.service';
import { FileSizePipe } from '../../../services/file-size.pipe';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { DoctorService } from '../../../services/doctor.service';
import { forkJoin } from 'rxjs';
import { normalizeAppointmentData } from '../../../shared/appointment.utils';

@Component({
  selector: 'app-d-view-pp',
  standalone: true,
  imports: [CommonModule, FormsModule, DHeaderComponent, DSidenavbarComponent, FileSizePipe, TranslocoModule],
  templateUrl: './d-view-pp.component.html',
  styleUrls: ['./d-view-pp.component.css']
})
export class DViewPpComponent implements OnInit {
  appointmentId!: number;
  appointmentDetails: any;
  patientDetails: any;
  isLoading: boolean = true;
  currentTab: string = 'personal';
  doctorServices: any[] = [];
  selectedServices: any[] = [];
  totalAmount: number = 0;
  totalDiscount: number = 0;
  visitHistory: any[] = [];
  filteredVisitHistory: any[] = [];
  historySearchTerm: string = '';
  historySortBy: string = 'dateDesc';
  expandedVisits: { [key: number]: boolean } = {};
  currentDiagnosis: string = '';
  currentSigns: string = '';
  currentPrescription: string = '';
  uploadedFiles: any[] = [];
  isDragOver: boolean = false;
  isSubmitting: boolean = false;
  doctorCheckPrice: number = 0;
  doctorCheckPriceDiscount: number = 0;
  doctorCheckPriceApplied: boolean = false;
  originalCheckPrice: number = 0;
  currentAppointmentMedicalRecord: any = null;
  currentDoctorName: string = '';
 
  isSettingCheckPrice: boolean = false;
  
  isCheckPriceSet: boolean = false;
  serviceInstances: any[] = [];
selectedServiceId: number | null = null;
selectedService: any = null;
quantity: number = 1;
 userId!: number;
 includeCheckPrice: boolean = true; // Default to true
checkPrice: number = 0;



 

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private patientService: PatientService,
    private toastr: ToastrService,
    private servicesOfDoctor: ServiceOfDoctor,
    private doctorService: DoctorService,
    private userService: UserService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    const user = this.userService.getUser();
    if (user && user.data && user.data.firstName) {
      this.currentDoctorName = user.data.firstName;
    }

    this.route.queryParams.subscribe(params => {
      this.appointmentId = +params['appointmentId'];
      const doctorId = params['doctorId'] || (user?.data?.doctorId || user?.data?.id);
      
  if (this.appointmentId && doctorId) {
      this.userId = +doctorId;
      this.loadAppointmentDetails();
    } else {
      this.showTranslatedToastr('error', 'no_appointment_id', 'No appointment ID or doctor ID provided');
      this.router.navigate(['/doctor-home']);
    }
  });
  }

  private showTranslatedToastr(type: 'success' | 'error' | 'info' | 'warning', key: string, defaultMessage: string): void {
    const message = this.translocoService.translate(`toastr.${key}`) || defaultMessage;
    const title = this.translocoService.translate(`toastr.${type}`) ||
                  type.charAt(0).toUpperCase() + type.slice(1);
    this.toastr[type](message, title);
  }

  loadCheckPriceFromUser(): void {
    const user = this.userService.getUser();
    if (user && user.data.checkPrice) {
      this.doctorCheckPrice = user.data.checkPrice;
      this.originalCheckPrice = this.doctorCheckPrice;
    } else {
      this.doctorCheckPrice = 0;
      this.originalCheckPrice = 0;
      console.warn('No check price found in user data');
    }
  }

  validateCheckPriceDiscount(): void {
    if (this.doctorCheckPriceDiscount > 100) {
      this.doctorCheckPriceDiscount = 100;
    } else if (this.doctorCheckPriceDiscount < 0) {
      this.doctorCheckPriceDiscount = 0;
    }

    if (this.doctorCheckPriceDiscount > 0) {
      const discountAmount = this.originalCheckPrice * (this.doctorCheckPriceDiscount / 100);
      this.doctorCheckPrice = this.originalCheckPrice - discountAmount;
    } else {
      this.doctorCheckPrice = this.originalCheckPrice;
    }
  }

  applyCheckPriceDiscount(): void {
    this.validateCheckPriceDiscount();
    this.doctorCheckPriceApplied = true;
    this.calculateTotal();
  }



  validatePrice(service: any): void {
    if (service.price < 0) {
      service.price = 0;
    }
    // You can add additional validation if needed
  }



// Generate service instances for display
getServiceInstances(service: any): any[] {
  const instances = [];
  for (let i = 0; i < service.quantity; i++) {
    instances.push({
      serviceId: service.id,
      instanceNumber: i + 1,
      price: this.getDiscountedPrice(service)
    });
  }
  return instances;
}

// Check if instance is already added
isServiceInstanceAdded(service: any, instanceNumber: number): boolean {
  return this.selectedServices.some(s => 
    s.id === service.id && s.instanceNumber === instanceNumber
  );
}

// Add a specific service instance
addServiceInstance(service: any): void {
  // Check if already added
  const instanceNumber = this.getNextInstanceNumber(service.id);
  if (instanceNumber > service.quantity) return;

  const serviceToAdd = {
    ...service,
    instanceNumber: instanceNumber,
    singleServicePriceForAppointment: this.getDiscountedPrice(service)
  };

  this.selectedServices.push(serviceToAdd);
  this.calculateTotal();
}

// Get next available instance number for a service
getNextInstanceNumber(serviceId: number): number {
  const existingInstances = this.selectedServices
    .filter(s => s.id === serviceId)
    .map(s => s.instanceNumber);
  
  if (existingInstances.length === 0) return 1;
  
  const maxInstance = Math.max(...existingInstances);
  return maxInstance + 1;
}

// Calculate discounted price
getDiscountedPrice(service: any): number {
  if (service.discountPercentage > 0) {
    return service.originalPrice * (1 - (service.discountPercentage / 100));
  }
  return service.originalPrice;
}

// Remove service from selected
// removeService(index: number): void {
//   this.selectedServices.splice(index, 1);
//   this.calculateTotal();
// }

removeService(index: number, appointmentServiceId: number): void {
  this.appointmentService.removeServiceFromAppointment(appointmentServiceId).subscribe({
    next: () => {
      this.selectedServices.splice(index, 1);
      this.calculateTotal();
      this.showTranslatedToastr('success', 'service_removed', 'Service removed successfully');
    },
    error: (err) => {
      this.showTranslatedToastr('error', 'remove_service_error', 'Failed to remove service');
    }
  });
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

loadAppointmentDetails(): void {
  this.isLoading = true;
  this.appointmentService.getAppointmentById(this.appointmentId).subscribe({
    next: (appointment) => {
      // Normalize the data before using it
      this.appointmentDetails = normalizeAppointmentData(appointment.data);
      
      // Fetch the doctor's check price using the doctorId
      if (this.appointmentDetails.doctorId) {
        this.fetchDoctorCheckPrice(this.appointmentDetails.doctorId);
      }
      
      this.loadPatientDetails(this.appointmentDetails.patientID);
      this.loadCurrentAppointmentMedicalRecord(this.appointmentDetails.patientID);
      this.loadDoctorServices();
    },
    error: (err) => {
      this.isLoading = false;
      this.showTranslatedToastr('error', 'load_appointment_error', 'Failed to load appointment details');
    }
  });
}

loadDoctorServices() {
  // Use the doctorId from appointmentDetails if available, otherwise from user
  const doctorId = this.appointmentDetails?.doctorId || 
                  this.userService.getUser()?.data?.doctorId;
  
  if (doctorId) {
    this.servicesOfDoctor.getServicesByDoctorId(doctorId).subscribe({
      next: (response) => {
        this.doctorServices = response.data.map((service: any) => ({
          ...service,
          price: parseFloat(service.servicePrice),
          originalPrice: parseFloat(service.servicePrice),
          customPrice: null // Initialize custom price
        }));
      },
      error: (err) => {
        this.showTranslatedToastr('error', 'load_services_error', 'Failed to load doctor services');
      }
    });
  }
}
  loadPatientDetails(patientId: number): void {
    this.patientService.getPatientById(patientId).subscribe({
      next: (patient) => {
        this.patientDetails = patient.data;
      },
      error: (err) => {
        this.showTranslatedToastr('error', 'load_patient_error', 'Failed to load patient details');
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

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  handleFiles(files: FileList): void {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        this.showTranslatedToastr('warning', 'file_too_large', `File ${file.name} is too large (max 5MB)`);
        continue;
      }

      if (!['image/jpeg', 'image/png', 'application/pdf', 'text/plain'].includes(file.type)) {
        this.showTranslatedToastr('warning', 'unsupported_file_type', `File type not supported: ${file.name}`);
        continue;
      }

      if (file.type.includes('image')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.uploadedFiles.push({
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            url: e.target.result,
            previewUrl: e.target.result
          });
        };
        reader.readAsDataURL(file);
      } else {
        this.uploadedFiles.push({
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file)
        });
      }
    }
  }

  removeFile(index: number): void {
    if (this.uploadedFiles[index].url && !this.uploadedFiles[index].type.includes('image')) {
      URL.revokeObjectURL(this.uploadedFiles[index].url);
    }
    this.uploadedFiles.splice(index, 1);
  }

  saveDraft(): void {
    this.showTranslatedToastr('info', 'draft_saved', 'Draft saved locally');
  }

  submitVisitDetails(): void {
    if (!this.currentDiagnosis && !this.currentSigns && !this.currentPrescription && this.uploadedFiles.length === 0) {
      this.showTranslatedToastr('warning', 'missing_details', 'Please add at least one detail (diagnosis, signs, prescription) or upload files');
      return;
    }

    this.isSubmitting = true;

    const files = this.uploadedFiles.map(file => file.file);

    this.patientService.addMedicalRecord(
      this.patientDetails.id,
      this.currentDiagnosis || '',
      '',
      this.currentSigns || '',
      this.currentPrescription || '',
      files,
      this.appointmentId
    ).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.showTranslatedToastr('success', 'medical_record_added', 'Medical record added successfully');
        // this.loadCurrentAppointmentMedicalRecord(this.patientDetails.id);
        // this.changeTab('history');

        this.currentDiagnosis = '';
        this.currentSigns = '';
        this.currentPrescription = '';
        this.uploadedFiles = [];
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showTranslatedToastr('error', 'medical_record_error', 'Error adding medical record');
        console.error('Error adding medical record:', err);
      }
    });
  }

  changeTab(tab: string): void {
    this.currentTab = tab;
    if (tab === 'current') {
      this.loadDoctorServices();
    }
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

  validateDiscount(service: any): void {
    if (service.discountPercentage > 100) {
      service.discountPercentage = 100;
    } else if (service.discountPercentage < 0) {
      service.discountPercentage = 0;
    }

    if (!service.originalPrice) {
      service.originalPrice = service.price;
    }

    if (service.discountApplied) {
      const discountAmount = service.originalPrice * (service.discountPercentage / 100);
      service.price = service.originalPrice - discountAmount;
    } else {
      service.price = service.originalPrice;
    }
  }

  addSameServiceAgain(service: any): void {
  const originalService = this.doctorServices.find(s => s.id === service.id);
  if (!originalService) return;

  const serviceCopy = {
    ...originalService,
    price: service.price, 
    discountPercentage: service.discountPercentage 
  };

  this.addService(serviceCopy);
}

addService(service: any, quantity: number = 1): void {
  // Use the price that was explicitly passed in the service object
  const priceToUse = service.singleServicePriceForAppointment;

  this.appointmentService.addServiceToAppointment(
    service.id,
    this.appointmentId,
    quantity,
    priceToUse // THIS is what gets sent to backend
  ).subscribe({
    next: (response) => {
      const addedService = {
        ...service,
        appointmentServiceId: response.data.id,
        quantity: quantity,
        price: priceToUse // Store the actual price used
      };
      
      this.selectedServices.push(addedService);
      this.calculateTotal();
      
      console.log('Service successfully added with price:', priceToUse);
      this.showTranslatedToastr('success', 'service_added', 'Service added successfully');
    },
    error: (err) => {
      console.error('Error adding service with price:', priceToUse, err);
      this.showTranslatedToastr('error', 'add_service_error', 'Failed to add service');
    }
  });
}



  getServicesSubtotal(): number {
    return this.selectedServices.reduce((total, service) => {
      return total + (service.price || 0);
    }, 0);
  }




  completeVisit(): void {
    const visitData = {
      appointmentId: this.appointmentId,
      checkPrice: this.doctorCheckPriceApplied ? this.doctorCheckPrice : 0
    };

    this.appointmentService.completeVisit(visitData).subscribe({
      next: () => {
        this.showTranslatedToastr('success', 'visit_completed', 'Patient processed successfully');
        this.router.navigate(['/doctor-home']);
      },
      error: (err) => {
        this.showTranslatedToastr('error', 'complete_visit_error', 'Failed to complete visit');
      }
    });
  }

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServices.some(service => service.id === serviceId);
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

  toggleCheckPrice(): void {
    this.includeCheckPrice = !this.includeCheckPrice;
    if (!this.includeCheckPrice) {
      this.doctorCheckPriceApplied = false;
      this.calculateTotal();
    }
  }

setCheckPrice(): void {
  if (this.checkPrice <= 0) {
    this.toastr.warning(
      this.translocoService.translate('appointments.invalidCheckPrice'),
      '',
      { timeOut: 3000 }
    );
    this.includeCheckPrice = false; // Reset toggle if invalid
    return;
  }

  this.isSettingCheckPrice = true;
  
  this.appointmentService.setAppointmentCheckPrice(
    this.appointmentId, 
    this.checkPrice // Use the price fetched from the API
  ).subscribe({
    next: () => {
      this.isSettingCheckPrice = false;
      this.isCheckPriceSet = true;
      this.toastr.success(
        this.translocoService.translate('appointments.checkPriceSet'),
        '',
        { timeOut: 3000 }
      );
      this.calculateTotal();
    },
    error: (err) => {
      this.isSettingCheckPrice = false;
      this.includeCheckPrice = false; // Reset toggle on error
      this.toastr.error(
        this.translocoService.translate('appointments.setCheckPriceError'),
        '',
        { timeOut: 3000 }
      );
    }
  });
}

  navigateToDoctorHome(): void {
    this.router.navigate(['/doctor-home']);
  }



calculateTotal(): void {
  const checkPriceAmount = this.includeCheckPrice ? this.checkPrice : 0;
  this.totalAmount = this.selectedServices.reduce((total, service) => {
    return total + (service.price * service.quantity);
  }, 0) + checkPriceAmount;
}






incrementQuantity(): void {
  this.quantity++;
}

decrementQuantity(): void {
  if (this.quantity > 1) {
    this.quantity--;
  }
}

validateQuantity(): void {
  if (this.quantity < 1) this.quantity = 1;
  if (this.quantity > 99) this.quantity = 99;
}



loadCurrentAppointmentMedicalRecord(patientId: number): void {
  this.loadVisitHistoryWithServices(patientId);
}


loadVisitHistoryWithServices(patientId: number): void {
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
  this.patientService.getPatientMedicalRecordForAppointment(patientId, docId).subscribe({
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
                isCurrentAppointment: (entry.appointmentId === this.appointmentId),
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




// Update your onServiceSelect method to include customPrice initialization
onServiceSelect(): void {
  // Clear selection if no service is selected
  if (this.selectedServiceId === null) {
    this.selectedService = null;
    return;
  }

  // Find the selected service - using + to ensure numeric comparison
  const service = this.doctorServices.find(s => s.id === +this.selectedServiceId!);
  
  if (service) {
    this.selectedService = { 
      ...service,
      price: parseFloat(service.servicePrice),
      originalPrice: parseFloat(service.servicePrice),
      customPrice: null // Initialize custom price as null
    };
    this.quantity = 1;
  } else {
    this.selectedService = null;
  }
}



///////



resetCustomPrice(): void {
  if (this.selectedService) {
    this.selectedService.customPrice = null;
  }
}

addSelectedService(): void {
  if (!this.selectedService) return;

  // ALWAYS use customPrice if it exists (even if it's the same as original)
  const finalPrice = this.selectedService.customPrice !== null && 
                    this.selectedService.customPrice !== undefined ?
                    this.selectedService.customPrice : 
                    this.selectedService.price;

  console.log('Adding service with price:', finalPrice, 
             '(Original:', this.selectedService.price, ')');

  const serviceToAdd = {
    ...this.selectedService,
    quantity: this.quantity,
    singleServicePriceForAppointment: finalPrice // This is the key line
  };

  this.addService(serviceToAdd, this.quantity);
  
  this.selectedServiceId = null;
  this.selectedService = null;
  this.quantity = 1;
}

focusCustomPriceInput(): void {
  setTimeout(() => {
    const input = document.querySelector('.custom-price-input input') as HTMLInputElement;
    if (input) {
      input.focus();
    }
    if (this.selectedService && !this.selectedService.customPrice) {
      this.selectedService.customPrice = this.selectedService.price;
    }
  }, 0);
}

validateCustomPrice(): void {
  if (this.selectedService && this.selectedService.customPrice !== null) {
    // Ensure price is not negative
    if (this.selectedService.customPrice < 0) {
      this.selectedService.customPrice = 0;
    }
    // Round to 2 decimal places
    this.selectedService.customPrice = Math.round(this.selectedService.customPrice * 100) / 100;
  }
}


onCheckPriceToggle() {
  const newCheckPriceValue = this.includeCheckPrice ? this.checkPrice : 0;
  const action = this.includeCheckPrice ? 'included' : 'excluded';
  
  this.isSettingCheckPrice = true;
  
  this.appointmentService.setAppointmentCheckPrice(
    this.appointmentId, 
    newCheckPriceValue
  ).subscribe({
    next: () => {
      this.isSettingCheckPrice = false;
      this.showTranslatedToastr(
        'success',
        `check_price_${action}`,
        `Check price ${action === 'included' ? 'added to' : 'removed from'} receipt`
      );
      this.calculateTotal();
    },
    error: (err) => {
      this.isSettingCheckPrice = false;
      this.includeCheckPrice = !this.includeCheckPrice; // Revert the toggle on error
      this.showTranslatedToastr(
        'error',
        'check_price_update_failed',
        'Failed to update check price status'
      );
    }
  });
}

fetchDoctorCheckPrice(docId: number): void {
  this.doctorService.getCheckPriceByDocId(docId).subscribe({
    next: (price) => {
      this.checkPrice = price;
      this.appointmentDetails.checkPrice = price; // Update appointment details if needed
      this.originalCheckPrice = price; // Set original price for discount calculations
    },
    error: (err) => {
      console.error('Failed to fetch doctor check price:', err);
      this.checkPrice = 0;
      this.appointmentDetails.checkPrice = 0;
    }
  });
}





}