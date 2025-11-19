import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { Appointment } from '../../../shared/models/appointment.model';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { DoctorService } from '../../../services/doctor.service';
import { Doctor } from '../../../shared/models/doctor.model';

// PDF Generation Imports
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Capacitor Imports
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-revenue',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SHeaderComponent,
    SSidenavbarComponent,
    CheckoutModalComponent,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './revenue.component.html',
  styleUrls: ['./revenue.component.css'],
})
export class RevenueComponent implements OnInit {
  availableDays: { date: string; dayOfWeek: string }[] = [];
  selectedDate: string = '';
  appointments: Appointment[] = [];
  doctorId!: number;
  userRole: string | null = null;
  isCheckoutModalVisible: boolean = false;
  selectedAppointmentId: number = 0;
  isGeneratingPDF: boolean = false;

  @ViewChild('revenueTable') revenueTable!: ElementRef;

  constructor(
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private userService: UserService,
    public translocoService: TranslocoService,
    private doctorService: DoctorService
  ) { }

  ngOnInit(): void {
    const user = this.userService.getUser();

    if (user?.data.applicationRole_En === 'Secretary') {
      this.userRole = user.data.applicationRole_En;

      this.doctorService.getDoctorsFromSecretary().subscribe({
        next: (doctor: Doctor) => {
          if (doctor && doctor.id) {
            this.doctorId = doctor.id;
            this.userService.setDoctorIdForSecretary(this.doctorId);
            this.fetchAvailableDays();
          } else {
            this.toastr.warning(this.translocoService.translate('errors.noDoctorAssigned'));
          }
        },
        error: (err) => {
          console.error('Error fetching doctor for secretary:', err);
          this.toastr.error(this.translocoService.translate('error.fetch_doctors_failed'), 'Error');
        }
      });

    } else if (user?.data.applicationRole_En === 'Doctor') {
      this.doctorId = user.data.id;
      this.userRole = user.data.applicationRole_En;
      this.fetchAvailableDays();
    } else {
      this.toastr.error('No doctor ID found for the current user.', 'Error');
    }
  }

  getRemainingToPay(appointment: Appointment): number {
    return appointment.remainingToPay ?? 0;
  }

  hasRemainingPayment(appointment: Appointment): boolean {
    return (appointment.remainingToPay ?? 0) > 0;
  }

  openCheckoutModal(appointment: Appointment): void {
    if (appointment.id) {
      this.selectedAppointmentId = appointment.id;
      this.isCheckoutModalVisible = true;
    } else {
      this.toastr.error('Invalid appointment selected', 'Error');
    }
  }

  closeCheckoutModal(): void {
    this.isCheckoutModalVisible = false;
    this.selectedAppointmentId = 0;
    this.fetchAppointmentsForDate(this.selectedDate);
  }

  fetchAvailableDays(): void {
    const numberOfRequiredDays = 30;
    if (!this.doctorId) return;

    this.appointmentService.getAllDays(this.doctorId, numberOfRequiredDays).subscribe({
      next: (response: any) => {
        this.availableDays = (response.data.workingDays || []).map((date: string) => {
          const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
          return { date, dayOfWeek };
        });

        if (this.availableDays.length > 0) {
          this.selectedDate = this.availableDays[0].date;
          this.fetchAppointmentsForDate(this.selectedDate);
        }
      },
      error: () => this.toastr.error('Failed to fetch available days', 'Error'),
    });
  }

  fetchAppointmentsForDate(date: string): void {
    if (!this.doctorId) return;

    this.appointmentService.searchAppointmentsByOptionalParams(this.doctorId).subscribe({
      next: (response: any) => {
        this.appointments = (response.data || []).filter((appointment: Appointment) => {
          return appointment.timeSlot?.date === date;
        });
      },
      error: () => this.toastr.error('Failed to fetch appointments', 'Error'),
    });
  }

  onDateSelect(event: any): void {
    this.selectedDate = event.target.value;
    this.fetchAppointmentsForDate(this.selectedDate);
  }

  calculateTotalPaid(appointment: Appointment): number {
    return (appointment.paidCash || 0) +
           (appointment.paidWallet || 0) +
           (appointment.paidInstapay || 0) +
           (appointment.paidVisa || 0);
  }

  async exportToPDF(): Promise<void> {
    if (this.appointments.length === 0) {
      this.toastr.warning(this.translocoService.translate('revenue.noDataToExport'));
      return;
    }

    this.isGeneratingPDF = true;

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40;
      const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);

      // Always use English for PDF regardless of current language
      const englishLabels = {
        title: 'Daily Revenue Report',
        reportDate: 'Report Date',
        generated: 'Generated',
        secretaryForDoctor: 'Secretary for Doctor',
        doctor: 'Doctor',
        patientName: 'Patient Name',
        total: 'Total',
        paid: 'Paid',
        cash: 'Cash',
        wallet: 'Wallet',
        instapay: 'Instapay',
        visa: 'Visa',
        remaining: 'Remaining',
        summary: 'Summary',
        totalCollected: 'Total Collected',
        totalRemaining: 'Total Remaining',
        totalRevenue: 'Total Revenue',
        currency: 'EGP'
      };

      // Add header
      doc.setFontSize(18);
      doc.setTextColor('#24CC81');
      doc.text(englishLabels.title, margin, margin + 20);

      // Add report details - always in English
      doc.setFontSize(12);
      doc.setTextColor('#666666');
      
      const selectedDay = this.availableDays.find(d => d.date === this.selectedDate);
      doc.text(`${englishLabels.reportDate}: ${this.selectedDate} (${selectedDay?.dayOfWeek || ''})`, 
               margin, margin + 40);
      
      // Always use English locale for date formatting
      doc.text(`${englishLabels.generated}: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, margin, margin + 60);

      // Add user/doctor information
      const user = this.userService.getUser();
      if (user) {
        const doctorFirstName = user.data.firstName || '';
        const doctorLastName = user.data.lastName || '';
        const doctorName = (doctorFirstName + ' ' + doctorLastName).trim() || 'N/A';
        
        if (this.userRole === 'Secretary') {
          doc.text(`${englishLabels.secretaryForDoctor}: ${doctorName}`, margin, margin + 80);
        } else if (this.userRole === 'Doctor') {
          doc.text(`${englishLabels.doctor}: ${doctorName}`, margin, margin + 80);
        }
      }

      // Prepare table data
      const tableData = this.appointments.map((appointment, index) => [
        (index + 1).toString(),
        appointment.patientName || 'N/A',
        this.formatCurrency(appointment.totalPrice || 0, englishLabels.currency),
        this.formatCurrency(appointment.paidCash || 0, englishLabels.currency),
        this.formatCurrency(appointment.paidWallet || 0, englishLabels.currency),
        this.formatCurrency(appointment.paidInstapay || 0, englishLabels.currency),
        this.formatCurrency(appointment.paidVisa || 0, englishLabels.currency),
        this.formatCurrency(this.getRemainingToPay(appointment), englishLabels.currency)
      ]);

      // Add table using autoTable - always in English
      autoTable(doc, {
        startY: margin + 100,
        head: [[
          '#', 
          englishLabels.patientName, 
          englishLabels.total, 
          englishLabels.cash,
          englishLabels.wallet, 
          englishLabels.instapay, 
          englishLabels.visa, 
          englishLabels.remaining
        ]],
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
          0: { halign: 'center', cellWidth: 40 },
          1: { halign: 'left', cellWidth: 'auto' },
          2: { halign: 'right', cellWidth: 70 },
          3: { halign: 'right', cellWidth: 60 },
          4: { halign: 'right', cellWidth: 60 },
          5: { halign: 'right', cellWidth: 60 },
          6: { halign: 'right', cellWidth: 60 },
          7: { halign: 'right', cellWidth: 70 }
        }
      });

      // Add summary section - always in English
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      const totalRevenue = this.appointments.reduce((sum, a) => sum + (a.totalPrice || 0), 0);
      const totalCollected = this.appointments.reduce((sum, a) => sum + this.calculateTotalPaid(a), 0);
      const totalRemaining = this.appointments.reduce((sum, a) => sum + this.getRemainingToPay(a), 0);

      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(englishLabels.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${englishLabels.totalRevenue}: ${this.formatCurrency(totalRevenue, englishLabels.currency)}`, margin, finalY + 25);
      doc.text(`${englishLabels.totalCollected}: ${this.formatCurrency(totalCollected, englishLabels.currency)}`, margin, finalY + 50);
      doc.text(`${englishLabels.totalRemaining}: ${this.formatCurrency(totalRemaining, englishLabels.currency)}`, margin, finalY + 75);

      // Add footer - always in English
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text('© ' + new Date().getFullYear() + ' HEALZY. All rights reserved.',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );

      // Generate filename - always in English
      const filename = `Revenue_Report_${this.selectedDate.replace(/-/g, '_')}.pdf`;

      // --- Platform Detection: Browser vs Mobile ---
      const isMobile = this.isMobilePlatform();
      
      if (isMobile) {
        // Mobile behavior: Use Capacitor Filesystem and Share
        const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
        const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

        // Use Capacitor Filesystem to write the file
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
        });

        // Get the URI to share the file
        const fileUriResult = await Filesystem.getUri({
          directory: Directory.Documents,
          path: filename
        });

        if (fileUriResult && fileUriResult.uri) {
          await Share.share({
            title: englishLabels.title,
            text: `Revenue report for ${this.selectedDate}`,
            url: fileUriResult.uri,
            dialogTitle: 'Share Revenue Report'
          });
          this.toastr.success(this.translocoService.translate('revenue.pdfSavedAndShared'));
        } else {
          this.toastr.success(this.translocoService.translate('revenue.pdfSavedOnly'));
        }
      } else {
        // Browser behavior: Direct download
        doc.save(filename);
        this.toastr.success(this.translocoService.translate('revenue.pdfSavedOnly'));
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastr.error(this.translocoService.translate('errors.pdfGenerationError'));
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
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]); // Return only the base64 data without the data URL prefix
    };
    reader.readAsDataURL(blob);
  });

  // Helper method to format currency - always uses EGP
  private formatCurrency(amount: number, currency: string = 'EGP'): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}