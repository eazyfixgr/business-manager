import { useEffect, useState } from 'react';
import {
  subscribeAppointments,
  type Appointment,
} from '../data/appointments';

interface UseAppointmentsResult {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
}

export function useAppointments(): UseAppointmentsResult {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeAppointments(
        (items) => {
          setAppointments(items);
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      ),
    [],
  );

  return { appointments, loading, error };
}
