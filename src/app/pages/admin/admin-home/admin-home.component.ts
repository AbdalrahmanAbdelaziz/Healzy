// admin-home.component.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminHeaderComponent } from "../admin-header/admin-header.component";
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    TranslocoModule
  ],
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit {
  gridColumns = 4;
  rowHeight = '300px';
  gutterSize = '20px';

  cards = [
    { 
      title: 'admin_dashboard.cards.rev.title', 
      icon: '💰', 
      description: 'admin_dashboard.cards.rev.description', 
      route: '/users',
      color: 'linear-gradient(135deg, #455A64 0%, #90A4AE 100%)'
    },
    { 
      title: 'admin_dashboard.cards.all_users.title', 
      icon: '👥', 
      description: 'admin_dashboard.cards.all_users.description', 
      route: '/all-users',
      color: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_user.title', 
      icon: '➕', 
      description: 'admin_dashboard.cards.new_user.description', 
      action: 'openUserTypeModal', 
      color: 'linear-gradient(135deg, #2196f3 0%, #00bcd4 100%)'
    },
    { 
      title: 'admin_dashboard.cards.clinics.title', 
      icon: '🏥', 
      description: 'admin_dashboard.cards.clinics.description', 
      route: '/clinics',
      color: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_clinic.title', 
      icon: '🏢', 
      description: 'admin_dashboard.cards.new_clinic.description', 
      route: '/create_clinic',
      color: 'linear-gradient(135deg, #8bc34a 0%, #cddc39 100%)'
    },
    { 
      title: 'admin_dashboard.cards.specializations.title', 
      icon: '⚕️', 
      description: 'admin_dashboard.cards.specializations.description', 
      route: '/specializations',
      color: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_specialization.title', 
      icon: '🎯', 
      description: 'admin_dashboard.cards.new_specialization.description', 
      route: '/new-specialization',
      color: 'linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%)'
    },
    { 
      title: 'admin_dashboard.cards.services.title', 
      icon: '🔧', 
      description: 'admin_dashboard.cards.services.description', 
      route: '/services',
      color: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_service.title', 
      icon: '🛠️', 
      description: 'admin_dashboard.cards.new_service.description', 
      route: '/new-service',
      color: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)'
    },
    { 
      title: 'admin_dashboard.cards.countries.title', 
      icon: '🌎', 
      description: 'admin_dashboard.cards.countries.description', 
      route: '/countries',
      color: 'linear-gradient(135deg, #607D8B 0%, #78909C 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_country.title', 
      icon: '📍', 
      description: 'admin_dashboard.cards.new_country.description', 
      route: '/new-country',
      color: 'linear-gradient(135deg, #78909C 0%, #90A4AE 100%)'
    },
    { 
      title: 'admin_dashboard.cards.governorates.title', 
      icon: '🗺️', 
      description: 'admin_dashboard.cards.governorates.description', 
      route: '/governorates',
      color: 'linear-gradient(135deg, #5C6BC0 0%, #7986CB 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_governorate.title', 
      icon: '📌', 
      description: 'admin_dashboard.cards.new_governorate.description', 
      route: '/new-governorate',
      color: 'linear-gradient(135deg, #7986CB 0%, #9FA8DA 100%)'
    },
    { 
      title: 'admin_dashboard.cards.districts.title', 
      icon: '🏘️', 
      description: 'admin_dashboard.cards.districts.description', 
      route: '/districts',
      color: 'linear-gradient(135deg, #7E57C2 0%, #9575CD 100%)'
    },
    { 
      title: 'admin_dashboard.cards.new_district.title', 
      icon: '🏡', 
      description: 'admin_dashboard.cards.new_district.description', 
      route: '/new-district',
      color: 'linear-gradient(135deg, #9575CD 0%, #B39DDB 100%)'
    }
  ];

  constructor(
    private router: Router,
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

  cardAction(card: any): void {
    if (card.route) {
      this.navigateTo(card.route);
    }
  }
}