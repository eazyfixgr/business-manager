import { useEffect, useState } from 'react';
import { subscribeLeads, type Lead } from '../data/leads';

interface UseLeadsResult {
  leads: Lead[];
  loading: boolean;
  error: string | null;
}

export function useLeads(): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeLeads(
        (items) => {
          setLeads(items);
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

  return { leads, loading, error };
}
