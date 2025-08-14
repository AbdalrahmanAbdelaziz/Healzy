import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PHeaderComponent } from '../p-header/p-header.component';
import { UserService } from '../../../services/user.service';
import { LoginResponse } from '../../../shared/models/login-response';
import { Specialization, SpecializationService } from '../../../services/specialization.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthenticationService } from '../../../services/authentication.service';
import { RoutesService } from '../../../services/routes.service';
import { ToastrService } from 'ngx-toastr';
import { LookupsService } from '../../../services/lookups.service';
import { Lookup } from '../../../shared/models/lookup.model';
import { APIResponse } from '../../../shared/models/api-response.dto';
import { Doctor } from '../../../shared/models/doctor.model';
import { DoctorService } from '../../../services/doctor.service';
import { SideNavbarComponent } from '../side-navbar/side-navbar.component';
import { SpecializationResponse } from '../../../shared/models/specialization.model';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-choose-appointment',
  imports: [CommonModule, RouterModule, PHeaderComponent, ReactiveFormsModule, FormsModule, SideNavbarComponent, TranslocoModule, FooterComponent ],
  templateUrl: './choose-appointment.component.html',
  styleUrl: './choose-appointment.component.css'
})
export class ChooseAppointmentComponent implements OnInit{
  isCollapsed: boolean = false;
  specializations: Specialization[] = [];
  filteredSpecializations: Specialization[] = [];
  searchTerm: string = '';
  patient!: LoginResponse;
  specializationNames: { [id: number]: string } = {};

  locationForm!: FormGroup;
  private fb = inject(FormBuilder);
  private authService = inject(AuthenticationService);
  private routesService = inject(RoutesService);
  private toastrService = inject(ToastrService);
  private lookupService = inject(LookupsService);

  doctors: Doctor[] = [];
  countries: Lookup[] = [];
  governorates: Lookup[] = [];
  districts: Lookup[] = [];

  // Storage key for form persistence
  private readonly FORM_STORAGE_KEY = 'appointmentFormData';

  constructor(
    private userService: UserService, 
    private router: Router, 
    private activatedRoute: ActivatedRoute, 
    private specializationService: SpecializationService, 
    private doctorService: DoctorService, 
    public translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.loadSavedFormData();

    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }

      this.activatedRoute.params.subscribe((params: { searchTerm?: string }) => {
        if (params['searchTerm']) { 
          this.searchTerm = params['searchTerm']; 
        }
      });
    });

    this.specializationService.getAllSpecializations().subscribe({
      next: (response: SpecializationResponse) => {
        if (response.succeeded) {
          this.specializationNames = {};
          response.data.forEach(spec => {
            this.specializationNames[spec.id] = spec.name_En;
          });
        }
      },
      error: (error) => console.error('Error loading specialization names:', error)
    });

    this.getSpecializations();
  }

  private initForm(): void {
    this.locationForm = this.fb.group({
      countryId: [null, [Validators.required]],
      governorateId: [null, [Validators.required]],
      districtId: [null, [Validators.required]],
      specializationId: [null, [Validators.required]]
    });

    // Save form data when values change
    this.locationForm.valueChanges.subscribe(() => {
      this.saveFormData();
    });
  }

  private loadSavedFormData(): void {
    const savedData = localStorage.getItem(this.FORM_STORAGE_KEY);
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);
        
        // Only set values if they exist in the saved data
        if (formData.countryId) {
          this.locationForm.patchValue({ countryId: formData.countryId });
          this.updateGovernorates(formData.countryId);
        }
        
        if (formData.governorateId) {
          // Need to wait for governorates to load before setting this value
          setTimeout(() => {
            this.locationForm.patchValue({ governorateId: formData.governorateId });
            this.updateDistricts(formData.governorateId);
          }, 300);
        }
        
        if (formData.districtId) {
          // Need to wait for districts to load before setting this value
          setTimeout(() => {
            this.locationForm.patchValue({ districtId: formData.districtId });
          }, 600);
        }
        
        if (formData.specializationId) {
          this.locationForm.patchValue({ specializationId: formData.specializationId });
        }
      } catch (e) {
        console.error('Failed to parse saved form data', e);
        localStorage.removeItem(this.FORM_STORAGE_KEY);
      }
    }
  }

  private saveFormData(): void {
    if (this.locationForm.valid) {
      localStorage.setItem(this.FORM_STORAGE_KEY, JSON.stringify(this.locationForm.value));
    }
  }

  private clearSavedFormData(): void {
    localStorage.removeItem(this.FORM_STORAGE_KEY);
  }

  private loadLookups(): void {
    this.lookupService.loadCountries().subscribe(
      (res: APIResponse<Lookup[]>) => {
        this.countries = res.data;
        // After countries load, check if we need to load governorates for saved country
        const savedData = localStorage.getItem(this.FORM_STORAGE_KEY);
        if (savedData) {
          const formData = JSON.parse(savedData);
          if (formData.countryId) {
            this.updateGovernorates(formData.countryId);
          }
        }
      },
      () => this.toastrService.error("Failed to load countries", "Error")
    );
  
    this.specializationService.getAllSpecializations().subscribe({
      next: (response: SpecializationResponse) => {
        if (response.succeeded) {
          this.specializations = response.data;
        } else {
          this.toastrService.error("Failed to load specializations", "Error");
        }
      },
      error: () => this.toastrService.error("Failed to load specializations", "Error")
    });
  }

  updateGovernorates(countryId: string) {
    this.lookupService.loadGovernoratesOfCountry(Number.parseInt(countryId)).subscribe(
      (res: APIResponse<Lookup[]>) => {
        this.governorates = res.data;
        // After governorates load, check if we need to load districts for saved governorate
        const savedData = localStorage.getItem(this.FORM_STORAGE_KEY);
        if (savedData) {
          const formData = JSON.parse(savedData);
          if (formData.governorateId) {
            this.updateDistricts(formData.governorateId);
          }
        }
      }
    );
  }
  
  updateDistricts(governorateId: string) {
    this.lookupService.loadDistrictsOfGovernorate(Number.parseInt(governorateId)).subscribe(
      (res: APIResponse<Lookup[]>) => {
        this.districts = res.data;
      }
    );
  }

  filterDoctors(): void {
    if (this.locationForm.valid) {
      const filters = this.locationForm.value;
      this.router.navigate(['/filtered-doctors'], { queryParams: filters });
    } else {
      this.toastrService.warning("Please fill in all required fields.", "Error");
    }
  }
  
  get formControls() {
    return this.locationForm.controls;
  }

  getSpecializationIcon(specialization: string): string {
    const icons: { [key: string]: string } = {
      Dentist: 'fas fa-tooth',
      GeneralPractitioner: 'fas fa-user-md',
      // ... rest of your icons
    };
    return icons[specialization] || 'fas fa-user-md';
  }

  getSpecializations(): void {
    this.specializationService.getAllSpecializations().subscribe({
      next: (response: SpecializationResponse) => {
        if (response.succeeded) {
          this.specializations = response.data;
          this.filteredSpecializations = response.data;
        } else {
          console.error('Failed to fetch specializations:', response.message);
        }
      },
      error: (error) => {
        console.error('Error fetching specializations:', error);
      }
    });
  }

  search(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filteredSpecializations = this.specializations.filter(spec =>
      spec.name_En.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(link: string) {
    this.router.navigate([link]);
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}