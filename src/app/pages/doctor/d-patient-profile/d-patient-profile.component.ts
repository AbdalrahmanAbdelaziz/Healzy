import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../../services/patient.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DHeaderComponent } from '../d-header/d-header.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { UserService } from '../../../services/user.service';
import { forkJoin } from 'rxjs';
import { AppointmentService } from '../../../services/appointment.service';
import { BASE_URL } from '../../../shared/constants/urls';
import { DoctorService } from '../../../services/doctor.service';
import { MedicalRecordEntry } from '../../../shared/models/medical-record-entry.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// CAPACITOR IMPORTS
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-d-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DHeaderComponent, TranslocoModule],
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
  isCheckoutModalVisible: boolean = false;
  appointmentToCheckout: any = null;

  isSaving: { [key: number]: boolean } = {};
  originalVisitData: { [key: number]: any } = {};
  currentDoctorName: string = '';
  currentAppointmentMedicalRecord: any = null;
  BASE__URL = BASE_URL;
  expandedVisits: { [key: number]: boolean } = {};
  editingVisit: { [key: number]: boolean } = {};

  private BASE_URL = 'https://api.healzyapp.com';
  
  // Properties for PDF generation
  @ViewChild('receiptContent') receiptContent!: ElementRef;
  receiptDataForPdf: any = null;
  isGeneratingPDF: boolean = false;
  currentDate: Date = new Date();

  // English receipt labels - always in English
  receiptLabels = {
    receipt_title: 'Medical Service Receipt',
    issue_date: 'Issue Date',
    patient: 'Patient',
    patient_id: 'Patient ID',
    phone: 'Phone',
    doctor: 'Doctor',
    services_provided: 'Services Provided',
    service_name: 'Service Name',
    unit_price: 'Unit Price',
    quantity: 'Quantity',
    total: 'Total',
    no_services: 'No services recorded',
    total_price: 'Total Price',
    total_paid: 'Total Paid',
    remaining_to_pay: 'Remaining to Pay',
    payment_breakdown: 'Payment Breakdown',
    cash: 'Cash',
    visa: 'Visa',
    wallet: 'Wallet',
    instapay: 'Instapay'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private userService: UserService,
    public translocoService: TranslocoService,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    const user = this.userService.getUser();
    if (user && user.data && user.data.firstName) {
      this.currentDoctorName = user.data.firstName + " " + user.data.lastName;
    }

    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      if (this.patientId) {
        this.loadPatientDetails();
        this.loadVisitHistoryWithServices();

        // Restore state after a full reload
        const savedTab = localStorage.getItem('currentTab');
        const savedExpanded = localStorage.getItem('expandedVisits');
        const reloadVisitId = localStorage.getItem('reloadVisitId');

        if (savedTab) {
          this.currentTab = savedTab;
          localStorage.removeItem('currentTab');
        }

        if (savedExpanded) {
          this.expandedVisits = JSON.parse(savedExpanded);
          localStorage.removeItem('expandedVisits');
        }

        if (reloadVisitId) {
          this.expandedVisits[+reloadVisitId] = true;
          localStorage.removeItem('reloadVisitId');
        }

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
      error: () => {
        this.isLoading = false;
        this.showTranslatedToastr('error', 'load_patient_error', 'Failed to load patient details');
      }
    });
  }

  loadVisitHistoryWithServices(): void {
    this.isLoading = true;

    const user = this.userService.getUser();
    const docId = user?.data?.doctorId || user?.data?.id;

    if (!docId) {
      this.isLoading = false;
      this.showTranslatedToastr('error', 'no_doctor_id', 'Doctor ID not found in user data');
      return;
    }

    this.patientService.getPatientMedicalRecordForAppointment(this.patientId, docId).subscribe({
      next: (medicalRecordsResponse: any) => {
        if (medicalRecordsResponse.data?.entries?.length > 0) {
          const entries = medicalRecordsResponse.data.entries;
          const receiptObservables = entries.map((entry: any) =>
            this.appointmentService.getAppointmentReceipt(entry.appointmentId)
          );

          forkJoin(receiptObservables).subscribe({
            next: (receiptResponses: unknown) => {
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
            error: () => {
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
      error: () => {
        this.isLoading = false;
        this.showTranslatedToastr('error', 'load_medical_record_error', 'Error loading medical record entries');
      }
    });
  }

  transformFileUrlToAttachment(raw: string | { url?: string, fileUrl?: string }): any {
    const rawUrl = typeof raw === 'string' ? raw : (raw?.url || raw?.fileUrl || '');
    const fileName = this.getFileName(rawUrl);
    const extension = (fileName.split('.').pop() || '').toLowerCase();
    let fileType = 'application/octet-stream';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) fileType = 'image/' + (extension === 'jpg' ? 'jpeg' : extension);
    else if (extension === 'pdf') fileType = 'application/pdf';
    else if (extension === 'txt') fileType = 'text/plain';

    const candidates = this.buildAttachmentCandidates(rawUrl);

    return {
      original: rawUrl,
      name: fileName,
      type: fileType,
      url: candidates.length ? candidates[0] : rawUrl,
      size: 0,
      urlCandidates: candidates
    };
  }

  async resolveAttachmentUrl(attachment: any): Promise<string> {
    const candidates: string[] = attachment.urlCandidates || (attachment.url ? [attachment.url] : []);
    if (!candidates.length) return attachment.url;

    return new Promise((resolve) => {
      let i = 0;
      const tryNext = () => {
        if (i >= candidates.length) {
          attachment.url = candidates[0];
          resolve(attachment.url);
          return;
        }

        const testUrl = candidates[i];
        const img = new Image();
        img.onload = () => {
          attachment.url = testUrl;
          resolve(testUrl);
        };
        img.onerror = () => {
          i++;
          tryNext();
        };

        img.src = testUrl;
      };

      tryNext();
    });
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

  private showFileReadError(fileName: string): void {
    this.toastr.error(
      this.translocoService.translate('patient_profile.file_read_error', {
        fileName: fileName
      }) || `Error reading file: ${fileName}`,
      this.translocoService.translate('patient_profile.upload_error') || 'Upload Error',
      {
        timeOut: 5000,
        progressBar: true,
        closeButton: true,
        positionClass: 'toast-top-right'
      }
    );
  }

  private safeJoin(base: string, path: string) {
    return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  }

  private getFileName(fileUrl: string) {
    if (!fileUrl) return 'file';
    const cleaned = fileUrl.replace(/\\/g, '/').split('/').pop() || fileUrl;
    return cleaned;
  }

  buildAttachmentCandidates(fileUrl: string): string[] {
    if (!fileUrl) return [];

    let url = String(fileUrl).trim();
    url = url.replace(/^["']|["']$/g, '');
    url = url.replace(/\\/g, '/');

    if (/^https?:\/\//i.test(url)) {
      return [url];
    }

    url = url.replace(/^\.?\//, '');
    url = url.replace(/^wwwroot\//i, '');

    const filename = this.getFileName(url);

    const candidates = [
      url.includes('/') ? this.safeJoin(this.BASE_URL, url) : null,
      this.safeJoin(this.BASE_URL, 'uploads/' + url),
      this.safeJoin(this.BASE_URL, 'uploads/medicalRecords/' + filename),
      this.safeJoin(this.BASE_URL, url),
      this.safeJoin(this.BASE_URL, filename)
    ].filter(Boolean) as string[];

    return Array.from(new Set(candidates));
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

  // Format date in English for receipt
  formatDateEnglish(dateString: string): string {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  enableEdit(visit: any) {
    this.editingVisit[visit.id] = true;
    visit.editData = {
      diagnosis: visit.diagnosis,
      treatment: visit.treatment,
      signs: visit.signs,
      prescriptions: visit.prescriptions
    };
  }

  cancelEdit(visit: any) {
    this.editingVisit[visit.id] = false;
    visit.editData = null;
  }

  saveEdit(visit: any) {
    const updated: MedicalRecordEntry = {
      medicalRecordEntryId: visit.id,
      diagnosis: visit.editData.diagnosis,
      signs: visit.editData.signs,
      prescriptions: visit.editData.prescriptions
    };

    this.doctorService.editMedicalRecordEntry(updated).subscribe({
      next: (res) => {
        visit.diagnosis = res.diagnosis;
        visit.signs = res.signs;
        visit.prescriptions = res.prescriptions;
        this.editingVisit[visit.id] = false;
        this.toastr.success('Medical record updated successfully');
      },
      error: () => {
        this.toastr.error('Failed to update medical record');
      }
    });
  }

  onFileSelected(event: Event, visit: any) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      visit.selectedFile = input.files[0];
    }
  }

  uploadAttachment(visit: any) {
    if (!visit.selectedFile) {
      this.toastr.warning('Please select a file first.');
      return;
    }

    this.doctorService.addFileToMedicalRecordEntry(visit.id, visit.selectedFile).subscribe({
      next: () => {
        this.toastr.success('File uploaded successfully');

        // Save current state before full reload
        localStorage.setItem('currentTab', this.currentTab);
        localStorage.setItem('expandedVisits', JSON.stringify(this.expandedVisits));
        localStorage.setItem('reloadVisitId', visit.id.toString());

        // Full reload
        window.location.reload();
      },
      error: () => {
        this.toastr.error('Failed to upload file');
      }
    });
  }

  // Helper function to check if the platform is mobile (Capacitor)
  private isMobilePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Helper function to convert Blob to Base64 (needed for Capacitor Filesystem)
  private convertBlobToBase64 = (blob: Blob): Promise<string | ArrayBuffer | null> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  // Receipt PDF Generation
  downloadReceipt(visit: any): void {
    if (!visit.paymentInfo) {
      this.showTranslatedToastr('error', 'no_receipt_info', 'Receipt information is missing for this visit.');
      return;
    }

    this.isGeneratingPDF = true;
    this.currentDate = new Date();
    
    this.receiptDataForPdf = {
      patientName: `${this.patientDetails?.firstName || ''} ${this.patientDetails?.lastName || ''}`.trim(),
      doctorName: visit.doctorName || this.currentDoctorName,
      date: this.formatDateEnglish(visit.entryDate), // Use English date format
      services: visit.services || [],
      paymentInfo: visit.paymentInfo,
      totalPaid: (visit.paymentInfo.paidCash || 0) +
                  (visit.paymentInfo.paidInstapay || 0) +
                  (visit.paymentInfo.paidWallet || 0) +
                  (visit.paymentInfo.paidVisa || 0),
      remainingToPay: visit.paymentInfo.remainingToPay || 0,
      totalPrice: visit.paymentInfo.totalPrice || 0
    };

    // Wait for the next tick to ensure receiptContent is rendered
    setTimeout(async () => {
      try {
        const receiptElement = this.receiptContent.nativeElement;
        if (!receiptElement) {
          throw new Error('Receipt content element not found.');
        }

        // Use higher resolution for better PDF quality
        const canvas = await html2canvas(receiptElement, { 
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if content is longer than one page
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const dateString = new Date(visit.entryDate).toLocaleDateString('en-CA');
        const fileName = `Receipt_${this.patientDetails?.lastName || 'Patient'}_${dateString}.pdf`;
        
        
        // --- Platform Detection: Browser vs Mobile ---
        if (this.isMobilePlatform()) {
          // Mobile behavior: Use Capacitor Filesystem and Share
          const pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
          const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

          // Get the file data part of the base64 string
          const fileData = base64Data.split(',')[1];

          // Use Capacitor Filesystem to write the file to a cache directory
          const result = await Filesystem.writeFile({
            path: fileName,
            data: fileData,
            directory: Directory.Cache
          });

          // Use Capacitor Share to allow the user to open or share the file
          await Share.share({
            title: this.receiptLabels.receipt_title,
            text: `Medical Receipt for ${this.receiptDataForPdf.patientName} on ${this.receiptDataForPdf.date}`,
            url: result.uri,
            dialogTitle: 'Share Receipt',
          });
          
          this.showTranslatedToastr('success', 'receipt_download_success', 'Receipt ready to share or view.');

        } else {
          // Browser behavior: Standard download
          pdf.save(fileName);
          this.showTranslatedToastr('success', 'receipt_download_success', 'Receipt downloaded successfully.');
        }


      } catch (error) {
        console.error('Error generating PDF:', error);
        this.showTranslatedToastr('error', 'receipt_download_error', 'Failed to generate receipt PDF.');
      } finally {
        this.isGeneratingPDF = false;
        this.receiptDataForPdf = null;
      }
    }, 500);
  }
}