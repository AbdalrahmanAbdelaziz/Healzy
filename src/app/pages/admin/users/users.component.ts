import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { DoctorService } from '../../../services/doctor.service';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { LoadingSpinnerComponent } from '../../../shared/constants/loading-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { DoctorRevenue } from '../../../shared/models/DoctorRevenue';
import { DoctorsRevenueResponse } from '../../../shared/models/DoctorsRevenueResponse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, 
    AdminHeaderComponent, 
    LoadingSpinnerComponent, 
    TranslocoModule,
    ReactiveFormsModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  doctors: DoctorRevenue[] = [];
  filteredDoctors: DoctorRevenue[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  searchQuery = '';
  currentLanguage = 'en';
  revenueForm: FormGroup;
  totalOurRevenue = 0;
  totalDrRevenue = 0;
  isGeneratingPDF = false;

  @ViewChild('reportContent') reportContent!: ElementRef;

  constructor(
    private doctorService: DoctorService,
    private translocoService: TranslocoService,
    private toastr: ToastrService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.revenueForm = this.fb.group({
      month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]]
    });
  }

  ngOnInit(): void {
    this.currentLanguage = this.translocoService.getActiveLang();
  }

  loadDoctorsWithRevenue(): void {
    if (this.revenueForm.invalid) {
      this.toastr.error(this.translocoService.translate('errors.invalid_month_year'));
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.totalOurRevenue = 0;
    this.totalDrRevenue = 0;

    const { month, year } = this.revenueForm.value;

    this.doctorService.getDoctorsWithRevenueForMonth(month, year).subscribe({
      next: (response: DoctorsRevenueResponse<DoctorRevenue[]>) => {
        if (response.succeeded && response.data) {
          this.doctors = response.data;
          this.filteredDoctors = [...this.doctors];
          
          // Calculate totals
          this.totalOurRevenue = this.doctors.reduce((sum, doctor) => sum + (doctor.ourCheckupTotalRevenu || 0), 0);
          this.totalDrRevenue = this.doctors.reduce((sum, doctor) => sum + (doctor.drCheckupTotalRevenu || 0), 0); // CHANGED HERE
        } else {
          const message = response.message || 
                          this.translocoService.translate('errors.failed_load_doctors');
          this.errorMessage = message;
          this.toastr.error(message);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.errorMessage = this.translocoService.translate('errors.load_doctors_error');
        this.isLoading = false;
      }
    });
  }

  navigateToDoctor(doctorId: number): void {
    const { month, year } = this.revenueForm.value;
    this.router.navigate(['/each-doctor'], { 
      queryParams: { 
        id: doctorId,
        month: month,
        year: year
      }
    });
  }

  getTranslatedName(item: DoctorRevenue, property: 'gender' | 'country' | 'governorate' | 'district'): string {
    return this.currentLanguage === 'ar' ? 
           item[`${property}_Ar` as keyof DoctorRevenue] as string : 
           item[`${property}_En` as keyof DoctorRevenue] as string;
  }

  filterDoctors(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value.toLowerCase();
    
    if (!this.searchQuery) {
      this.filteredDoctors = [...this.doctors];
      return;
    }

    this.filteredDoctors = this.doctors.filter(doctor => 
      doctor.firstName.toLowerCase().includes(this.searchQuery) ||
      doctor.lastName.toLowerCase().includes(this.searchQuery) ||
      doctor.email.toLowerCase().includes(this.searchQuery) ||
      doctor.phoneNumber.toLowerCase().includes(this.searchQuery) ||
      this.getTranslatedName(doctor, 'country').toLowerCase().includes(this.searchQuery) ||
      this.getTranslatedName(doctor, 'governorate').toLowerCase().includes(this.searchQuery) ||
      this.getTranslatedName(doctor, 'district').toLowerCase().includes(this.searchQuery)
    );
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredDoctors = [...this.doctors];
  }

  getCurrentDirection(): string {
    const currentLang = this.translocoService.getActiveLang();
    return currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  async exportToPDF(): Promise<void> {
    if (this.doctors.length === 0) {
      this.toastr.warning(this.translocoService.translate('doctors.no_data_to_export'));
      return;
    }

    this.isGeneratingPDF = true;

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40;
      const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);

      // Always use English for PDF export regardless of current language
      const translations = {
        title: 'Doctors Revenue Report',
        report_period: 'Report Period',
        generated: 'Generated',
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        location: 'Location',
        check_price: 'Check Price',
        our_revenue: 'Our Revenue',
        doctor_revenue: 'Doctor Revenue',
        summary: 'Summary',
        total_our_revenue: 'Total Our Revenue',
        total_doctor_revenue: 'Total Doctor Revenue',
        total_revenue: 'Total Revenue'
      };

      // Add header
      doc.setFontSize(18);
      doc.setTextColor('#24CC81');
      doc.text(translations.title, margin, margin + 20);

      doc.setFontSize(12);
      doc.setTextColor('#666666');
      
      // Get month name and year
      const monthName = new Date(this.revenueForm.value.year, this.revenueForm.value.month - 1, 1)
        .toLocaleString('en-US', { month: 'long' });
      doc.text(`${translations.report_period}: ${monthName} ${this.revenueForm.value.year}`, margin, margin + 40);
      
      doc.text(`${translations.generated}: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, margin, margin + 60);

      // Prepare table data
      const tableData = this.doctors.map(doctor => [
        `${doctor.firstName} ${doctor.lastName}`,
        doctor.phoneNumber,
        doctor.email,
        `${this.getTranslatedName(doctor, 'country')}, ${this.getTranslatedName(doctor, 'governorate')}, ${this.getTranslatedName(doctor, 'district')}`,
        this.formatCurrency(doctor.checkPrice || 0),
        this.formatCurrency(doctor.ourCheckupTotalRevenu || 0),
        this.formatCurrency(doctor.drCheckupTotalRevenu || 0) // CHANGED HERE
      ]);

      // Add table
      autoTable(doc, {
        startY: margin + 80,
        head: [
          [
            translations.name,
            translations.phone,
            translations.email,
            translations.location,
            translations.check_price,
            translations.our_revenue,
            translations.doctor_revenue
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
          2: { halign: 'left' },
          3: { halign: 'left' }
        }
      });

      // Add summary section
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.setTextColor('#24CC81');
      doc.text(translations.summary, margin, finalY);

      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(`${translations.total_our_revenue}: ${this.formatCurrency(this.totalOurRevenue)}`, margin, finalY + 25);
      doc.text(`${translations.total_doctor_revenue}: ${this.formatCurrency(this.totalDrRevenue)}`, margin, finalY + 45); // CHANGED HERE
      doc.text(`${translations.total_revenue}: ${this.formatCurrency(this.totalOurRevenue + this.totalDrRevenue)}`, margin, finalY + 65);

      // Add footer
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text('© ' + new Date().getFullYear() + ' Your Clinic Name. All rights reserved.',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );

      // Generate filename
      const fileName = `Doctors_Revenue_Report_${monthName}_${this.revenueForm.value.year}.pdf`;

      // --- Platform Detection: Browser vs Mobile ---
      const isMobile = this.isMobilePlatform();
      
      if (isMobile) {
        // Mobile behavior: Use Capacitor Filesystem and Share
        const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
        const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

        // Use Capacitor Filesystem to write the file
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });

        // Optional: Share the PDF after saving
        const fileUri = (await Filesystem.getUri({
          directory: Directory.Documents,
          path: fileName
        })).uri;

        await Share.share({
          title: translations.title,
          text: `Doctors revenue report for ${monthName} ${this.revenueForm.value.year}`,
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

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'EGP'
    });
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