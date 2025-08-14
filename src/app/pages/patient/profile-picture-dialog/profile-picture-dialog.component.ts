import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'app-profile-picture-dialog',
  imports: [],
  templateUrl: './profile-picture-dialog.component.html',
  styleUrl: './profile-picture-dialog.component.css'
})
export class ProfilePictureDialogComponent {
  selectedFile: File | null = null;

  constructor(
    private http: HttpClient, 
    public dialogRef: MatDialogRef<ProfilePictureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { profilePicture: string }
  ) {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadImage() {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile); // Append file to FormData
  
      this.http.post(`YOUR_BACKEND_URL/api/users/upload-profile-picture`, formData).subscribe({
        next: (response: any) => {
          this.dialogRef.close(response.imageUrl); // Get new image URL from backend response
        },
        error: (error) => {
          console.error('Upload failed', error);
        }
      });
    }
  }
  
}

