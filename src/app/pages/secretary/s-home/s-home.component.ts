import { CommonModule, formatDate } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { Color, LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { AppointmentService } from '../../../services/appointment.service';
import { UserService } from '../../../services/user.service';
import { Observable, take, Subscription, fromEvent, interval } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { BookingWayService } from '../../../services/booking-way.service';
import { ToastrService } from 'ngx-toastr';
import { LoginResponse } from '../../../shared/models/login-response';
import { Doctor } from '../../../shared/models/doctor.model';
import { DoctorService } from '../../../services/doctor.service';

@Component({
  selector: 'app-s-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SHeaderComponent,
    NgxChartsModule,
    TranslocoModule,
  ],
  templateUrl: './s-home.component.html',
  styleUrls: ['./s-home.component.css'],
})
export class SHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainerRef') chartContainerRef!: ElementRef;

  // Chart Configuration
  mobileView: [number, number] = [350, 300];
  desktopView: [number, number] = [500, 400];
  colorScheme: Color = { name: 'appointments', selectable: true, group: ScaleType.Ordinal, domain: ['#3366CC', '#FFBB33', '#DC3912', '#00C851'] };

  // Chart Data
  pieChartData: any[] = [];
  legendTitle: string = '';
  showLegend = true;
  showLabels = true;
  isDoughnut: boolean = true;
  legendPosition: LegendPosition = LegendPosition.Below;

  // App State
  doctorId: number | null = null;
  secretaryDoctors: Doctor[] = [];
  todayDate: string = formatDate(new Date(), 'yyyy-MM-dd', 'en');
  hasAppointmentData: boolean = false;
  isMobile: boolean = false;
  isLoading: boolean = true;
  

  private langChangeSubscription!: Subscription;
  private resizeSubscription!: Subscription;
  private chartResizeObserver!: ResizeObserver;
  private pollingSubscription!: Subscription;
  private audio = new Audio();


  // Count properties
  upcomingCount = 0;
  cancelledCount = 0;
  processedCount = 0;
  arrivedCount = 0;
  inProgressCount = 0;
  nextInQueueCount = 0;

  // Grid & Action Cards
  gridColumns = 2;
  actionCards = [
    { title: 'header.appointments_sec', icon: '📅', route: '/my-appointment', color: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)' },
    { title: 'dashboard.phoneReserve', icon: '📞', action: 'navigateToPhoneReserve', color: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' },
    { title: 'dashboard.walkinReserve', icon: '🚶', action: 'navigateToWalkInReserve', color: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)' },
    { title: 'dashboard.serviceSettings', icon: '⚙️', route: '/service-settings', color: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)' },
    { title: 'dashboard.timeslotManagement', icon: '⏰', route: '/timeslot-management', color: 'linear-gradient(135deg, #607D8B 0%, #78909C 100%)' },
    { title: 'dashboard.patients', icon: '👥', route: '/patients', color: 'linear-gradient(135deg, #795548 0%, #9E9E9E 100%)' }
  ];

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    public translocoService: TranslocoService,
    private bookingWayService: BookingWayService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.audio.src = 'notification.mp3';
    this.audio.load();

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
  onResize() {
    this.gridColumns = window.innerWidth >= 768 ? 2 : 1;
  }

  cardAction(card: any): void {
    if (card.action === 'navigateToPhoneReserve') this.navigateToPhoneReserve();
    else if (card.action === 'navigateToWalkInReserve') this.navigateToWalkInReserve();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // ---------------------------
  // Secretary Doctor Handling
  // ---------------------------
loadDoctorsForSecretary(): void {
  const user = this.userService.getUser();
  if (!user || user.data.applicationRole_En !== 'Secretary') return;

  this.doctorService.getDoctorsFromSecretary().pipe(take(1)).subscribe({
    next: (doctor: Doctor) => {
      if (doctor && doctor.id) {
        this.secretaryDoctors = [doctor]; // wrap single doctor in array
        this.doctorId = doctor.id;        // <-- doctor ID globally
        this.userService.setDoctorIdForSecretary(this.doctorId);

        // Fetch specialization for this doctor
        this.doctorService.getSpecializations().pipe(take(1)).subscribe({
          next: (specialization: any) => {
            // specialization = { id: 50, name_Ar: "...", name_En: "..." }
            this.userService.setDoctorSpecialization(specialization);

            // After specialization, load appointments and polling
            this.loadAppointmentData();
            this.startPolling();
          },
          error: (err) => {
            console.error('Error fetching specialization:', err);
            // fallback: continue loading appointments
            this.loadAppointmentData();
            this.startPolling();
          }
        });
      } else {
        this.toastr.warning(this.translocoService.translate('errors.noDoctorAssigned'));
      }
    },
    error: (err) => {
      console.error('Error fetching doctor for secretary:', err);
      this.toastr.error(this.translocoService.translate('error.fetch_doctors_failed'), 'Error');
    }
  });
}




  // ---------------------------
  // User Details
  // ---------------------------
loadUserDetails(): void {
  const user: LoginResponse | null = this.userService.getUser();
  this.isLoading = true;

  if (!user) {
    console.warn('No user data found.');
    this.isLoading = false;
    return;
  }

  if (user.data.applicationRole_En === 'Secretary') {
    // Only call appointment/chart loading inside loadDoctorsForSecretary after ID is fetched
    this.loadDoctorsForSecretary();
  } else if (user.data.applicationRole_En === 'Doctor') {
    this.doctorId = user.data.id;
    this.loadAppointmentData();
    this.startPolling();
  }
}


  // ---------------------------
  // Appointment Data
  // ---------------------------
  loadAppointmentData(): void {
    if (!this.doctorId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.appointmentService.getDoctorDayAppointmentsCount(this.doctorId, this.todayDate).pipe(take(1)).subscribe({
      next: (response: any) => { this.processAppointmentData(response); this.isLoading = false; },
      error: (err) => { console.error(err); this.resetAppointmentData(); this.isLoading = false; }
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

  private resetAppointmentData(): void {
    this.hasAppointmentData = false;
    this.pieChartData = [];
    this.upcomingCount = 0;
    this.cancelledCount = 0;
    this.processedCount = 0;
  }

  // ---------------------------
  // Polling
  // ---------------------------
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



  // ---------------------------
  // Chart
  // ---------------------------
  private playNotificationSound(): void {
    try { this.audio.currentTime = 0; this.audio.play().catch(() => {}); } catch {}
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
    this.adjustChartSize();
    this.onResize();
  }

  adjustChartSizeInitial(): void {
    if (!this.chartContainerRef) return;
    const containerWidth = this.chartContainerRef.nativeElement.clientWidth;
    const containerHeight = this.isMobile ? 300 : 400;
    if (this.isMobile) this.mobileView = [Math.min(containerWidth, 300), containerHeight];
    else this.desktopView = [Math.min(containerWidth, 500), containerHeight];
  }

  adjustChartSize(): void {
    if (!this.chartContainerRef) return;
    const containerWidth = this.chartContainerRef.nativeElement.clientWidth;
    const containerHeight = this.isMobile ? 300 : 400;
    if (this.isMobile) this.mobileView = [Math.min(containerWidth, 300), containerHeight];
    else this.desktopView = [Math.min(containerWidth, 500), containerHeight];
  }

  observeChartContainerResize(): void {
    if (!this.chartContainerRef) return;
    this.chartResizeObserver = new ResizeObserver(() => this.adjustChartSize());
    this.chartResizeObserver.observe(this.chartContainerRef.nativeElement);
  }

  onSelect(event: any): void { console.log('Chart item selected:', event); }

  get currentView(): [number, number] { return this.isMobile ? this.mobileView : this.desktopView; }

  // ---------------------------
  // Navigation
  // ---------------------------
  navigateToPhoneReserve(): void {
    this.bookingWayService.getPhoneBookingWay().pipe(take(1)).subscribe({
      next: (res) => {
        if (res.Succeeded && res.data?.id != null) this.router.navigate(['/new-patient'], { queryParams: { bookingWayId: res.data.id, bookingWayName: res.data.name_En }, queryParamsHandling: 'merge' });
        else this.router.navigate(['/new-patient']);
      },
      error: () => this.router.navigate(['/new-patient'])
    });
  }

  navigateToWalkInReserve(): void {
    this.bookingWayService.getWalkInBookingWay().pipe(take(1)).subscribe({
      next: (res) => {
        if (res.Succeeded && res.data) this.router.navigate(['/walkin-reserve'], { queryParams: { bookingWayId: res.data.id, bookingWayName: res.data.name_En }, queryParamsHandling: 'merge' });
        else this.router.navigate(['/walkin-reserve']);
      },
      error: () => this.router.navigate(['/walkin-reserve'])
    });
  }

  handleCardClick(card: any): void {
    if (card.action) this.cardAction(card);
    else if (card.route) this.navigateTo(card.route);
  }
}
