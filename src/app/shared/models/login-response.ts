import { UserRolesEnum } from "../enum/user-role.enum";

export interface LoginResponse {
  data: {
    token: string;
    id: number;
    username: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    profilePicture: string | null;
    lastLogin: string;
    gender_En: string;
    gender_Ar: string;
    country_En: string;
    country_Ar: string;
    governorate_En: string;
    governorate_Ar: string;
    district_En: string;
    district_Ar: string;
    accountStatus_En: string; 
    accountStatus_Ar: string;
    applicationRole_En: string;
    applicationRole_Ar: string;
    applicationRole_ID: number;
    doctorId: number | null;
    specializationId: number | null;
    checkPrice: number,
    genderId: number,
countryId: number,
governorateId: number,
districtId: number
  };
  statusCode: number;
  succeeded: boolean;
  message: string;
  errors: any[];
};
