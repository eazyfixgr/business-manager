import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type CaseType = 'realestate' | 'technical' | 'both';
export type CaseStatus =
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'done'
  | 'cancelled';
export type CaseColor = 'none' | 'red' | 'yellow' | 'blue' | 'green';

export interface CasePerson {
  id: string;
  contactId?: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CasePartner {
  id: string;
  contactId?: string;
  name: string;
  role: string;
  fee?: number;
  paid?: boolean;
}

export interface CaseEvent {
  id: string;
  at: string;
  type: string;
  note?: string;
}

export interface Case {
  id: string;
  ownerId: string;
  code: string;
  type: CaseType;
  category: string;
  title?: string;
  date?: string;
  status: CaseStatus;
  color: CaseColor;
  people: CasePerson[];
  partners: CasePartner[];
  agreedAmount?: number;
  notes?: string;
  tags: string[];
  events: CaseEvent[];
  // Property / cadastre details
  region?: string;
  localName?: string;
  contractNumber?: string;
  notary?: string;
  contractArea?: string;
  cadastreArea?: string;
  tolerance?: string;
  propertyStreet?: string;
  propertyKind?: string;
  kaek?: string;
  insideOutside?: string;
  documents?: string[];
}

export type CaseInput = Omit<Case, 'id' | 'ownerId'>;

const COLLECTION = 'cases';

export const CASE_TYPES: CaseType[] = ['realestate', 'technical', 'both'];

export const CASE_STATUSES: CaseStatus[] = [
  'open',
  'in_progress',
  'pending',
  'done',
  'cancelled',
];

export const CASE_COLORS: CaseColor[] = [
  'none',
  'red',
  'yellow',
  'blue',
  'green',
];

export const CASE_PERSON_ROLES = [
  'seller',
  'buyer',
  'owner',
  'client',
  'other',
] as const;

export const CASE_PARTNER_ROLES = [
  'engineer',
  'topographer',
  'lawyer',
  'notary',
  'other',
] as const;

export function newCaseEvent(
  type: string,
  note?: string,
  at?: string,
): CaseEvent {
  return {
    id: crypto.randomUUID(),
    at: at || new Date().toISOString().slice(0, 10),
    type,
    note,
  };
}

function normalizeCase(raw: Case): Case {
  return {
    ...raw,
    code: raw.code ?? '',
    type: raw.type ?? 'technical',
    category: raw.category ?? 'other',
    status: raw.status ?? 'open',
    color: raw.color ?? 'none',
    people: raw.people ?? [],
    partners: raw.partners ?? [],
    tags: raw.tags ?? [],
    events: raw.events ?? [],
  };
}

export function subscribeCases(
  onChange: (cases: Case[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Case>(
    COLLECTION,
    (items) => onChange(items.map(normalizeCase)),
    onError,
  );
}

export function createCase(input: CaseInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateCase(id: string, input: CaseInput): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function patchCase(id: string, input: Partial<CaseInput>): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeCase(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function caseSearchText(item: Case): string {
  return [
    item.code,
    item.title,
    item.category,
    ...item.people.map((p) => p.name),
    ...item.partners.map((p) => p.name),
    ...item.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
