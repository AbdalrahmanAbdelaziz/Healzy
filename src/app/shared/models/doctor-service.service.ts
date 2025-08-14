export interface Service {
    id: number;
    serviceName: string;
    serviceDescription: string;
    avgDurationInMinutes: number;
    specializationId: number;
    specializationName?: string;  // Add this
    servicePrice: number | null;
  }