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

// Import jsPDF with proper types
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import Capacitor Filesystem and Share
import { Filesystem, Directory } from '@capacitor/filesystem'; // Removed Encoding as it's not needed for base64 data
import { Share } from '@capacitor/share'; // Optional: for sharing the PDF

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
      error: (error) => {
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
      error: (error) => {
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
      this.toastr.warning('No data to export');
      return;
    }

    this.isGeneratingPDF = true;

    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      // Set metadata
      doc.setProperties({
        title: `Daily Revenue Report - ${this.selectedDate}`,
        subject: 'Revenue Report',
        author: 'Your Clinic Name',
        keywords: 'revenue, report, clinic',
        creator: 'Your Clinic App'
      });

      // Add header
      doc.setFontSize(18);
      doc.setTextColor('#24CC81');
      doc.text('Daily Revenue Report', 40, 40);

      // Add report details
      doc.setFontSize(12);
      doc.setTextColor('#666666');
      doc.text(`Report Date: ${this.selectedDate}`, 40, 70);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 90);

      // Add doctor information
      const user = this.userService.getUser();
      if (user) {
        const doctorName = `${user.data.firstName || ''} ${user.data.lastName || ''}`.trim();
        doc.text(`Doctor: ${doctorName}`, 40, 110);
      }

      // Prepare table data
      const tableData = this.appointments.map((appointment, index) => [
        (index + 1).toString(),
        appointment.patientName || 'N/A',
        (appointment.totalPrice || 0).toFixed(2),
        (appointment.paidCash || 0).toFixed(2),
        (appointment.paidWallet || 0).toFixed(2),
        (appointment.paidInstapay || 0).toFixed(2),
        (appointment.paidVisa || 0).toFixed(2),
        this.getRemainingToPay(appointment).toFixed(2)
      ]);

      // Add table
      autoTable(doc, {
        startY: 130,
        head: [
          ['#', 'Patient Name', 'Total', 'Cash', 'Wallet', 'Instapay', 'Visa', 'Remaining']
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
          cellPadding: 6,
          fontSize: 10,
          valign: 'middle',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 30 },
          1: { halign: 'left', cellWidth: 100 },
          2: { halign: 'right', cellWidth: 50 },
          3: { halign: 'right', cellWidth: 50 },
          4: { halign: 'right', cellWidth: 50 },
          5: { halign: 'right', cellWidth: 50 },
          6: { halign: 'right', cellWidth: 50 },
          7: { halign: 'right', cellWidth: 60 }
        }
      });

      // Add summary section
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      const totalRevenue = this.appointments.reduce((sum, app) => sum + (app.totalPrice || 0), 0);
      const totalPaid = this.appointments.reduce((sum, app) => sum + this.calculateTotalPaid(app), 0);
      const totalRemaining = this.appointments.reduce((sum, app) => sum + this.getRemainingToPay(app), 0);

      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text('Summary', 40, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`Total Revenue: ${totalRevenue.toFixed(2)}`, 40, finalY + 25);
      doc.text(`Total Paid: ${totalPaid.toFixed(2)}`, 40, finalY + 50);
      doc.text(`Total Remaining: ${totalRemaining.toFixed(2)}`, 40, finalY + 75);

      // Define the file name
      const fileName = `Daily_Revenue_Report_${this.selectedDate.replace(/-/g, '')}.pdf`;

      // Convert PDF to Blob and then to Base64
      const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
      const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

      // Use Capacitor Filesystem to write the file
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents, // A suitable directory for user documents
        // encoding property is not needed for base64 data as inferred by Capacitor
      });

      // Optional: Share the PDF after saving
      const fileUriResult = await Filesystem.getUri({
        directory: Directory.Documents,
        path: fileName
      });

      if (fileUriResult && fileUriResult.uri) {
          await Share.share({
            title: 'Daily Revenue Report',
            text: `Here is your Daily Revenue Report for ${this.selectedDate}.`,
            url: fileUriResult.uri,
            dialogTitle: 'Share PDF Report'
          });
          this.toastr.success('PDF exported and saved successfully!');
      } else {
          this.toastr.success('PDF exported successfully. Could not get file URI for sharing.');
      }

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
        // The result will be a Data URL (e.g., "data:application/pdf;base64,...")
        // We need to extract just the base64 part
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });

  // The isMobileApp check is no longer strictly necessary for the PDF export logic
  // as the Capacitor Filesystem API will handle it, but you can keep it for other purposes if needed.
  private isMobileApp(): boolean {
    interface CustomWindow extends Window {
      cordova?: any;
      Capacitor?: any;
      phonegap?: any;
      PhoneGap?: any;
    }

    const customWindow = window as unknown as CustomWindow;

    return !!(
      customWindow.cordova ||
      customWindow.Capacitor ||
      customWindow.phonegap ||
      customWindow.PhoneGap ||
      navigator.userAgent.match(/(Android|iPhone|iPad|iPod|BlackBerry|Windows Phone)/i)
    );
  }
}