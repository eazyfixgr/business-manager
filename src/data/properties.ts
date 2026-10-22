import type { ContactAssignment } from './contacts';
import { OPEN_STAGES, type Lead } from './leads';
import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type PropertyStatus =
  | 'available'
  | 'has_interest'
  | 'reserved'
  | 'sold'
  | 'withdrawn';

export interface Property {
  id: string;
  ownerId: string;
  code: string;
  sellerContactId?: string;
  sellerName?: string;
  title?: string;
  location?: string;
  price?: number;
  status: PropertyStatus;
  notes?: string;
  tags: string[];
  createdAt?: string;
  assignments: ContactAssignment[];
}

export type PropertyInput = Omit<Property, 'id' | 'ownerId'>;

const COLLECTION = 'properties';

export const PROPERTY_STATUSES: PropertyStatus[] = [
  'available',
  'has_interest',
  'reserved',
  'sold',
  'withdrawn',
];

// Statuses that can be chosen manually; the rest are derived from leads.
export const PROPERTY_MANUAL_STATUSES: PropertyStatus[] = [
  'available',
  'sold',
  'withdrawn',
];

function normalizeCreatedAt(raw: Property): string | undefined {
  const value = (raw as unknown as { createdAt?: unknown }).createdAt;
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function normalizeProperty(raw: Property): Property {
  return {
    ...raw,
    code: raw.code ?? '',
    status: raw.status ?? 'available',
    tags: raw.tags ?? [],
    createdAt: normalizeCreatedAt(raw),
    assignments: raw.assignments ?? [],
  };
}

// Availability is derived: reserved if a deposit exists, has_interest if any
// open lead exists, sold if a lead completed; otherwise available.
export function derivePropertyStatus(
  property: Property,
  leads: Lead[],
): PropertyStatus {
  if (property.status === 'sold' || property.status === 'withdrawn') {
    return property.status;
  }
  const propertyLeads = leads.filter((lead) => lead.propertyId === property.id);
  if (propertyLeads.some((lead) => lead.stage === 'won')) return 'sold';
  if (propertyLeads.some((lead) => (lead.depositAmount ?? 0) > 0)) {
    return 'reserved';
  }
  if (propertyLeads.some((lead) => OPEN_STAGES.includes(lead.stage))) {
    return 'has_interest';
  }
  return 'available';
}

export function subscribeProperties(
  onChange: (properties: Property[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Property>(
    COLLECTION,
    (items) => onChange(items.map(normalizeProperty)),
    onError,
  );
}

export function createProperty(input: PropertyInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateProperty(id: string, input: PropertyInput): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeProperty(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function propertyLabel(property: Property): string {
  return `${property.code}${property.sellerName ? ` — ${property.sellerName}` : ''}`;
}

export function propertySearchText(property: Property): string {
  return [
    property.code,
    property.sellerName,
    property.title,
    property.location,
    ...property.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
