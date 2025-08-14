import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AdminHeaderComponent } from "../admin-header/admin-header.component";
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { UserTypeModalComponent } from '../user-type-modal/user-type-modal.component';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    TranslocoModule
  ],
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent {
  gridColumns = 4;
  rowHeight = '300px';
  gutterSize = '20px';

  cards = [
    { 
      title: 'admin_dashboard.cards.rev.title', 
      icon: 'attach_money', 
      description: 'admin_dashboard.cards.rev.description', 
      route: '/users',
      color: 'linear-gradient(135deg, #455A64 0%, #90A4AE 100%)'
    },
    { 
      title: 'admin_dashboard.cards.all_users.title', 
      icon: 'groups', 
      description: 'admin_dashboard.cards.all_users.description', 
      route: '/all-users',
      color: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)'
    },
   
    { 
      title: 'admin_dashboard.cards.new_user.title', 
      icon: 'person_add', 
      description: 'admin_dashboard.cards.new_user.description', 
      action: 'openUserTypeModal', 
      color: 'linear-gradient(135deg, #2196f3 0%, #00bcd4 100%)'
    },
    { 
      title: 'admin_dashboard.cards.clinics.title', 
      icon: 'local_hospital', 
      description: 'admin_dashboard.cards.clinics.description', 
      route: '/clinics',
      color: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_clinic.title', 
      icon: 'add_business', 
      description: 'admin_dashboard.cards.new_clinic.description', 
      route: '/create_clinic',
      color: 'linear-gradient(135deg, #8bc34a 0%, #cddc39 100%)'
    },
    { 
      title: 'admin_dashboard.cards.specializations.title', 
      icon: 'medical_services', 
      description: 'admin_dashboard.cards.specializations.description', 
      route: '/specializations',
      color: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_specialization.title', 
      icon: 'add_circle', 
      description: 'admin_dashboard.cards.new_specialization.description', 
      route: '/new-specialization',
      color: 'linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%)'
    },
    { 
      title: 'admin_dashboard.cards.services.title', 
      icon: 'miscellaneous_services', 
      description: 'admin_dashboard.cards.services.description', 
      route: '/services',
      color: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_service.title', 
      icon: 'post_add', 
      description: 'admin_dashboard.cards.new_service.description', 
      route: '/new-service',
      color: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)'
    }
  ];

  constructor(
    private router: Router,
    private dialog: MatDialog,
    public translocoService: TranslocoService
  ) {}

  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    const screenWidth = window.innerWidth;
    
    if (screenWidth >= 1400) {
      this.gridColumns = 4;
      this.rowHeight = '300px';
    } else if (screenWidth >= 1024) {
      this.gridColumns = 3;
      this.rowHeight = '320px';
    } else if (screenWidth >= 768) {
      this.gridColumns = 2;
      this.rowHeight = '340px';
    } else {
      this.gridColumns = 1;
      this.rowHeight = '360px';
    }
  }

  ngOnInit() {
    this.onResize();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  openUserTypeModal(): void {
    const dialogRef = this.dialog.open(UserTypeModalComponent, {
      width: '500px',
      panelClass: 'user-type-modal',
      disableClose: true,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate([result.route]);
      }
    });
  }

  private actionMap: { [key: string]: () => void } = {
    openUserTypeModal: () => this.openUserTypeModal()
  };

  cardAction(card: any): void {
    if (card.action && this.actionMap[card.action]) {
      this.actionMap[card.action]();
    } else if (card.route) {
      this.navigateTo(card.route);
    }
  }
}