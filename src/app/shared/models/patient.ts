import { UserRegister } from "./UserRegister";

export interface Patient extends UserRegister {
  id?: number; // Add the id property
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  userInsuranceProviderId?: string;
}