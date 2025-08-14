import { CommonModule, formatDate } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { Color, LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { AppointmentService } from '../../../services/appointment.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { Observable, take, Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';
import { BookingWayService } from '../../../services/booking-way.service';

@Component({
  selector: 'app-s-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SHeaderComponent,
    NgxChartsModule,
    TranslocoModule,
    FooterComponent
  ],
  templateUrl: './s-home.component.html',
  styleUrls: ['./s-home.component.css'],
})
export class SHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainerRef') chartContainerRef!: ElementRef;

  // Chart Configuration
  mobileView: [number, number] = [350, 300];
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

  // Count properties
  upcomingCount: number = 0;
  cancelledCount: number = 0;
  processedCount: number = 0;

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    public translocoService: TranslocoService,
    private bookingWayService: BookingWayService,
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
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
    // Always use doughnut for better label visibility
    this.isDoughnut = true;
    this.adjustChartSize();
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

    if (user.data.applicationRole_En === 'Secretary') {
      this.doctorId = user.data.doctorId || Number(localStorage.getItem('doctorId'));
    } else if (user.data.applicationRole_En === 'Doctor') {
      this.doctorId = user.data.id;
    }

    if (!this.doctorId) {
      console.warn('No doctor ID found.');
      this.isLoading = false;
      return;
    }

    this.loadAppointmentData();
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

  navigateToPhoneReserve(): void {
    this.bookingWayService.getPhoneBookingWay().pipe(take(1)).subscribe({
      next: (response) => {
        if (response.Succeeded && response.data && response.data.id != null && response.data.name_En != null) {
          this.router.navigate(['/new-patient'], {
            queryParams: {
              bookingWayId: response.data.id,
              bookingWayName: response.data.name_En
            },
            queryParamsHandling: 'merge'
          });
        } else {
          this.router.navigate(['/new-patient']);
        }
      },
      error: (err) => {
        console.error('Error getting phone booking way:', err);
        this.router.navigate(['/new-patient']);
      }
    });
  }

  navigateToWalkInReserve(): void {
    this.bookingWayService.getWalkInBookingWay().pipe(take(1)).subscribe({
      next: (response) => {
        if (response.Succeeded && response.data) {
          this.router.navigate(['/walkin-reserve'], {
            queryParams: {
              bookingWayId: response.data.id,
              bookingWayName: response.data.name_En
            },
            queryParamsHandling: 'merge'
          });
        } else {
          console.error('Failed to get walk-in booking way. Navigating without params.');
          this.router.navigate(['/walkin-reserve']);
        }
      },
      error: (err) => {
        console.error('Error getting walk-in booking way:', err);
        this.router.navigate(['/walkin-reserve']);
      }
    });
  }
}