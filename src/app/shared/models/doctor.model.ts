
export interface Doctor {
    brief: string;
    checkPrice: number;
    clinicId: number;
    specializationId: number;
    avgFeedbackRating: number;
    token: string | null;
    id: number;
    username: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    profilePicture: string;
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
    accountStatus_ar: string;
    applicationRole_En: string;
    applicationRole_Ar: string;
    applicationRole_ID: number;
    specialization_En?: string;  // Add these
    specialization_Ar?: string;
    
  }
  