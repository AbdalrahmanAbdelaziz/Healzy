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

// Import Capacitor Filesystem and Share
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share'; // Optional: for sharing the PDF

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
      error: (error) => {
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
      error: (error) => {
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
    return (this.revenueData.paidCash || 0) +
           (this.revenueData.paidInstapay || 0) +
           (this.revenueData.paidWallet || 0) +
           (this.revenueData.paidVisa || 0);
  }

  async exportToPDF(): Promise<void> {
    if (this.calculateTotalPaid() === 0 && this.revenueData.remainingToPay === 0) {
      this.toastr.warning('No data to export');
      return;
    }

    this.isGeneratingPDF = true;

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40;
      const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);

      // Always use English for PDF export regardless of current language
      const translations = {
        title: 'Revenue Report',
        report_date: 'Report Date',
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
        total_revenue: 'Total Revenue',
        remaining_balance: 'Remaining Balance'
      };

      // Add header
      doc.setFontSize(18);
      doc.setTextColor('#24CC81');
      doc.text(translations.title, margin, margin + 20);

      doc.setFontSize(12);
      doc.setTextColor('#666666');
      doc.text(`${translations.report_date}: ${this.selectedDate} (${this.availableDays.find(d => d.date === this.selectedDate)?.dayOfWeek || ''})`,
               margin, margin + 40);
      doc.text(`${translations.generated}: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, margin, margin + 60);

      // Add doctor information
      const user = this.userService.getUser();
      if (user) {
        const firstName = user.data.firstName || 'N/A';
        const lastName = user.data.lastName || '';
        doc.text(`${translations.doctor}: ${firstName} ${lastName}`.trim(), margin, margin + 80);
      }

      // Add table data
      const tableData = [
        [
          this.calculateTotalPaid().toFixed(2),
          this.revenueData.paidCash.toFixed(2),
          this.revenueData.paidVisa.toFixed(2),
          this.revenueData.paidWallet.toFixed(2),
          this.revenueData.paidInstapay.toFixed(2),
          this.revenueData.remainingToPay.toFixed(2)
        ]
      ];

      autoTable(doc, {
        startY: margin + 100,
        head: [
          [
            translations.total,
            translations.cash,
            translations.visa,
            translations.wallet,
            translations.instapay,
            translations.remaining
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
          0: { halign: 'left', fontStyle: 'bold' }
        }
      });

      // Add summary section
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(translations.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${translations.total_revenue}: ${this.calculateTotalPaid().toFixed(2)}`, margin, finalY + 25);
      doc.text(`${translations.remaining_balance}: ${this.revenueData.remainingToPay.toFixed(2)}`, margin, finalY + 45);

      // Add footer
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text('© ' + new Date().getFullYear() + ' Your Clinic Name. All rights reserved.',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );

      // Convert PDF to ArrayBuffer and then to Blob
      const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });

      // Convert Blob to Base64 (Capacitor prefers base64 strings for writeFile)
      const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

      const fileName = `Revenue_Report_${this.selectedDate.replace(/-/g, '')}.pdf`;

      // Use Capacitor Filesystem to write the file
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents, // Or Directory.ExternalStorage for broader access on Android
        // No encoding needed as we explicitly converted to base64
      });

      // Optional: Share the PDF after saving
      const fileUri = (await Filesystem.getUri({
        directory: Directory.Documents,
        path: fileName
      })).uri;

      await Share.share({
        title: translations.title,
        text: `Here is your ${translations.title} for ${this.selectedDate}.`,
        url: fileUri,
        dialogTitle: 'Share PDF'
      });

      this.toastr.success('PDF exported and saved successfully!');
    } catch (error) {
      console.error('Error generating or saving PDF:', error);
      this.toastr.error('Failed to generate or save PDF');
    } finally {
      this.isGeneratingPDF = false;
    }
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
}