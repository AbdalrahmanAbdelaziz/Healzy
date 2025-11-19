import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DHeaderComponent } from '../d-header/d-header.component';
import { DSidenavbarComponent } from '../d-sidenavbar/d-sidenavbar.component';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../services/doctor.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Capacitor imports for mobile support
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-d-daily-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DHeaderComponent,
    DSidenavbarComponent,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './d-daily-report.component.html',
  styleUrls: ['./d-daily-report.component.css']
})
export class DDailyReportComponent implements OnInit {
  availableDays: { date: string; dayOfWeek: string }[] = [];
  selectedDate: string = '';
  revenueData: any = {
    paidCash: 0,
    paidInstapay: 0,
    paidWallet: 0,
    paidVisa: 0,
    totalPrice: 0,
    remainingToPay: 0
  };
  userId!: number;
  userRole: string | null = null;
  isGeneratingPDF: boolean = false;

  @ViewChild('reportContent') reportContent!: ElementRef;

  constructor(
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private userService: UserService,
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
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
          this.fetchRevenueData(this.selectedDate);
        }
      },
      error: () => {
        this.toastr.error('Failed to fetch available days', 'Error');
      },
    });
  }

  fetchRevenueData(date: string): void {
    this.doctorService.getDoctorDayFinalRevenue(this.userId, date).subscribe({
      next: (response: any) => {
        this.revenueData = {
          paidCash: response.data?.paidCash || 0,
          paidInstapay: response.data?.paidInstapay || 0,
          paidWallet: response.data?.paidWallet || 0,
          paidVisa: response.data?.paidVisa || 0,
          totalPrice: response.data?.totalPrice || 0,
          remainingToPay: response.data?.remainingToPay || 0
        };
      },
      error: () => {
        this.toastr.error('Failed to fetch revenue data', 'Error');
        this.revenueData = {
          paidCash: 0,
          paidInstapay: 0,
          paidWallet: 0,
          paidVisa: 0,
          totalPrice: 0,
          remainingToPay: 0
        };
      },
    });
  }

  onDateSelect(event: any): void {
    this.selectedDate = event.target.value;
    this.fetchRevenueData(this.selectedDate);
  }

  calculateTotalPaid(): number {
    return (
      (this.revenueData.paidCash || 0) +
      (this.revenueData.paidInstapay || 0) +
      (this.revenueData.paidWallet || 0) +
      (this.revenueData.paidVisa || 0)
    );
  }

  async exportToPDF(): Promise<void> {
    if (this.calculateTotalPaid() === 0 && this.revenueData.remainingToPay === 0) {
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
        title: 'Revenue Report',
        reportDate: 'Report Date',
        generated: 'Generated',
        doctor: 'Doctor',
        total: 'Total',
        paid: 'Paid',
        cash: 'Cash',
        visa: 'Visa',
        wallet: 'Wallet',
        instapay: 'Instapay',
        remaining: 'Remaining',
        summary: 'Summary',
        totalRevenue: 'Total Revenue',
        totalRemaining: 'Total Remaining',
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

      // Add doctor information
      const user = this.userService.getUser();
      if (user) {
        const doctorFirstName = user.data.firstName || '';
        const doctorLastName = user.data.lastName || '';
        const doctorName = (doctorFirstName + ' ' + doctorLastName).trim() || 'N/A';
        doc.text(`${englishLabels.doctor}: ${doctorName}`, margin, margin + 80);
      }

      // Prepare table data
      const tableData = [[
        this.formatCurrency(this.calculateTotalPaid(), englishLabels.currency),
        this.formatCurrency(this.revenueData.paidCash, englishLabels.currency),
        this.formatCurrency(this.revenueData.paidVisa, englishLabels.currency),
        this.formatCurrency(this.revenueData.paidWallet, englishLabels.currency),
        this.formatCurrency(this.revenueData.paidInstapay, englishLabels.currency),
        this.formatCurrency(this.revenueData.remainingToPay, englishLabels.currency)
      ]];

      // Add table using autoTable - always in English
      autoTable(doc, {
        startY: margin + 100,
        head: [[
          englishLabels.paid, 
          englishLabels.cash, 
          englishLabels.visa, 
          englishLabels.wallet, 
          englishLabels.instapay, 
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
          0: { halign: 'right', cellWidth: 80 },
          1: { halign: 'right', cellWidth: 70 },
          2: { halign: 'right', cellWidth: 70 },
          3: { halign: 'right', cellWidth: 70 },
          4: { halign: 'right', cellWidth: 70 },
          5: { halign: 'right', cellWidth: 80 }
        }
      });

      // Add summary section - always in English
      const finalY = (doc as any).lastAutoTable.finalY + 30;

      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(englishLabels.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${englishLabels.totalRevenue}: ${this.formatCurrency(this.calculateTotalPaid(), englishLabels.currency)}`, margin, finalY + 25);
      doc.text(`${englishLabels.totalRemaining}: ${this.formatCurrency(this.revenueData.remainingToPay, englishLabels.currency)}`, margin, finalY + 50);

      // Add footer - always in English
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text('© ' + new Date().getFullYear() + ' HEALZY. All rights reserved.',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );

      // Generate filename - always in English
      const filename = `Daily_Revenue_Summary_${this.selectedDate.replace(/-/g, '_')}.pdf`;

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