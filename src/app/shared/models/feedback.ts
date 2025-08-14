// api-response.interface.ts
export interface APIResponse<T> {
    data: T;
    statusCode: number;
    succeeded: boolean;
    message: string;
    errors: any[];
  }
  
  // patient.interface.ts
  export interface Patient {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  }
  
  // feedback.interface.ts
  export interface Feedback {
    id: number;
    rating: number;
    comment: string;
    appointmentId: number;
    doctorId: number;
    patientId: number;
    createdAt?: string;
    patient?: Patient;
  }