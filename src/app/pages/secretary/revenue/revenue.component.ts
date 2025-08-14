// revenue.component.ts
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

// PDF Generation Imports
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import Capacitor Filesystem and Share
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share'; // Optional: for sharing the PDF

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
    public translocoService: TranslocoService
  ) { }

  ngOnInit(): void {
    const user = this.userService.getUser();
    if (user && user.data.applicationRole_En === 'Secretary' && user.data.doctorId) {
      this.doctorId = user.data.doctorId;
      this.userRole = user.data.applicationRole_En;
      this.fetchAvailableDays();
    } else {
      this.toastr.error('No doctor ID found for the secretary.', 'Error');
    }
  }

  // Helper method to safely get remaining payment
  getRemainingToPay(appointment: Appointment): number {
    return appointment.remainingToPay ?? 0;
  }

  // Check if there's remaining payment
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
      error: (error) => {
        this.toastr.error('Failed to fetch available days', 'Error');
      },
    });
  }

  fetchAppointmentsForDate(date: string): void {
    this.appointmentService.searchAppointmentsByOptionalParams(this.doctorId).subscribe({
      next: (response: any) => {
        this.appointments = (response.data || []).filter((appointment: Appointment) => {
          return appointment.timeSlot?.date === date;
        });
      },
      error: (error) => {
        this.toastr.error('Failed to fetch appointments', 'Error');
      },
    });
  }

  onDateSelect(event: any): void {
    this.selectedDate = event.target.value;
    this.fetchAppointmentsForDate(this.selectedDate);
  }

  async exportToPDF(): Promise<void> {
    if (this.appointments.length === 0) {
      this.toastr.warning('No data to export for the selected date.');
      return;
    }

    this.isGeneratingPDF = true;

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40;
      const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);

      // Always use English for PDF export regardless of current language
      const translations = {
        title: 'Daily Revenue Report',
        report_date: 'Report Date',
        generated: 'Generated',
        secretary_for_doctor: 'Secretary for Doctor',
        patient_name: 'Patient Name',
        total: 'Total',
        paid: 'Paid',
        cash: 'Cash',
        wallet: 'Wallet',
        insta: 'Instapay',
        visa: 'Visa',
        remaining: 'Remaining',
        summary: 'Summary',
        total_collected: 'Total Collected',
        total_remaining: 'Total Remaining',
        no_data: 'No appointments for this date.',
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

      // Add secretary/doctor information
      const user = this.userService.getUser();
      if (user) {
        // Updated to include first and last name for doctorName
        const doctorFirstName = user.data.firstName || '';
        const doctorLastName = user.data.lastName || '';
        const doctorName = (doctorFirstName + ' ' + doctorLastName).trim() || 'N/A';
        doc.text(`${translations.secretary_for_doctor}: ${doctorName}`, margin, margin + 80);
      }

      // Prepare table data
      const tableColumn = [
        '#',
        translations.patient_name,
        translations.total,
        translations.cash,
        translations.wallet,
        translations.insta,
        translations.visa,
        translations.remaining
      ];

      const tableRows: any[] = [];
      let totalCollected = 0;
      let totalRemaining = 0;

      this.appointments.forEach((appointment, index) => {
        const remaining = this.getRemainingToPay(appointment);
        const collected = (appointment.paidCash || 0) + (appointment.paidInstapay || 0) + (appointment.paidWallet || 0) + (appointment.paidVisa || 0);

        totalCollected += collected;
        totalRemaining += remaining;

        tableRows.push([
          index + 1,
          appointment.patientName,
          (appointment.totalPrice || 0).toFixed(2),
          (appointment.paidCash || 0).toFixed(2),
          (appointment.paidWallet || 0).toFixed(2),
          (appointment.paidInstapay || 0).toFixed(2),
          (appointment.paidVisa || 0).toFixed(2),
          remaining.toFixed(2)
        ]);
      });

      // Add table
      autoTable(doc, {
        startY: margin + 100,
        head: [tableColumn],
        body: tableRows,
        headStyles: {
          fillColor: '#24CC81',
          textColor: '#ffffff',
          fontStyle: 'bold',
          halign: 'center'
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
          0: { halign: 'center' },
          1: { halign: 'left' },
          // Align currency columns to right
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        }
      });

      // Add summary section
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(translations.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${translations.total_collected}: ${totalCollected.toFixed(2)}`, margin, finalY + 25);
      doc.text(`${translations.total_remaining}: ${totalRemaining.toFixed(2)}`, margin, finalY + 45);


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