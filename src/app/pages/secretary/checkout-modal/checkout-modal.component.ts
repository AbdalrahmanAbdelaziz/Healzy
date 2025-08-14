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

  async generatePaymentReceipt(): Promise<void> {
    this.isGeneratingPDF = true;

    try {
      const pdfContainer = document.createElement('div');
      pdfContainer.id = 'pdf-container';
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.left = '-10000px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px'; // Increased width for better table display
      pdfContainer.style.padding = '20px';
      pdfContainer.style.backgroundColor = 'white';

      const content = this.receiptContent.nativeElement.cloneNode(true) as HTMLElement;

      // Remove buttons and form elements from the cloned content for PDF
      const buttons = content.querySelectorAll('button');
      buttons.forEach(btn => btn.remove());
      const forms = content.querySelectorAll('form');
      forms.forEach(form => form.remove());

      // Add app logo at the top
      const logoHtml = `
        <div class="receipt-logo" style="text-align: center; margin-bottom: 20px;">
          <img src="assets/images/vv_b.png"
               alt="App Logo"
               style="height: 80px; margin-bottom: 15px;">
        </div>
      `;

      // Insert logo at the top of the content
      const header = content.querySelector('.receipt-header');
      if (header) {
        header.insertAdjacentHTML('beforebegin', logoHtml);
      }

      // Get translated payment method name for the current transaction
      const paymentMethodKey = this.paymentMethods.find(m => m.name === this.paymentMethod)?.name.replace('paid', '').toLowerCase() || '';
      const paymentMethodName = this.translocoService.translate(`paymentMethods.${paymentMethodKey}`);

      // Add payment details section with translated labels
      const paymentDetailsHTML = `
        <div class="payment-details-section" style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
          <h4 class="section-title" style="color: #24CC81; margin-bottom: 10px; font-size: 16px;">
            ${this.translocoService.translate('receipt.paymentDetails')}
          </h4>
          <div class="payment-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div class="payment-info-item">
              <span class="label" style="font-weight: bold;">${this.translocoService.translate('receipt.method')}:</span>
              <span class="value">${paymentMethodName}</span>
            </div>
            <div class="payment-info-item">
              <span class="label" style="font-weight: bold;">${this.translocoService.translate('receipt.amount')}:</span>
              <span class="value">${this.paidAmount.toFixed(2)} ${this.translocoService.translate('general.currency')}</span>
            </div>
            <div class="payment-info-item">
              <span class="label" style="font-weight: bold;">${this.translocoService.translate('receipt.date')}:</span>
              <span class="value">${new Date().toLocaleString(this.translocoService.getActiveLang())}</span>
            </div>
          </div>
        </div>
      `;

      const footer = content.querySelector('.receipt-footer');
      if (footer) {
        footer.insertAdjacentHTML('beforebegin', paymentDetailsHTML);

        // Update footer with translated text
        const thankYou = footer.querySelector('p');
        if (thankYou) {
          thankYou.textContent = this.translocoService.translate('receipt.thankYou');
        }
      }

      // Ensure table headers are visible in PDF
     const tableHeaders = content.querySelectorAll('.table-header');
      tableHeaders.forEach(header => {
        (header as HTMLElement).style.display = 'flex'; // Cast to HTMLElement
      });

      // Ensure table rows are horizontal in PDF
      const tableRows = content.querySelectorAll('.table-row');
      tableRows.forEach(row => {
        (row as HTMLElement).style.flexDirection = 'row'; // Cast to HTMLElement
      });

      pdfContainer.appendChild(content);
      document.body.appendChild(pdfContainer);

      // Wait briefly to ensure logo loads and content is rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF from HTML content
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: pdfContainer.scrollWidth,
        width: pdfContainer.scrollWidth,
        height: pdfContainer.scrollHeight
      });

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

      // Save with translated filename
      const filename = this.translocoService.translate('receipt.filename', {
        id: this.appointmentId,
        date: new Date().toISOString().slice(0, 10)
      });

      // --- Capacitor Filesystem Integration ---
      const pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
      const base64Data = await this.convertBlobToBase64(pdfBlob) as string;

      const fullFileName = `${filename}.pdf`;

      // Use Capacitor Filesystem to write the file
      await Filesystem.writeFile({
        path: fullFileName,
        data: base64Data,
        directory: Directory.Documents,
      });

      // Get the URI to share the file
      const fileUriResult = await Filesystem.getUri({
        directory: Directory.Documents,
        path: fullFileName
      });

      if (fileUriResult && fileUriResult.uri) {
        await Share.share({
          title: this.translocoService.translate('receipt.shareTitle'),
          text: this.translocoService.translate('receipt.shareText', { id: this.appointmentId }),
          url: fileUriResult.uri,
          dialogTitle: this.translocoService.translate('receipt.shareDialogTitle')
        });
        this.toastr.success(this.translocoService.translate('success.pdfSavedAndShared'));
      } else {
        this.toastr.success(this.translocoService.translate('success.pdfSavedOnly'));
      }

    } catch (error) {
      console.error('PDF Generation or Saving Error:', error);
      this.toastr.error(this.translocoService.translate('errors.pdfGenerationError'));
    } finally {
      const container = document.getElementById('pdf-container');
      if (container) {
        document.body.removeChild(container);
      }
      this.isGeneratingPDF = false;
    }
  }

  onClose(): void {
    this.closed.emit();
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