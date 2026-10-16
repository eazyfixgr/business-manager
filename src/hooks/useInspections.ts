import { useEffect, useState } from 'react';
import {
  subscribeInspections,
  type Inspection,
} from '../data/inspections';

interface UseInspectionsResult {
  inspections: Inspection[];
  loading: boolean;
  error: string | null;
}

export function useInspections(): UseInspectionsResult {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeInspections(
        (items) => {
          setInspections(items);
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

  return { inspections, loading, error };
}
