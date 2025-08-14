import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
  providedIn: 'root'
})
export class ToastrService {
  constructor(
    private _snackBar: MatSnackBar
  ) {}

  showSuccess = (message: string, action: string = 'Close', duration: number = 5000): void => {
    this._snackBar.open(message, action, {
      duration: duration,
      panelClass: ['success-snackbar'], // Global SCSS
    });
  }

  showError = (message: string, action: string = 'Close', duration: number = 5000): void => {
    this._snackBar.open(message, action, {
      duration: duration,
      panelClass: ['error-snackbar'], // Global SCSS
    });
  }

  showInfo = (message: string, action: string = 'Close', duration: number = 5000): void => {
    this._snackBar.open(message, action, {
      duration: duration,
      panelClass: ['info-snackbar'], // Global SCSS
    });
  }
}
