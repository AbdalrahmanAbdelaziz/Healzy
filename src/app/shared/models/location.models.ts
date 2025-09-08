export interface Country {
  id: number;
  name_Ar: string;
  name_En: string;
}

export interface Governorate {
  id: number;
  name_Ar: string;
  name_En: string;
  countryID: number;
}

export interface District {
  id: number;
  name_Ar: string;
  name_En: string;
  governorateID: number;
}

export interface ApiResponse<T> {
  data: T[];
  statusCode: number;
  succeeded: boolean;
  message: string;
  errors: string[];
}

export interface CountryRequest {
  name_Ar: string;
  name_En: string;
}

export interface GovernorateRequest {
  name_Ar: string;
  name_En: string;
  countryID: number;
}

export interface DistrictRequest {
  name_Ar: string;
  name_En: string;
  governorateID: number;
}