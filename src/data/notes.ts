import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  content?: string;
  category: string;
  tags: string[];
  pinned: boolean;
}

export type NoteInput = Omit<Note, 'id' | 'ownerId'>;

const COLLECTION = 'notes';

export const NOTE_CATEGORIES = [
  'general',
  'procedure',
  'legislation',
  'pricelist',
  'template',
  'other',
] as const;

export type PresetNoteCategory = (typeof NOTE_CATEGORIES)[number];

export function isPresetNoteCategory(value: string): value is PresetNoteCategory {
  return (NOTE_CATEGORIES as readonly string[]).includes(value);
}

function normalizeNote(raw: Note): Note {
  return {
    ...raw,
    title: raw.title ?? '',
    category: raw.category ?? 'general',
    tags: raw.tags ?? [],
    pinned: raw.pinned ?? false,
  };
}

export function subscribeNotes(
  onChange: (notes: Note[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Note>(
    COLLECTION,
    (items) => onChange(items.map(normalizeNote)),
    onError,
  );
}

export function createNote(input: NoteInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateNote(id: string, input: NoteInput): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function setNotePinned(id: string, pinned: boolean): Promise<void> {
  return updateOwned(COLLECTION, id, { pinned });
}

export function removeNote(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function noteSearchText(note: Note): string {
  return [note.title, note.content, note.category, ...note.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
