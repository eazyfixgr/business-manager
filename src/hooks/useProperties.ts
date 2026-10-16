import { useEffect, useState } from 'react';
import { subscribeProperties, type Property } from '../data/properties';

interface UsePropertiesResult {
  properties: Property[];
  loading: boolean;
  error: string | null;
}

export function useProperties(): UsePropertiesResult {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeProperties(
        (items) => {
          setProperties(items);
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

  return { properties, loading, error };
}
