import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type InspectionStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'cancelled';

export interface Inspection {
  id: string;
  ownerId: string;
  title: string;
  contactId?: string;
  contactName?: string;
  caseId?: string;
  propertyId?: string;
  reference?: string;
  date?: string;
  status: InspectionStatus;
  assignedContactId?: string;
  assignedName?: string;
  fee?: number;
  findings?: string;
  notes?: string;
}

export type InspectionInput = Omit<Inspection, 'id' | 'ownerId'>;

const COLLECTION = 'inspections';

export const INSPECTION_STATUSES: InspectionStatus[] = [
  'pending',
  'in_progress',
  'done',
  'cancelled',
];

export const OPEN_INSPECTION_STATUSES: InspectionStatus[] = [
  'pending',
  'in_progress',
];

function normalizeInspection(raw: Inspection): Inspection {
  return {
    ...raw,
    title: raw.title ?? '',
    status: raw.status ?? 'pending',
  };
}

export function subscribeInspections(
  onChange: (inspections: Inspection[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Inspection>(
    COLLECTION,
    (items) => onChange(items.map(normalizeInspection)),
    onError,
  );
}

export function createInspection(input: InspectionInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateInspection(
  id: string,
  input: InspectionInput,
): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeInspection(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function inspectionSearchText(inspection: Inspection): string {
  return [
    inspection.title,
    inspection.contactName,
    inspection.assignedName,
    inspection.reference,
    inspection.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
