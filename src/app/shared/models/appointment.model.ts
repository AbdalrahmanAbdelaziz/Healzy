export interface TimeSlot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  doctorId: number;
  timeSlotStatusId: number;
}

export interface Appointment {
  id?: number; 
  notes: string;
  timeSlotId: number;
  timeSlot?: TimeSlot; 
  appointmentStatusId?: number; 
  appointmentStatus_Ar?: string;
  appointmentStatus_En?: string;
  clinicId: number;
  doctorId: number;
  doctorName?: string; 
  doctorSpecialization_En?: string | null;
  doctorSpecialization_Ar?: string | null;
  patientID: number;
  patientName?: string; 
  appointmentServicesPivots?: any[]; 
  medicalRecordEntryId?: number;
  medicalRecordEntry?: any;
  feedbacks?: any[];
  paidCash?: number;
  paidInstapay?: number;
  paidWallet?: number;
  paidVisa?: number;
  remainingToPay?: number;
  totalPrice?: number;
  bookingWayId?: number; // Add this line
}