import { useEffect, useState } from 'react';
import { subscribeNotes, type Note } from '../data/notes';

interface UseNotesResult {
  notes: Note[];
  loading: boolean;
  error: string | null;
}

export function useNotes(): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeNotes(
        (items) => {
          setNotes(items);
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

  return { notes, loading, error };
}
