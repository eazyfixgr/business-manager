import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type PropertyStatus =
  | 'available'
  | 'negotiation'
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
}

export type PropertyInput = Omit<Property, 'id' | 'ownerId'>;

const COLLECTION = 'properties';

export const PROPERTY_STATUSES: PropertyStatus[] = [
  'available',
  'negotiation',
  'reserved',
  'sold',
  'withdrawn',
];

function normalizeProperty(raw: Property): Property {
  return {
    ...raw,
    code: raw.code ?? '',
    status: raw.status ?? 'available',
    tags: raw.tags ?? [],
  };
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
