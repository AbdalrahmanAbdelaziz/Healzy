import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-user-type-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslocoModule],
  templateUrl: './user-type-modal.component.html',
  styleUrls: ['./user-type-modal.component.css']
})
export class UserTypeModalComponent {
  options = [
    {
      title: 'admin_dashboard.user_types.doctor',
      icon: 'medical_services',
      description: 'admin_dashboard.user_types.doctor_description',
      route: 'new-doctor',
      color: '#3f51b5'
    },
    {
      title: 'admin_dashboard.user_types.secretary',
      icon: 'admin_panel_settings',
      description: 'admin_dashboard.user_types.secretary_description',
      route: 'new-secretary',
      color: '#2196f3'
    }
  ];

  constructor(
    private dialogRef: MatDialogRef<UserTypeModalComponent>, 
    public translocoService: TranslocoService
  ) {}

  selectOption(route: string): void {
    this.dialogRef.close({ route });
  }

  close(): void {
    this.dialogRef.close();
  }
}