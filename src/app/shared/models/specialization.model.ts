export interface Specialization {
    id: number;
    name_Ar: string;
    name_En: string;
  }
  
  export interface SpecializationResponse {
    data: Specialization[];
    statusCode: number;
    succeeded: boolean;
    message: string;
    errors: string[];
  }