import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'noshow';

export interface Appointment {
  id: string;
  ownerId: string;
  title: string;
  contactId?: string;
  contactName?: string;
  caseId?: string;
  propertyId?: string;
  date: string;
  start?: string;
  end?: string;
  location?: string;
  status: AppointmentStatus;
  notes?: string;
}

export type AppointmentInput = Omit<Appointment, 'id' | 'ownerId'>;

const COLLECTION = 'appointments';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
  'noshow',
];

function normalizeAppointment(raw: Appointment): Appointment {
  return {
    ...raw,
    title: raw.title ?? '',
    status: raw.status ?? 'scheduled',
  };
}

export function subscribeAppointments(
  onChange: (appointments: Appointment[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Appointment>(
    COLLECTION,
    (items) => onChange(items.map(normalizeAppointment)),
    onError,
  );
}

export function createAppointment(input: AppointmentInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateAppointment(
  id: string,
  input: AppointmentInput,
): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeAppointment(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function appointmentDateTime(appointment: Appointment): string {
  return `${appointment.date}T${appointment.start ?? '00:00'}`;
}

export function appointmentSearchText(appointment: Appointment): string {
  return [
    appointment.title,
    appointment.contactName,
    appointment.location,
    appointment.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
