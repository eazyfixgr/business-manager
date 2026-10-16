import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type ContactRole =
  | 'client'
  | 'seller'
  | 'buyer'
  | 'partner'
  | 'supplier'
  | 'lead';

export interface ContactAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

// A labelled value is used for things like multiple phone numbers where each
// entry can carry a user-defined label ("Mobile", "Home", "Brother"…).
export interface LabeledValue {
  id: string;
  label: string;
  value: string;
}

export type ContactCodeType = 'realestate' | 'technical';

// Real-estate client codes and technical-office protocol numbers (Α/Π).
// A client can have several of each (e.g. more than one case).
export interface ContactCode {
  id: string;
  type: ContactCodeType;
  value: string;
  label?: string;
}

// Other communication contacts (brother, spouse, parent…) with a custom label.
export interface ExtraContact {
  id: string;
  label: string;
  name?: string;
  phone?: string;
  email?: string;
}

export type AssignmentType =
  | 'notary'
  | 'lawyer'
  | 'topographer'
  | 'engineer'
  | 'other';

// A professional assigned to the client. Can be linked to an existing partner
// (contactId) or entered free-form (name/phone).
export interface ContactAssignment {
  id: string;
  type: AssignmentType;
  label?: string;
  contactId?: string;
  name?: string;
  phone?: string;
}

export interface Contact {
  id: string;
  ownerId: string;
  roles: ContactRole[];
  name: string;
  phones: LabeledValue[];
  email?: string;
  address?: ContactAddress;
  notes?: string;
  specialty?: string;
  codes: ContactCode[];
  extraContacts: ExtraContact[];
  assignments: ContactAssignment[];
  tags: string[];
  pinned: boolean;
}

export type ContactInput = Omit<Contact, 'id' | 'ownerId'>;

const COLLECTION = 'contacts';

export const CONTACT_ROLES: ContactRole[] = [
  'client',
  'seller',
  'buyer',
  'partner',
  'supplier',
  'lead',
];

export const CONTACT_CODE_TYPES: ContactCodeType[] = ['realestate', 'technical'];

export const ASSIGNMENT_TYPES: AssignmentType[] = [
  'notary',
  'lawyer',
  'topographer',
  'engineer',
  'other',
];

export function newId(): string {
  return crypto.randomUUID();
}

// Guard against documents written by older versions (missing list fields).
function normalizeContact(raw: Contact): Contact {
  return {
    ...raw,
    name: raw.name ?? '',
    roles: raw.roles ?? [],
    phones: raw.phones ?? [],
    codes: raw.codes ?? [],
    extraContacts: raw.extraContacts ?? [],
    assignments: raw.assignments ?? [],
    tags: raw.tags ?? [],
    pinned: raw.pinned ?? false,
  };
}

export function subscribeContacts(
  onChange: (contacts: Contact[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Contact>(
    COLLECTION,
    (items) => onChange(items.map(normalizeContact)),
    onError,
  );
}

export function createContact(input: ContactInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateContact(id: string, input: ContactInput): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeContact(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function setContactPinned(id: string, pinned: boolean): Promise<void> {
  return updateOwned(COLLECTION, id, { pinned });
}

export function contactInitial(contact: Contact): string {
  return contact.name.trim().charAt(0).toUpperCase() || '?';
}

export function contactSearchText(contact: Contact): string {
  const phones = contact.phones.flatMap((p) => [p.label, p.value]);
  const codes = contact.codes.flatMap((c) => [c.value, c.label]);
  const extras = contact.extraContacts.flatMap((e) => [
    e.label,
    e.name,
    e.phone,
    e.email,
  ]);
  const assignments = contact.assignments.flatMap((a) => [a.label, a.name, a.phone]);
  return [
    contact.name,
    contact.email,
    contact.specialty,
    ...phones,
    ...codes,
    ...extras,
    ...assignments,
    ...contact.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
