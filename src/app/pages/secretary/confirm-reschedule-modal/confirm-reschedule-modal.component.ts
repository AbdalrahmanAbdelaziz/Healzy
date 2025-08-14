import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-confirm-reschedule-modal',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './confirm-reschedule-modal.component.html',
  styleUrls: ['./confirm-reschedule-modal.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: 0 }),
        animate('300ms ease-in-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ transform: 'translateY(-20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ConfirmRescheduleModalComponent implements OnInit{
  constructor(public translocoService: TranslocoService){}

  ngOnInit(): void {
      
  }
  @Input() isVisible: boolean = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
    this.isVisible = false;
  }

  onCancel(): void {
    this.canceled.emit();
    this.isVisible = false;
  }
}