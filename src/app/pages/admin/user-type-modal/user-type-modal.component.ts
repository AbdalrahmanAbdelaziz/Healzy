import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-user-type-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, TranslocoModule],
  templateUrl: './user-type-modal.component.html',
  styleUrls: ['./user-type-modal.component.css']
})
export class UserTypeModalComponent {
  constructor(
    private dialogRef: MatDialogRef<UserTypeModalComponent>,
    private router: Router,
    public translocoService: TranslocoService 

  ) {}

  selectUser(type: 'doctor' | 'secretary'): void {
    this.dialogRef.close();
    if (type === 'doctor') {
      this.router.navigate(['/new-doctor']);
    } else if (type === 'secretary') {
      this.router.navigate(['/new-secretary']);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
