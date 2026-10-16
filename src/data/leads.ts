import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type LeadStage =
  | 'interested'
  | 'docs_sent'
  | 'mandate_signed'
  | 'price_issue'
  | 'not_interested'
  | 'won';

export interface LeadEvent {
  id: string;
  at: string;
  stage: LeadStage;
  note?: string;
}

export interface Lead {
  id: string;
  ownerId: string;
  propertyId: string;
  contactId?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  offerAmount?: number;
  stage: LeadStage;
  docsSentDate?: string;
  mandateDate?: string;
  notes?: string;
  history: LeadEvent[];
}

export type LeadInput = Omit<Lead, 'id' | 'ownerId'>;

const COLLECTION = 'leads';

export const LEAD_STAGES: LeadStage[] = [
  'interested',
  'docs_sent',
  'mandate_signed',
  'price_issue',
  'not_interested',
  'won',
];

export const OPEN_STAGES: LeadStage[] = [
  'interested',
  'docs_sent',
  'mandate_signed',
  'price_issue',
];

function normalizeLead(raw: Lead): Lead {
  return {
    ...raw,
    stage: raw.stage ?? 'interested',
    history: raw.history ?? [],
  };
}

export function newLeadEvent(stage: LeadStage, note?: string): LeadEvent {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString().slice(0, 10),
    stage,
    note,
  };
}

export function subscribeLeads(
  onChange: (leads: Lead[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Lead>(
    COLLECTION,
    (items) => onChange(items.map(normalizeLead)),
    onError,
  );
}

export function createLead(input: LeadInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateLead(id: string, input: LeadInput): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function patchLead(id: string, input: Partial<LeadInput>): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeLead(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function leadLabel(lead: Lead): string {
  return lead.contactName || lead.phone || lead.email || '—';
}

export function leadSearchText(lead: Lead): string {
  return [lead.contactName, lead.phone, lead.email, lead.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
