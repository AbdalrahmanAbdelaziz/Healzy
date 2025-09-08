import { CommonModule, formatDate } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DHeaderComponent } from '../d-header/d-header.component';
import { Color, LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { AppointmentService } from '../../../services/appointment.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { take, Subscription, fromEvent, interval } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-d-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DHeaderComponent,
    NgxChartsModule,
    TranslocoModule
  ],
  templateUrl: './d-home.component.html',
  styleUrls: ['./d-home.component.css']
})
export class DHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainerRef') chartContainerRef!: ElementRef;

  // Chart Configuration
  mobileView: [number, number] = [300, 300];
  desktopView: [number, number] = [500, 400];
  colorScheme: Color = {
    name: 'appointments',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#3366CC', '#DC3912', '#00C851']
  };

  // Chart Data
  pieChartData: any[] = [];
  legendTitle: string = '';
  showLegend = true;
  showLabels = true;
  isDoughnut: boolean = true;
  legendPosition: LegendPosition = LegendPosition.Below;

  // App State
  doctorId: number | null = null;
  todayDate: string = formatDate(new Date(), 'yyyy-MM-dd', 'en');
  hasAppointmentData: boolean = false;
  isMobile: boolean = false;
  isLoading: boolean = true;
  private langChangeSubscription!: Subscription;
  private resizeSubscription!: Subscription;
  private chartResizeObserver!: ResizeObserver;
  
  // Polling properties
  private pollingSubscription!: Subscription;
  private audio = new Audio();
  
  // Count properties
  upcomingCount: number = 0;
  cancelledCount: number = 0;
  processedCount: number = 0;
  
  // Enhanced action cards
  gridColumns = 2;
  actionCards = [
    { 
      title: 'quick_actions.my_appointments', 
      icon: '📅', 
      route: '/d-list',
      color: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)'
    },
    { 
      title: 'dashboard.serviceSettings', 
      icon: '⚙️', 
      route: '/d-service-settings',
      color: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)'
    },
    { 
      title: 'dashboard.timeslotManagement', 
      icon: '⏰', 
      route: '/d-timeslot-management',
      color: 'linear-gradient(135deg, #607D8B 0%, #78909C 100%)'
    },
    { 
      title: 'dashboard.patients', 
      icon: '👥', 
      route: '/d-patients',
      color: 'linear-gradient(135deg, #795548 0%, #9E9E9E 100%)'
    }
  ];

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    public translocoService: TranslocoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    
    
    this.checkScreenSize();
    this.loadUserDetails();

    this.langChangeSubscription = this.translocoService.langChanges$.subscribe(() => {
      if (this.doctorId) {
        this.loadAppointmentData();
      }
    });

    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.checkScreenSize();
      });
  }

  ngAfterViewInit(): void {
    this.observeChartContainerResize();
    this.adjustChartSizeInitial();
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
    }
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onResize() {
    const screenWidth = window.innerWidth;
    
    if (screenWidth >= 768) {
      this.gridColumns = 2;
    } else {
      this.gridColumns = 1;
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Rest of the existing methods remain the same
  startPolling(): void {
    if (!this.doctorId) return;
    
    this.pollingSubscription = interval(5000)
      .pipe(
        switchMap(() => this.appointmentService.getDoctorDayAppointmentsCount(this.doctorId!, this.todayDate))
      )
      .subscribe({
        next: (response: any) => {
          this.checkForAppointmentChanges(response.data);
          this.processAppointmentData(response);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error polling appointment data:', err);
        },
      });
  }

  private checkForAppointmentChanges(data: any): void {
    const previousUpcoming = this.upcomingCount;
    const previousCancelled = this.cancelledCount;
    const previousProcessed = this.processedCount;
    
    const newUpcoming = data.upcominAppointmentsCount || 0;
    const newCancelled = data.cancelledAppointmentsCount || 0;
    const newProcessed = data.completedAppointmentsCount || 0;
    
    if (Math.abs(newUpcoming - previousUpcoming) > 0 || 
        Math.abs(newCancelled - previousCancelled) > 0 ||
        Math.abs(newProcessed - previousProcessed) > 0) {
      this.playNotificationSound();
    }
  }

  private playNotificationSound(): void {
    try {
      this.audio.currentTime = 0;
      this.audio.play().catch(e => console.warn('Audio play failed:', e));
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
    this.adjustChartSize();
    this.onResize();
  }

  adjustChartSizeInitial(): void {
    if (this.chartContainerRef && this.chartContainerRef.nativeElement) {
      const containerWidth = this.chartContainerRef.nativeElement.clientWidth;
      const containerHeight = this.isMobile ? 300 : 400;

      if (this.isMobile) {
        this.mobileView = [Math.min(containerWidth, 300), containerHeight];
      } else {
        this.desktopView = [Math.min(containerWidth, 500), containerHeight];
      }
    }
  }

  adjustChartSize(): void {
    if (this.chartContainerRef && this.chartContainerRef.nativeElement) {
      const containerWidth = this.chartContainerRef.nativeElement.clientWidth;
      const containerHeight = this.isMobile ? 300 : 400;

      if (this.isMobile) {
        this.mobileView = [Math.min(containerWidth, 300), containerHeight];
      } else {
        this.desktopView = [Math.min(containerWidth, 500), containerHeight];
      }
    }
  }

  observeChartContainerResize(): void {
    if (this.chartContainerRef && this.chartContainerRef.nativeElement) {
      this.chartResizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.contentRect) {
            this.adjustChartSize();
          }
        }
      });
      this.chartResizeObserver.observe(this.chartContainerRef.nativeElement);
    }
  }

  loadUserDetails(): void {
    const user: LoginResponse | null = this.userService.getUser();
    this.isLoading = true;

    if (!user) {
      console.warn('No user data found.');
      this.isLoading = false;
      return;
    }

    if (user.data.applicationRole_En === 'Doctor') {
      this.doctorId = user.data.id;
    } else {
      console.warn('User is not a Doctor. Doctor ID not set.');
      this.isLoading = false;
      return;
    }

    if (!this.doctorId) {
      console.warn('No doctor ID found.');
      this.isLoading = false;
      return;
    }

    this.loadAppointmentData();
    this.startPolling();
  }

  loadAppointmentData(): void {
    if (!this.doctorId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    this.appointmentService
      .getDoctorDayAppointmentsCount(this.doctorId, this.todayDate)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          this.processAppointmentData(response);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching appointment data:', err);
          this.handleDataError();
          this.isLoading = false;
        },
      });
  }

  private processAppointmentData(response: any): void {
    const data = response.data;

    this.upcomingCount = data.upcominAppointmentsCount || 0;
    this.cancelledCount = data.cancelledAppointmentsCount || 0;
    this.processedCount = data.completedAppointmentsCount || 0;

    const hasData = this.upcomingCount > 0 ||
                   this.cancelledCount > 0 ||
                   this.processedCount > 0;

    this.hasAppointmentData = hasData;

    if (hasData) {
      this.pieChartData = [
        {
          name: this.translocoService.translate('dashboard.appointmentStatuses.upcoming'),
          value: this.upcomingCount,
          extra: { status: 'upcoming' }
        },
        {
          name: this.translocoService.translate('dashboard.appointmentStatuses.cancelled'),
          value: this.cancelledCount,
          extra: { status: 'cancelled' }
        },
        {
          name: this.translocoService.translate('dashboard.appointmentStatuses.processed'),
          value: this.processedCount,
          extra: { status: 'processed' }
        },
      ];
    } else {
      this.pieChartData = [];
    }
  }

  private handleDataError(): void {
    this.hasAppointmentData = false;
    this.pieChartData = [];
    this.upcomingCount = 0;
    this.cancelledCount = 0;
    this.processedCount = 0;
  }

  onSelect(event: any): void {
    console.log('Chart item selected:', event);
  }

  get currentView(): [number, number] {
    return this.isMobile ? this.mobileView : this.desktopView;
  }
}