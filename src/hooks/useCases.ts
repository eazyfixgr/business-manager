import { useEffect, useState } from 'react';
import { subscribeCases, type Case } from '../data/cases';

interface UseCasesResult {
  cases: Case[];
  loading: boolean;
  error: string | null;
}

export function useCases(): UseCasesResult {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeCases(
        (items) => {
          setCases(items);
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

  return { cases, loading, error };
}
