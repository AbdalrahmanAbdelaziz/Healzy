import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.css'
})
export class ConfirmationModalComponent {
  @Input() isVisible: boolean = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<void>();

  constructor(public translocoService: TranslocoService){}

  onConfirm(): void {
    this.confirmed.emit();
    this.isVisible = false;
  }

  onCancel(): void {
    this.canceled.emit();
    this.isVisible = false;
  }
}