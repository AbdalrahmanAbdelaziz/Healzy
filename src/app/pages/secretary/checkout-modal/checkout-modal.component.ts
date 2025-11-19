import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../services/appointment.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

// Import Capacitor Filesystem and Share
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './checkout-modal.component.html',
  styleUrls: ['./checkout-modal.component.css']
})
export class CheckoutModalComponent implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() appointmentId!: number;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('receiptContent') receiptContent!: ElementRef;

  constructor(
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    public translocoService: TranslocoService
  ) {}

  appointmentData: any = {
    patientName: '',
    doctorName: '',
    timeSlot: { date: '', startTime: '', endTime: '' },
    totalPrice: 0,
    remainingToPay: 0,
    paidCash: 0,
    paidInstapay: 0,
    paidWallet: 0,
    paidVisa: 0,
    checkPrice: 0
  };

  receiptServices: any[] = [];
  paymentMethod: string | null = null;
  paidAmount: number = 0;
  isLoading: boolean = false;
  isGeneratingPDF: boolean = false;

  paymentMethods: { name: string, icon: string, displayName: string }[] = [];

  // English receipt labels - for consistent PDF generation regardless of app language
  private receiptLabels = {
    receipt_title: 'Payment Receipt',
    issue_date: 'Issue Date',
    method: 'Method',
    amount: 'Amount',
    date: 'Date',
    thankYou: 'Thank you for your visit!',
    payment_details: 'Payment Details',
    shareTitle: 'Share Payment Receipt',
    shareText: 'Payment receipt for Appointment ID'
  };

  ngOnInit(): void {
    this.paymentMethods = [
      { name: 'paidCash', icon: 'fa-solid fa-money-bill-wave', displayName: '' },
      { name: 'paidInstapay', icon: 'fa-solid fa-mobile-screen-button', displayName: '' },
      { name: 'paidWallet', icon: 'fa-solid fa-wallet', displayName: '' },
      { name: 'paidVisa', icon: 'fa-brands fa-cc-visa', displayName: '' }
    ];

    this.paymentMethods.forEach(method => {
      method.displayName = this.translocoService.translate(`paymentMethods.${method.name.replace('paid', '').toLowerCase()}`);
    });

    if (this.appointmentId) {
      this.fetchAppointmentData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isVisible']?.currentValue === true && changes['isVisible']?.previousValue === false) ||
        changes['appointmentId']?.currentValue) {
      if (this.appointmentId) {
        this.fetchAppointmentData();
      }
    }
  }

  fetchAppointmentData(): void {
    if (!this.appointmentId) {
      console.error('No appointment ID provided');
      return;
    }

    this.isLoading = true;

    forkJoin([
      this.appointmentService.getAppointmentById(this.appointmentId),
      this.appointmentService.getAppointmentReceipt(this.appointmentId)
    ]).subscribe({
      next: ([appointmentResponse, receiptResponse]) => {
        const totalPrice = receiptResponse.data?.totalPrice || 0;
        const totalPaid = this.calculateTotalPaidFromReceipt(receiptResponse.data);
        
        this.appointmentData = {
          patientName: appointmentResponse.data?.patientName || 'N/A',
          doctorName: appointmentResponse.data?.doctorName || 'N/A',
          timeSlot: appointmentResponse.data?.timeSlot || { date: '', startTime: '', endTime: '' },
          totalPrice: totalPrice,
          remainingToPay: totalPrice - totalPaid,
          paidCash: receiptResponse.data?.paidCash || 0,
          paidInstapay: receiptResponse.data?.paidInstapay || 0,
          paidWallet: receiptResponse.data?.paidWallet || 0,
          paidVisa: receiptResponse.data?.paidVisa || 0,
          checkPrice: appointmentResponse.data?.checkPrice || 0
        };

        this.receiptServices = receiptResponse.data?.appointmentServicesResponses || [];
        this.paidAmount = this.appointmentData.remainingToPay;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        this.toastr.error(this.translocoService.translate('errors.fetchAppointmentError'));
        this.isLoading = false;
      }
    });
  }

  private calculateTotalPaidFromReceipt(receiptData: any): number {
    return (receiptData?.paidCash || 0) +
           (receiptData?.paidInstapay || 0) +
           (receiptData?.paidWallet || 0) +
           (receiptData?.paidVisa || 0);
  }

  calculateTotalPaid(): number {
    return (this.appointmentData.paidCash || 0) +
           (this.appointmentData.paidInstapay || 0) +
           (this.appointmentData.paidWallet || 0) +
           (this.appointmentData.paidVisa || 0);
  }

  onPaymentMethodChange(method: string): void {
    this.paymentMethod = method;
  }

  onSubmit(): void {
    if (!this.paymentMethod) {
      this.toastr.error(this.translocoService.translate('validation.selectPaymentMethod'));
      return;
    }

    if (this.paidAmount <= 0) {
      this.toastr.error(this.translocoService.translate('validation.enterValidAmount'));
      return;
    }

    if (this.paidAmount > (this.appointmentData?.remainingToPay || 0) + 0.01) {
      this.toastr.error(this.translocoService.translate('validation.amountExceedsRemaining'));
      return;
    }

    const paymentData = {
      paidCash: this.paymentMethod === 'paidCash' ? this.paidAmount : 0,
      paidInstapay: this.paymentMethod === 'paidInstapay' ? this.paidAmount : 0,
      paidWallet: this.paymentMethod === 'paidWallet' ? this.paidAmount : 0,
      paidVisa: this.paymentMethod === 'paidVisa' ? this.paidAmount : 0,
      appointmentId: this.appointmentId
    };

    this.isLoading = true;
    this.appointmentService.payAppointment(paymentData).subscribe({
      next: () => {
        this.toastr.success(this.translocoService.translate('success.paymentSuccess'));
        this.isLoading = false;
        this.generatePaymentReceipt();
        this.onClose();
      },
      error: (error) => {
        console.error('Payment error:', error);
        this.toastr.error(this.translocoService.translate('errors.paymentError'));
        this.isLoading = false;
      }
    });
  }

  /**
   * Helper function to format date for the PDF (English format for consistency)
   */
  private formatDateEnglish(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '');
  }

  /**
   * Builds and prepares the complete HTML content for PDF generation by cloning the
   * receipt template and injecting the current payment details using hardcoded English labels
   * for consistent document structure.
   */
  private buildDynamicReceiptContentForPDF(): HTMLDivElement {
      const pdfContainer = document.createElement('div');
      pdfContainer.id = 'pdf-container';
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.left = '-10000px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px'; 
      pdfContainer.style.padding = '20px';
      pdfContainer.style.backgroundColor = 'white';

      const content = this.receiptContent.nativeElement.cloneNode(true) as HTMLElement;

      // 1. Remove interactive/irrelevant elements
      content.querySelectorAll('button, form, input, .action-buttons').forEach(el => el.remove());

      // 2. Add app logo at the top
      const logoHtml = `
          <div class="receipt-logo" style="text-align: center; margin-bottom: 20px;">
              <img src="assets/images/vv_b.png"
                  alt="App Logo"
                  style="height: 80px; margin-bottom: 15px;">
          </div>
      `;
      const header = content.querySelector('.receipt-header');
      if (header) {
          header.insertAdjacentHTML('beforebegin', logoHtml);
      }

      // 3. Get current payment details for injection
      const currentTransactionDate = new Date();
      const paymentMethodObject = this.paymentMethods.find(m => m.name === this.paymentMethod);
      // Translate the payment method name for the PDF
      const paymentMethodName = paymentMethodObject 
          ? this.translocoService.translate(`paymentMethods.${paymentMethodObject.name.replace('paid', '').toLowerCase()}`)
          : 'N/A';
      
      // 4. Create and inject the specific payment details section (current transaction only)
      const paymentDetailsHTML = `
          <div class="payment-details-section" style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
              <h4 class="section-title" style="color: #24CC81; margin-bottom: 10px; font-size: 16px;">
                  ${this.receiptLabels.payment_details}
              </h4>
              <div class="payment-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 14px;">
                  <div class="payment-info-item">
                      <span class="label" style="font-weight: bold;">${this.receiptLabels.method}:</span>
                      <span class="value">${paymentMethodName}</span>
                  </div>
                  <div class="payment-info-item">
                      <span class="label" style="font-weight: bold;">${this.receiptLabels.amount}:</span>
                      <span class="value">${this.paidAmount.toFixed(2)} ${this.translocoService.translate('general.currency')}</span>
                  </div>
                  <div class="payment-info-item" style="grid-column: 1 / span 2;">
                      <span class="label" style="font-weight: bold;">${this.receiptLabels.date}:</span>
                      <span class="value">${this.formatDateEnglish(currentTransactionDate)}</span>
                  </div>
              </div>
          </div>
      `;

      // Insert the payment details before the final summary/footer
      const footer = content.querySelector('.receipt-footer');
      if (footer) {
          footer.insertAdjacentHTML('beforebegin', paymentDetailsHTML);

          // 5. Update footer with hardcoded English thank you text
          const thankYou = footer.querySelector('p');
          if (thankYou) {
              thankYou.textContent = this.receiptLabels.thankYou;
          }
      }

      // 6. Ensure table headers and rows are visible in PDF by setting display styles
      content.querySelectorAll('.table-header, .table-row').forEach(element => {
          (element as HTMLElement).style.display = 'flex';
          (element as HTMLElement).style.flexDirection = 'row';
      });

      pdfContainer.appendChild(content);
      return pdfContainer;
  }

  async generatePaymentReceipt(): Promise<void> {
    this.isGeneratingPDF = true;
    let container: HTMLDivElement | null = null;

    try {
      // Build the dynamically structured and styled content
      container = this.buildDynamicReceiptContentForPDF();
      document.body.appendChild(container);

      // Wait briefly to ensure content is rendered, especially images
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate canvas from HTML content
      const canvas = await html2canvas(container, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: container.scrollWidth,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Convert canvas to PDF
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const margin = 20;
      const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);

      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, pdfWidth, imgHeight);
      heightLeft -= (pdf.internal.pageSize.getHeight() - margin);

      // Add new pages if content is longer than one page
      while (heightLeft > 0) {
        position = -((imgHeight - heightLeft) + margin);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, pdfWidth, imgHeight);
        heightLeft -= (pdf.internal.pageSize.getHeight() - margin);
      }

      // Generate filename using English/transloco key for consistency
      const filename = this.translocoService.translate('receipt.filename', {
        id: this.appointmentId,
        date: new Date().toISOString().slice(0, 10)
      }).replace(/ /g, '_') + '.pdf';

      // --- Platform Detection: Browser vs Mobile (APK) ---
      const isMobile = this.isMobilePlatform();
      
      if (isMobile) {
        // 📱 Mobile behavior: Use Capacitor Filesystem and Share
        const pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
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
            title: this.receiptLabels.shareTitle,
            text: `${this.receiptLabels.shareText} ${this.appointmentId}`,
            url: fileUriResult.uri,
            dialogTitle: this.translocoService.translate('receipt.shareDialogTitle')
          });
          this.toastr.success(this.translocoService.translate('success.pdfSavedAndShared'));
        } else {
          this.toastr.success(this.translocoService.translate('success.pdfSavedOnly'));
        }
      } else {
        // 🖥️ Browser behavior: Direct download
        pdf.save(filename);
        this.toastr.success(this.translocoService.translate('success.pdfSavedOnly'));
      }

    } catch (error) {
      console.error('PDF Generation or Saving Error:', error);
      this.toastr.error(this.translocoService.translate('errors.pdfGenerationError'));
    } finally {
      if (container) {
        document.body.removeChild(container);
      }
      this.isGeneratingPDF = false;
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  // Helper method to detect mobile platforms (identical to RevenueComponent)
  private isMobilePlatform(): boolean {
    const capacitor = (window as any).Capacitor;
    if (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) {
      return true;
    }
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}