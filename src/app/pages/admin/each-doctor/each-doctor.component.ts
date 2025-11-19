import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { DoctorService } from '../../../services/doctor.service';
import { ActivatedRoute } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { ToastrService } from 'ngx-toastr';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { DoctorsRevenueResponse } from '../../../shared/models/DoctorsRevenueResponse';
import { UserService } from '../../../services/user.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-each-doctor',
  standalone: true,
  imports: [
    CommonModule, 
    AdminHeaderComponent,
    LoadingSpinnerComponent,
    TranslocoModule
  ],
  templateUrl: './each-doctor.component.html',
  styleUrls: ['./each-doctor.component.css']
})
export class EachDoctorComponent implements OnInit {
  appointments: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  currentLanguage = 'en';
  doctorId: number = 0;
  month: number = 0;
  year: number = 0;
  doctorName: string = '';
  ourRevenueTotal: number = 0;
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // PDF Generation
  isGeneratingPDF = false;
  @ViewChild('reportContent') reportContent!: ElementRef;

  // RTL support
  get isRTL(): boolean {
    return this.currentLanguage === 'ar';
  }

  constructor(
    private doctorService: DoctorService,
    private route: ActivatedRoute,
    private translocoService: TranslocoService,
    private toastr: ToastrService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
    this.route.queryParams.subscribe(params => {
      this.doctorId = +params['id'];
      this.month = +params['month'] || new Date().getMonth() + 1;
      this.year = +params['year'] || new Date().getFullYear();
      this.loadAppointments();
      this.loadDoctorName();
    });
  }

  loadDoctorName(): void {
    this.userService.getUserById(this.doctorId).subscribe({
      next: (response: any) => {
        if (response.succeeded) {
          this.doctorName = `${response.data.firstName} ${response.data.lastName}`;
        }
      },
      error: (err) => {
        console.error('Error loading doctor name:', err);
      }
    });
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.doctorService.getDoctorAppointmentsForMonth(this.doctorId, this.month, this.year)
      .subscribe({
        next: (response: DoctorsRevenueResponse<any[]>) => {
          if (response.succeeded && response.data) {
            this.appointments = response.data.map(appointment => {
              const ourRevenue = appointment.checkPrice * 0.1; // Calculate 10% of check price
              return {
                ...appointment,
                ourRevenue: ourRevenue,
                status: this.getStatusText(appointment.appointmentStatusId)
              };
            }).sort((a, b) => 
              new Date(a.timeSlot.date).getTime() - new Date(b.timeSlot.date).getTime()
            );
            
            // Calculate total our revenue
            this.ourRevenueTotal = this.appointments.reduce((sum, app) => sum + app.ourRevenue, 0);
            
            // Calculate pagination
            this.totalPages = Math.ceil(this.appointments.length / this.itemsPerPage);
          } else {
            const message = response.message || 
                          this.translocoService.translate('errors.failed_load_appointments');
            this.errorMessage = message;
            this.toastr.error(message);
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading appointments:', err);
          this.errorMessage = this.translocoService.translate('errors.load_appointments_error');
          this.isLoading = false;
        }
      });
  }

  getStatusText(statusId: number): string {
    switch(statusId) {
      case 10: return 'pending';
      case 13: return 'in-progress';
      case 14: return 'completed';
      case 15: return 'cancelled';
      default: return 'unknown';
    }
  }

  getTranslatedStatus(appointment: any): string {
    return this.currentLanguage === 'ar' ? 
           appointment.appointmentStatus_Ar : 
           appointment.appointmentStatus_En;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateDay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      day: 'numeric'
    });
  }

  formatDateFull(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    return timeString.substring(0, 5); // Returns "HH:mm"
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString(this.currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP'
    });
  }

  getCurrentDirection(): string {
    return this.isRTL ? 'rtl' : 'ltr';
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  get paginatedAppointments(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.appointments.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // PDF Export Methods
  async exportToPDF(): Promise<void> {
    if (this.appointments.length === 0) {
      this.toastr.warning(this.translocoService.translate('doctor_appointments.no_appointments_to_export'));
      return;
    }

    this.isGeneratingPDF = true;

    try {
      // Create PDF with proper type
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      }) as jsPDF & { lastAutoTable?: { finalY: number } };

      const margin = 40;
      const translations = {
        title: 'Doctor Appointments Report',
        report_period: 'Report Period',
        generated: 'Generated',
        doctor: 'Doctor',
        patient_name: 'Patient Name',
        patient_id: 'Patient ID',
        date: 'Date',
        time: 'Time',
        check_price: 'Check Price',
        our_revenue: 'Our Revenue (10%)',
        summary: 'Summary',
        total_appointments: 'Total Appointments',
        total_revenue: 'Total Revenue',
        status: 'Status',
        totals: 'Totals'
      };

      // Add header
      doc.setFontSize(18);
      doc.setTextColor('#24CC81');
      doc.text(translations.title, margin, margin + 20);

      doc.setFontSize(12);
      doc.setTextColor('#666666');
      
      const monthName = new Date(this.year, this.month - 1, 1).toLocaleString('en-US', { month: 'long' });
      doc.text(`${translations.report_period}: ${monthName} ${this.year}`, margin, margin + 40);
      
      doc.text(`${translations.generated}: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, margin, margin + 60);

      doc.text(`${translations.doctor}: ${this.doctorName}`, margin, margin + 80);

      // Prepare table data
      const tableData = this.appointments.map((appointment, index) => [
        (index + 1).toString(),  // Patient number
        appointment.patientName,
        appointment.patientID,
        this.formatDateFull(appointment.timeSlot.date),
        `${this.formatTime(appointment.timeSlot.startTime)} - ${this.formatTime(appointment.timeSlot.endTime)}`,
        this.formatCurrency(appointment.checkPrice),
        this.formatCurrency(appointment.ourRevenue),
        this.getStatusText(appointment.appointmentStatusId)
      ]);

      const totalRevenue = this.appointments.reduce((sum, app) => sum + app.checkPrice, 0);
      const totalOurRevenue = this.appointments.reduce((sum, app) => sum + app.ourRevenue, 0);

      // Add table with proper type safety
      autoTable(doc, {
        startY: margin + 100,
        head: [
          [
            '#', 
            translations.patient_name,
            translations.patient_id,
            translations.date,
            translations.time,
            translations.check_price,
            translations.our_revenue,
            translations.status
          ]
        ],
        body: tableData,
        headStyles: {
          fillColor: '#24CC81',
          textColor: '#ffffff',
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: '#f9f9f9'
        },
        styles: {
          cellPadding: 8,
          fontSize: 10,
          valign: 'middle',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'left' }
        },
        didDrawPage: (data: any) => {
          if (data.cursor && data.pageNumber === data.pages?.length) {
            const finalY = data.cursor.y + 10;
            doc.setFontSize(10);
            doc.setTextColor('#000000');
            doc.setFont('helvetica', 'bold'); // or any other font you want to use
            
            autoTable(doc, {
              startY: finalY,
              body: [
                [
                  { content: translations.totals + ':', styles: { halign: 'right', fontStyle: 'bold' } },
                  '',
                  '',
                  '',
                  { content: this.formatCurrency(totalRevenue), styles: { halign: 'center', fontStyle: 'bold' } },
                  { content: this.formatCurrency(totalOurRevenue), styles: { halign: 'center', fontStyle: 'bold' } },
                  ''
                ]
              ],
              styles: {
                cellPadding: 6,
                fontSize: 10,
                valign: 'middle'
              },
              columnStyles: {
                0: { halign: 'right' },
                4: { halign: 'center' },
                5: { halign: 'center' }
              }
            });
          }
        }
      });

      // Add summary section with safe access
      let finalY = margin + 100 + (tableData.length * 20) + 40;
      if (doc.lastAutoTable) {
        finalY = doc.lastAutoTable.finalY + 20;
      }

      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(translations.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${translations.total_appointments}: ${this.appointments.length}`, margin, finalY + 25);
      doc.text(`${translations.total_revenue}: ${this.formatCurrency(totalRevenue)}`, margin, finalY + 45);
      doc.text(`Total Our Revenue (10%): ${this.formatCurrency(totalOurRevenue)}`, margin, finalY + 65);

      // Add footer
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text('© ' + new Date().getFullYear() + ' Healzy. All rights reserved.',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );

      // Generate filename
      const fileName = `Doctor_Appointments_${this.doctorName.replace(/\s+/g, '_')}_${this.month}_${this.year}.pdf`;

      // --- Platform Detection: Browser vs Mobile ---
      const isMobile = this.isMobilePlatform();
      
      if (isMobile) {
        // Mobile behavior: Use Capacitor Filesystem and Share
        const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
        const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });

        const fileUri = (await Filesystem.getUri({
          directory: Directory.Documents,
          path: fileName
        })).uri;

        await Share.share({
          title: translations.title,
          text: `Appointments report for Dr. ${this.doctorName} - ${monthName} ${this.year}`,
          url: fileUri,
          dialogTitle: 'Share PDF'
        });

        this.toastr.success('PDF exported and saved successfully!');
      } else {
        // Browser behavior: Direct download
        doc.save(fileName);
        this.toastr.success('PDF downloaded successfully!');
      }

    } catch (error) {
      console.error('Error generating or saving PDF:', error);
      this.toastr.error('Failed to generate or save PDF');
    } finally {
      this.isGeneratingPDF = false;
    }
  }

  // Add this helper method to detect mobile platforms
  private isMobilePlatform(): boolean {
    // Check if Capacitor is available and we're running on a mobile device
    const capacitor = (window as any).Capacitor;
    if (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) {
      return true;
    }
    
    // Additional check for common mobile user agents
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }

  // Helper function to convert Blob to Base64
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  getTotalCheckPrice(): number {
    return this.paginatedAppointments.reduce((sum, app) => sum + app.checkPrice, 0);
  }

  getTotalOurRevenue(): number {
    return this.paginatedAppointments.reduce((sum, app) => sum + app.ourRevenue, 0);
  }

  getPatientNumber(index: number): number {
    return (this.currentPage - 1) * this.itemsPerPage + index + 1;
  }
}