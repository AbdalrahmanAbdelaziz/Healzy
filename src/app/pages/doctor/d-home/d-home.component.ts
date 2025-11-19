import { CommonModule, formatDate } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DHeaderComponent } from '../d-header/d-header.component';
import { Color, LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { AppointmentService } from '../../../services/appointment.service';
import { DoctorService } from '../../../services/doctor.service';
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

  mobileView: [number, number] = [300, 300];
  desktopView: [number, number] = [500, 400];
  colorScheme: Color = { name: 'appointments', selectable: true, group: ScaleType.Ordinal, domain: ['#3366CC', '#FFBB33', '#DC3912', '#00C851'] };
  pieChartData: any[] = [];
  legendTitle: string = '';
  showLegend = true;
  showLabels = true;
  isDoughnut: boolean = true;
  legendPosition: LegendPosition = LegendPosition.Below;

  doctorId: number | null = null;
  todayDate: string = formatDate(new Date(), 'yyyy-MM-dd', 'en');
  hasAppointmentData: boolean = false;
  isMobile: boolean = false;
  isLoading: boolean = true;

  upcomingCount = 0;
  cancelledCount = 0;
  processedCount = 0;
  arrivedCount = 0;
  inProgressCount = 0;
  nextInQueueCount = 0;

  gridColumns = 2;
  actionCards = [
    { title: 'quick_actions.my_appointments', icon: '📅', route: '/d-list', color: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)' },
    { title: 'dashboard.serviceSettings', icon: '⚙️', route: '/d-service-settings', color: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)' },
    { title: 'dashboard.timeslotManagement', icon: '⏰', route: '/d-timeslot-management', color: 'linear-gradient(135deg, #607D8B 0%, #78909C 100%)' },
    { title: 'dashboard.patients', icon: '👥', route: '/d-patients', color: 'linear-gradient(135deg, #795548 0%, #9E9E9E 100%)' }
  ];

  private langChangeSubscription!: Subscription;
  private resizeSubscription!: Subscription;
  private chartResizeObserver!: ResizeObserver;
  private pollingSubscription!: Subscription;
  private audio = new Audio();

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private doctorService: DoctorService,
    public translocoService: TranslocoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadUserDetails();

    this.langChangeSubscription = this.translocoService.langChanges$.subscribe(() => {
      if (this.doctorId) this.loadAppointmentData();
    });

    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => this.checkScreenSize());
  }

  ngAfterViewInit(): void {
    this.observeChartContainerResize();
    this.adjustChartSizeInitial();
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
    this.resizeSubscription?.unsubscribe();
    this.chartResizeObserver?.disconnect();
    this.pollingSubscription?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize() { this.gridColumns = window.innerWidth >= 768 ? 2 : 1; }

  navigateTo(route: string) { this.router.navigate([route]); }

startPolling(): void {
  if (!this.doctorId) return;

  this.pollingSubscription = interval(5000)
    .pipe(
      switchMap(() => this.appointmentService.getDoctorDayAppointmentsCount(this.doctorId!, this.todayDate))
    )
    .subscribe({
      next: (res: any) => {
        this.checkForAppointmentChanges(res.data);
        this.processAppointmentData(res);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Polling error:', err)
    });
}

private checkForAppointmentChanges(data: any): void {
  if (
    Math.abs((data.upcominAppointmentsCount || 0) - this.upcomingCount) > 0 ||
    Math.abs((data.cancelledAppointmentsCount || 0) - this.cancelledCount) > 0 ||
    Math.abs((data.completedAppointmentsCount || 0) - this.processedCount) > 0 ||
    Math.abs((data.arrivedCount || 0) - this.arrivedCount) > 0 ||
    Math.abs((data.inProgressCount || 0) - this.inProgressCount) > 0 ||
    Math.abs((data.nextInQueueCount || 0) - this.nextInQueueCount) > 0
  ) {
    this.playNotificationSound();
  }
}


  private playNotificationSound(): void {
    try { this.audio.currentTime = 0; this.audio.play().catch(() => {}); } catch {}
  }

  checkScreenSize(): void { this.isMobile = window.innerWidth <= 768; this.adjustChartSize(); this.onResize(); }
  adjustChartSizeInitial(): void { this.adjustChartSize(); }
  adjustChartSize(): void {
    if (!this.chartContainerRef) return;
    const w = this.chartContainerRef.nativeElement.clientWidth;
    const h = this.isMobile ? 300 : 400;
    this.mobileView = [Math.min(w, 300), h];
    this.desktopView = [Math.min(w, 500), h];
  }

  observeChartContainerResize(): void {
    if (!this.chartContainerRef) return;
    this.chartResizeObserver = new ResizeObserver(() => this.adjustChartSize());
    this.chartResizeObserver.observe(this.chartContainerRef.nativeElement);
  }

  loadUserDetails(): void {
    const user: LoginResponse | null = this.userService.getUser();
    if (!user || user.data.applicationRole_En !== 'Doctor') { this.isLoading = false; return; }
    this.doctorId = user.data.id;

    this.doctorService.getSpecializations().pipe(take(1)).subscribe({
      next: (specialization) => {
        this.userService.setDoctorSpecialization(specialization);
        this.loadAppointmentData();
        this.startPolling();
      },
      error: (err) => {
        console.error('Error fetching specialization:', err);
        this.loadAppointmentData();
        this.startPolling();
      }
    });
  }

  loadAppointmentData(): void {
    if (!this.doctorId) { this.isLoading = false; return; }
    this.isLoading = true;
    this.appointmentService.getDoctorDayAppointmentsCount(this.doctorId, this.todayDate).pipe(take(1)).subscribe({
      next: (res: any) => { this.processAppointmentData(res); this.isLoading = false; },
      error: () => { this.hasAppointmentData = false; this.isLoading = false; }
    });
  }

  private processAppointmentData(res: any) {
    const data = res.data;

    this.upcomingCount = data.upcominAppointmentsCount || 0;
    this.cancelledCount = data.cancelledAppointmentsCount || 0;
    this.processedCount = data.completedAppointmentsCount || 0;
    this.arrivedCount = data.arrivedCount || 0;
    this.inProgressCount = data.inProgressCount || 0;
    this.nextInQueueCount = data.nextInQueueCount || 0;

    this.hasAppointmentData = this.upcomingCount > 0 || this.cancelledCount > 0 || this.processedCount > 0 || this.arrivedCount > 0;

    this.pieChartData = this.hasAppointmentData ? [
      { name: this.translocoService.translate('dashboard.appointmentStatuses.upcoming'), value: this.upcomingCount },
      { name: this.translocoService.translate('dashboard.appointmentStatuses.arrived'), value: this.arrivedCount },
      { name: this.translocoService.translate('dashboard.appointmentStatuses.cancelled'), value: this.cancelledCount },
      { name: this.translocoService.translate('dashboard.appointmentStatuses.processed'), value: this.processedCount }
    ] : [];
  }

  onSelect(event: any) { console.log('Chart selected:', event); }
  get currentView(): [number, number] { return this.isMobile ? this.mobileView : this.desktopView; }
}
