import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { Appointment } from '../../../shared/models/appointment.model';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

// PDF Generation Imports
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Capacitor Imports for Mobile
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-d-revenue',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DHeaderComponent,
    DSidenavbarComponent,
    FooterComponent,
    TranslocoModule
  ],
  templateUrl: './d-revenue.component.html',
  styleUrls: ['./d-revenue.component.css']
})
export class DRevenueComponent implements OnInit {
  availableDays: { date: string; dayOfWeek: string }[] = [];
  selectedDate: string = '';
  appointments: Appointment[] = [];
  userId!: number;
  userRole: string | null = null;
  isGeneratingPDF: boolean = false;

  @ViewChild('reportContent') reportContent!: ElementRef;

  constructor(
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private userService: UserService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  private initializeComponent(): void {
    const user = this.userService.getUser();
    if (user && user.data.applicationRole_En === 'Doctor' && user.data.id) {
      this.userId = user.data.id;
      this.userRole = user.data.applicationRole_En;
      this.fetchAvailableDays();
    } else {
      this.toastr.error('No user ID found for the doctor.', 'Error');
    }
  }

  fetchAvailableDays(): void {
    const numberOfRequiredDays = 30;
    this.appointmentService.getAllDays(this.userId, numberOfRequiredDays).subscribe({
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
      error: () => {
        this.toastr.error('Failed to fetch available days', 'Error');
      },
    });
  }

  fetchAppointmentsForDate(date: string): void {
    this.appointmentService.searchAppointmentsByOptionalParams(this.userId).subscribe({
      next: (response: any) => {
        this.appointments = (response.data || []).filter((appointment: Appointment) => {
          return appointment.timeSlot?.date === date;
        });
      },
      error: () => {
        this.toastr.error('Failed to fetch appointments', 'Error');
      },
    });
  }

  onDateSelect(event: any): void {
    this.selectedDate = event.target.value;
    this.fetchAppointmentsForDate(this.selectedDate);
  }

  getRemainingToPay(appointment: Appointment): number {
    return appointment.remainingToPay ?? 0;
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

      // Hardcoded English translations for PDF
      const translations = {
        title: 'Daily Revenue Report',
        reportDate: 'Report Date',
        generated: 'Generated On',
        doctor: 'Doctor',
        patientName: 'Patient Name',
        total: 'Total',
        cash: 'Cash',
        wallet: 'Wallet',
        instapay: 'Instapay',
        visa: 'Visa',
        remaining: 'Remaining',
        summary: 'Summary',
        totalRevenue: 'Total Revenue',
        totalCollected: 'Total Collected',
        totalRemaining: 'Total Remaining',
        currency: 'EGP'
      };

      // Add header
      doc.setFontSize(18);
      doc.setTextColor('#24CC81');
      doc.text(translations.title, margin, margin + 20);

      // Add report details - Always use English format
      doc.setFontSize(12);
      doc.setTextColor('#666666');
      
      const selectedDay = this.availableDays.find(d => d.date === this.selectedDate);
      doc.text(`${translations.reportDate}: ${this.selectedDate} (${selectedDay?.dayOfWeek || ''})`, 
               margin, margin + 40);
      
      // Always use English date format
      doc.text(`${translations.generated}: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, margin, margin + 60);

      // Add doctor information
      const user = this.userService.getUser();
      if (user) {
        const doctorFirstName = user.data.firstName || '';
        const doctorLastName = user.data.lastName || '';
        const doctorName = (doctorFirstName + ' ' + doctorLastName).trim() || 'N/A';
        doc.text(`${translations.doctor}: ${doctorName}`, margin, margin + 80);
      }

      // Prepare table data
      const tableData = this.appointments.map((appointment, index) => [
        (index + 1).toString(),
        appointment.patientName || 'N/A',
        this.formatCurrency(appointment.totalPrice || 0),
        this.formatCurrency(appointment.paidCash || 0),
        this.formatCurrency(appointment.paidWallet || 0),
        this.formatCurrency(appointment.paidInstapay || 0),
        this.formatCurrency(appointment.paidVisa || 0),
        this.formatCurrency(this.getRemainingToPay(appointment))
      ]);

      // Add table using autoTable with English headers
      autoTable(doc, {
        startY: margin + 100,
        head: [[
          '#', 
          translations.patientName, 
          translations.total, 
          translations.cash,
          translations.wallet, 
          translations.instapay, 
          translations.visa, 
          translations.remaining
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

      // Add summary section in English
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      const totalRevenue = this.appointments.reduce((sum, a) => sum + (a.totalPrice || 0), 0);
      const totalCollected = this.appointments.reduce((sum, a) => sum + this.calculateTotalPaid(a), 0);
      const totalRemaining = this.appointments.reduce((sum, a) => sum + this.getRemainingToPay(a), 0);

      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(translations.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${translations.totalRevenue}: ${this.formatCurrency(totalRevenue)}`, margin, finalY + 25);
      doc.text(`${translations.totalCollected}: ${this.formatCurrency(totalCollected)}`, margin, finalY + 50);
      doc.text(`${translations.totalRemaining}: ${this.formatCurrency(totalRemaining)}`, margin, finalY + 75);

      // Add footer in English
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text('© ' + new Date().getFullYear() + ' HEALZY. All rights reserved.',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );

      // Generate filename
      const filename = `Daily_Revenue_Report_${this.selectedDate.replace(/-/g, '_')}.pdf`;

      // Platform Detection: Browser vs Mobile
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
            title: translations.title,
            text: `Daily revenue report for ${this.selectedDate}`,
            url: fileUriResult.uri,
            dialogTitle: 'Share Revenue Report'
          });
          this.toastr.success('PDF saved and shared successfully');
        } else {
          this.toastr.success('PDF saved successfully');
        }
      } else {
        // Browser behavior: Direct download
        doc.save(filename);
        this.toastr.success('PDF saved successfully');
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastr.error('Failed to generate PDF');
    } finally {
      this.isGeneratingPDF = false;
    }
  }

  // Helper method to detect mobile platforms
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

  // Helper method to format currency - always use EGP for PDF
  private formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} EGP`;
  }
}