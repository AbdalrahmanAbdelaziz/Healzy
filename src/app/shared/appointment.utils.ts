export function normalizeAppointmentData(appointment: any): any {
  if (!appointment) return appointment;
  
  // Create a deep copy to avoid modifying the original object
  const normalized = JSON.parse(JSON.stringify(appointment));
  
  if (normalized.timeSlot) {
    // Correct timeslot doctorId if it's 0 or inconsistent
    if (normalized.timeSlot.doctorId === 0 || 
        (normalized.doctorId && normalized.timeSlot.doctorId !== normalized.doctorId)) {
      normalized.timeSlot.doctorId = normalized.doctorId;
    }
  }
  
  return normalized;
}