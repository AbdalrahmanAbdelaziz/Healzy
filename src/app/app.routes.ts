import { Routes } from '@angular/router';
import { LandComponent } from './pages/land/land.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { InfoComponent } from './pages/info/info.component';
import { DHomeComponent } from './pages/doctor/d-home/d-home.component';
import { SHomeComponent } from './pages/secretary/s-home/s-home.component';
import { PHomeComponent } from './pages/patient/p-home/p-home.component';
import { ChooseAppointmentComponent } from './pages/patient/choose-appointment/choose-appointment.component';
import { ViewDoctorProfileComponent } from './pages/patient/view-doctor-profile/view-doctor-profile.component';
import { ConfirmBookingComponent } from './pages/patient/confirm-booking/confirm-booking.component';
import { DoctorAppointmentsComponent } from './pages/patient/doctor-appointments/doctor-appointments.component';
import { DayAppointmentsComponent } from './pages/patient/day-appointments/day-appointments.component';
import { FilteredDoctorsComponent } from './pages/patient/filtered-doctors/filtered-doctors.component';
import { PhoneReserveComponent } from './pages/secretary/phone-reserve/phone-reserve.component';
import { NewPatientComponent } from './pages/secretary/new-patient/new-patient.component';
import { CompleteDataComponent } from './pages/patient/complete-data/complete-data.component';
import { NewPatientAddPhoneComponent } from './pages/secretary/new-patient-add-phone/new-patient-add-phone.component';
import { MyAppointmentComponent } from './pages/secretary/my-appointment/my-appointment.component';
import { WalkInComponent } from './pages/secretary/walk-in/walk-in.component';
import { TimeSlotMangeComponent } from './pages/secretary/time-slot-mange/time-slot-mange.component';
import { ServiceSettingComponent } from './pages/secretary/service-setting/service-setting.component';
import { PatientsComponent } from './pages/secretary/patients/patients.component';
import { RevenueComponent } from './pages/secretary/revenue/revenue.component';
import { DoctorAppointmentsReschedualComponent } from './pages/doctor-appointments-reschedual/doctor-appointments-reschedual.component';
import { DayAppointmentsReschedualComponent } from './pages/day-appointments-reschedual/day-appointments-reschedual.component';
import { ConfirmReschedualComponent } from './pages/confirm-reschedual/confirm-reschedual.component';
import { SecDocAppComponent } from './pages/secretary/sec-doc-app/sec-doc-app.component';
import { SecDayAppComponent } from './pages/secretary/sec-day-app/sec-day-app.component';
import { SecConfirmAppComponent } from './pages/secretary/sec-confirm-app/sec-confirm-app.component';
import { SProfileComponent } from './pages/secretary/s-profile/s-profile.component';
import { DProfileComponent } from './pages/doctor/d-profile/d-profile.component';
import { DRevenueComponent } from './pages/doctor/d-revenue/d-revenue.component';
import { DMyApointmentsComponent } from './pages/doctor/d-my-apointments/d-my-apointments.component';
import { DTimeslotManagementComponent } from './pages/doctor/d-timeslot-management/d-timeslot-management.component';
import { DServiceSettingsComponent } from './pages/doctor/d-service-settings/d-service-settings.component';
import { DDailyReportComponent } from './pages/doctor/d-daily-report/d-daily-report.component';
import { SecDocAppResComponent } from './pages/secretary/sec-doc-app-res/sec-doc-app-res.component';
import { SecDocDayResComponent } from './pages/secretary/sec-doc-day-res/sec-doc-day-res.component';
import { DPatientsComponent } from './pages/doctor/d-patients/d-patients.component';
import { DViewPpComponent } from './pages/doctor/d-view-pp/d-view-pp.component';
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { AdminHomeComponent } from './pages/admin/admin-home/admin-home.component';
import { NewDoctorComponent } from './pages/admin/new-doctor/new-doctor.component';
import { NewSecretaryComponent } from './pages/admin/new-secretary/new-secretary.component';
import { ClinicsComponent } from './pages/admin/clinics/clinics.component';
import { CreateClinicComponent } from './pages/admin/create-clinic/create-clinic.component';
import { AppointmentsListComponent } from './pages/doctor/appointments-list/appointments-list.component';
import { SpecializationsComponent } from './pages/admin/specializations/specializations.component';
import { NewSpecializationComponent } from './pages/admin/new-specialization/new-specialization.component';
import { ServicesComponent } from './pages/admin/services/services.component';
import { NewServiceComponent } from './pages/admin/new-service/new-service.component';
import { UsersComponent } from './pages/admin/users/users.component';
import { EachDoctorComponent } from './pages/admin/each-doctor/each-doctor.component';
import { AuthGuard } from './shared/AuthGuard/auth.guard';
import { FooterComponent } from './pages/footer/footer.component';
import { DContactUsPageComponent } from './pages/doctor/d-contact-us-page/d-contact-us-page.component';
import { PContactUsPageComponent } from './pages/p-contact-us-page/p-contact-us-page.component';
import { SecDocAppWalkComponent } from './pages/secretary/sec-doc-app-walk/sec-doc-app-walk.component';
import { SecDayAppWalkComponent } from './pages/secretary/sec-day-app-walk/sec-day-app-walk.component';
import { SecConfirmAppWalkComponent } from './pages/secretary/sec-confirm-app-walk/sec-confirm-app-walk.component';
import { DPatientProfileComponent } from './pages/doctor/d-patient-profile/d-patient-profile.component';
import { AllUsersComponent } from './pages/admin/all-users/all-users.component';
import { NewPatientAddWalkinComponent } from './pages/secretary/new-patient-add-walkin/new-patient-add-walkin.component';
import { CountriesComponent } from './pages/admin/countries/countries.component';
import { NewCountryComponent } from './pages/admin/new-country/new-country.component';
import { GovernoratesComponent } from './pages/admin/governorates/governorates.component';
import { NewGovernorateComponent } from './pages/admin/new-governorate/new-governorate.component';
import { DistrictsComponent } from './pages/admin/districts/districts.component';
import { NewDistrictComponent } from './pages/admin/new-district/new-district.component';






export const routes: Routes = [
  
  { path: '', redirectTo: '/land', pathMatch: 'full' },
  { path: 'land', component: LandComponent },
  { path: 'info', component: InfoComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

    { path: 'doctor-home', component: DHomeComponent, canActivate:[AuthGuard]},
    { path: 'secretary-home', component:SHomeComponent, canActivate:[AuthGuard]},
    { path: 'patient-home', component: PHomeComponent, canActivate:[AuthGuard]},
    { path: 'choose-appointment', component: ChooseAppointmentComponent, canActivate:[AuthGuard]},
    { path: 'view-doctor-profile/:id/:specializationId', component: ViewDoctorProfileComponent, canActivate:[AuthGuard] },
    { path: 'doctor-appointments/:docId/:specializationId', component: DoctorAppointmentsComponent,canActivate:[AuthGuard] },
    {path: 'appointments/:doctorId/:specializationId/:date', component: DayAppointmentsComponent, canActivate:[AuthGuard]},
    { path: 'confirm-booking', component: ConfirmBookingComponent, canActivate:[AuthGuard]},
    { path: 'filtered-doctors', component: FilteredDoctorsComponent, canActivate:[AuthGuard]},
    { path: 'phone-reserve', component: PhoneReserveComponent,canActivate:[AuthGuard]},
    { path: 'new-patient', component: NewPatientComponent, canActivate:[AuthGuard]},
    { path: 'add-patient-phone', component: NewPatientAddPhoneComponent, canActivate:[AuthGuard]},
    { path: 'add-patient-walk', component: NewPatientAddWalkinComponent, canActivate:[AuthGuard]},
    { path: 'doctor-appointments/:docId/:specializationId/:patientId', component: DoctorAppointmentsComponent, canActivate:[AuthGuard] },
    { path: 'complete-data', component: CompleteDataComponent, canActivate:[AuthGuard]},
    { path: 'my-appointment', component: MyAppointmentComponent, canActivate:[AuthGuard]},
    { path: 'walkin-reserve', component: WalkInComponent, canActivate:[AuthGuard]},
    { path: 'timeslot-management', component: TimeSlotMangeComponent, canActivate:[AuthGuard]},
    { path: 'service-settings', component: ServiceSettingComponent, canActivate:[AuthGuard]},
    { path: 'patients', component: PatientsComponent , canActivate:[AuthGuard]},
    { path: 'revenues', component: RevenueComponent, canActivate:[AuthGuard]},
    { path: 'doctor-appointments-reschedual/:docId/:specializationId/:patientId?', component: DoctorAppointmentsReschedualComponent ,canActivate:[AuthGuard]},
    { path: 'appointments-reschedual/:doctorId/:specializationId/:date', component: DayAppointmentsReschedualComponent, canActivate:[AuthGuard]},
    { path: 'confirm-reschedual', component: ConfirmReschedualComponent, canActivate:[AuthGuard]},

    { path: 'sec-doctor-appointments/:docId/:patientId', component: SecDocAppComponent, canActivate:[AuthGuard] },
    { path: 'sec-doctor-appointments', component: SecDocAppComponent,canActivate:[AuthGuard] },
    { path: 'sec-doctor-appointments/:docId/:specializationId', component: SecDocAppComponent , canActivate:[AuthGuard]},
    { path: 'sec-appointments/:doctorId/:date', component: SecDayAppComponent, canActivate:[AuthGuard]},    
    { path: 'sec-confirm-booking', component: SecConfirmAppComponent, canActivate:[AuthGuard]},

    { path: 'sec-doctor-appointments-walk/:docId/:patientId', component: SecDocAppWalkComponent, canActivate:[AuthGuard] },
    { path: 'sec-doctor-appointments-walk', component: SecDocAppWalkComponent,canActivate:[AuthGuard] },
    { path: 'sec-doctor-appointments-walk/:docId/:specializationId', component: SecDocAppWalkComponent , canActivate:[AuthGuard]},
    { path: 'sec-appointments-walk/:doctorId/:date', component: SecDayAppWalkComponent, canActivate:[AuthGuard]},    
    { path: 'sec-confirm-booking-walk', component: SecConfirmAppWalkComponent, canActivate:[AuthGuard]},

    {path: 's-profile', component: SProfileComponent, canActivate:[AuthGuard]},
    { path: 'd-profile', component: DProfileComponent, canActivate:[AuthGuard]},
    { path: 'd-revenues', component: DRevenueComponent, canActivate:[AuthGuard]},
    { path: 'd-my-apointments', component: DMyApointmentsComponent, canActivate:[AuthGuard]},
    { path: 'd-timeslot-management', component: DTimeslotManagementComponent, canActivate:[AuthGuard]},
    { path: 'd-service-settings', component: DServiceSettingsComponent, canActivate:[AuthGuard]},
    { path: 'd-daily-report', component: DDailyReportComponent, canActivate:[AuthGuard]},
    { path: 'd-patients', component: DPatientsComponent, canActivate:[AuthGuard]},
    { path: 'd-list', component: AppointmentsListComponent, canActivate:[AuthGuard]},


    { path: 'doctor-appointments', component: DoctorAppointmentsComponent ,canActivate:[AuthGuard]},

    { path: 'appointments/:docId/:selectedDate', component: DayAppointmentsComponent , canActivate:[AuthGuard]},

    { path: 'sec-doctor-appointments-reschedual/:docId/:specializationId/:patientId?', component: SecDocAppResComponent , canActivate:[AuthGuard]},

    { path: 'sec-appointments-reschedual/:doctorId/:specializationId/:date', component: SecDocDayResComponent, canActivate:[AuthGuard]},

    { path: 'd-view-pp',component: DViewPpComponent, canActivate:[AuthGuard]},


  { path: 'forget-password', component: ForgetPasswordComponent},
  { path: 'reset-password', component: ResetPasswordComponent},

  { path: 'admin-home', component: AdminHomeComponent, canActivate:[AuthGuard]},
  { path: 'new-doctor', component: NewDoctorComponent , canActivate:[AuthGuard]},
  { path: 'new-secretary', component: NewSecretaryComponent , canActivate:[AuthGuard]},
  { path: 'clinics', component: ClinicsComponent, canActivate:[AuthGuard]},
  { path: 'create_clinic' , component: CreateClinicComponent, canActivate:[AuthGuard]},
  { path: 'specializations', component: SpecializationsComponent, canActivate:[AuthGuard]},
  { path: 'new-specialization', component: NewSpecializationComponent, canActivate:[AuthGuard]},
  { path: 'services', component: ServicesComponent, canActivate:[AuthGuard]},
  { path: 'new-service', component: NewServiceComponent, canActivate:[AuthGuard]},
  { path: 'users', component: UsersComponent, canActivate:[AuthGuard]},
  {path: 'each-doctor', component: EachDoctorComponent, canActivate:[AuthGuard]},
  {path: 'contact-us', component: FooterComponent, canActivate:[AuthGuard]},
  {path: 'd-contact-us', component: DContactUsPageComponent, canActivate:[AuthGuard]},
  {path: 'p-contact-us', component: PContactUsPageComponent, canActivate:[AuthGuard]},
  { path: 'patient/:id', component: DPatientProfileComponent, canActivate:[AuthGuard]},
  { path: 'all-users', component: AllUsersComponent, canActivate:[AuthGuard]},


  { path: 'countries', component: CountriesComponent,canActivate:[AuthGuard] },
  { path: 'new-country', component: NewCountryComponent ,canActivate:[AuthGuard]},
  { path: 'governorates', component: GovernoratesComponent ,canActivate:[AuthGuard]},
  { path: 'new-governorate', component: NewGovernorateComponent ,canActivate:[AuthGuard]},
  { path: 'districts', component: DistrictsComponent ,canActivate:[AuthGuard]},
  { path: 'new-district', component: NewDistrictComponent ,canActivate:[AuthGuard]},
  






    
];
